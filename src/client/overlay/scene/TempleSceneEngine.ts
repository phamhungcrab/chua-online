import * as PIXI from 'pixi.js';
import type {
  CharacterPoseState,
  CharacterSkinId,
  ClientPerfReport,
  DispatchedRitual,
  FloatingLanternItem,
  OfferingKind,
  QualityPreset,
  SeatedViewer,
  TempleSettings,
  TimeOfDayAmbience
} from '../../../shared/types.ts';
import {
  buildProceduralAtlas,
  type BakedAtlas,
  type CharacterPoseKey
} from './ProceduralAtlas.ts';

interface SeatCoord {
  index: number;
  x: number;
  y: number;
  scale: number;
  row: number;
  col: number;
  maxTagWidth: number;
  isVip: boolean;
}

interface ActorInstance {
  id: string;
  nickname: string;
  skin: CharacterSkinId;
  state: CharacterPoseState;
  poseKey: CharacterPoseKey;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  alpha: number;
  seatIndex: number;
  isVip: boolean;
  vipRank: number;
  meritPoints: number;
  stateTimer: number;
  walkFrameTimer: number;
  breathPhase: number;
  glowIntensity: number;
  speechText: string;
  speechUntilMs: number;
}

interface SmokeParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r0: number;
  rMax: number;
  alpha: number;
  age: number;
  maxAge: number;
  seed: number;
}

interface PetalParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  scale: number;
  swayPhase: number;
  gold: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  alpha: number;
}

interface SoundWaveRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
  color: string;
}

interface FloatingBannerEffect {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  subtext: string;
  alpha: number;
  age: number;
  maxAge: number;
  kind: OfferingKind | 'merit';
}

interface CentralCeremonyActor {
  active: boolean;
  nickname: string;
  actionLabel: string;
  wishText: string;
  skin: CharacterSkinId;
  x: number;
  y: number;
  poseKey: CharacterPoseKey;
  elapsedSec: number;
  durationSec: number;
}

const VIP_SEAT_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 145, y: 1148 },
  { x: 265, y: 1148 },
  { x: 385, y: 1148 },
  { x: 695, y: 1148 },
  { x: 815, y: 1148 },
  { x: 935, y: 1148 }
];

const TEACHERS: ReadonlyArray<{
  name: string;
  skin: CharacterSkinId;
  x: number;
  y: number;
  scale: number;
  isMaster: boolean;
}> = [
  { name: 'Thầy Minh Đạo', skin: 'monk', x: 310, y: 1052, scale: 0.62, isMaster: false },
  { name: 'Sư Trụ Trì', skin: 'monk', x: 540, y: 1066, scale: 0.68, isMaster: true },
  { name: 'Thầy Tâm Từ', skin: 'monk', x: 770, y: 1052, scale: 0.62, isMaster: false }
];

export class TempleSceneEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlas: BakedAtlas;
  private readonly backdropCache: Map<TimeOfDayAmbience, HTMLCanvasElement> = new Map();
  private pixiVerifyBadge = `PixiJS v${PIXI.VERSION} + 2.5D Layered Stage`;

  private transparentBg = false;
  private quality: QualityPreset = 'high';
  private targetFps: 30 | 60 = 60;
  private timeOfDay: TimeOfDayAmbience = 'SACRED_NIGHT';
  private weather: TempleSettings['weather'] = 'CLEAR';
  private smokeDensity = 1.0;
  private petalDensity = 1.0;
  private lightingWarmth = 1.0;
  private activeIncenseSticks = 9;

  private seatCapacity = 24;
  private seats: SeatCoord[] = [];
  private readonly actors: Map<string, ActorInstance> = new Map();
  private lanterns: FloatingLanternItem[] = [];

  private readonly centralActor: CentralCeremonyActor = {
    active: false,
    nickname: '',
    actionLabel: '',
    wishText: '',
    skin: 'lam_female',
    x: 540,
    y: 1680,
    poseKey: 'walk1',
    elapsedSec: 0,
    durationSec: 6.2
  };

  // Pooled particle arrays (zero allocations per frame)
  private readonly smokePool: SmokeParticle[] = [];
  private readonly petalPool: PetalParticle[] = [];
  private readonly sparks: SparkParticle[] = [];
  private readonly wavePool: SoundWaveRing[] = [];
  private readonly floatingEffects: FloatingBannerEffect[] = [];

  private haloBoost = 0;
  private bellSwing = 0;
  private moPulse = 0;
  private clockSec = 0;
  private lastRafMs = performance.now();
  private lastRenderMs = performance.now();

  // Telemetry counters
  private fpsFrameCount = 0;
  private fpsWindowStartMs = performance.now();
  private measuredFps = 60;
  private avgFrameTimeMs = 1.8;
  private droppedFrames = 0;

  constructor(canvas: HTMLCanvasElement, options?: { transparent?: boolean }) {
    this.canvas = canvas;
    this.canvas.width = 1080;
    this.canvas.height = 1920;
    this.transparentBg = Boolean(options?.transparent);

    const ctx = this.canvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    });
    if (!ctx) {
      throw new Error('Không khởi tạo được Canvas 2D context cho TempleSceneEngine');
    }
    this.ctx = ctx;
    this.atlas = buildProceduralAtlas();

    // Context loss & restore resilience listeners
    this.canvas.addEventListener('contextlost', (e) => {
      e.preventDefault();
    });
    this.canvas.addEventListener('contextrestored', () => {
      this.backdropCache.clear();
    });

    this.initPools();
    this.rebuildSeatLayout(24);
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private initPools(): void {
    for (let i = 0; i < 64; i++) {
      this.smokePool.push({
        active: false,
        x: 540,
        y: 840,
        vx: 0,
        vy: -1.8,
        r0: 8,
        rMax: 34,
        alpha: 0.25,
        age: 0,
        maxAge: 80,
        seed: i * 1.7
      });
    }

    for (let i = 0; i < 64; i++) {
      this.petalPool.push({
        active: i < 24,
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        vx: (Math.random() - 0.5) * 28,
        vy: 38 + Math.random() * 44,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 1.6,
        scale: 0.65 + Math.random() * 0.55,
        swayPhase: Math.random() * Math.PI * 2,
        gold: i % 3 === 0
      });
    }

    for (let i = 0; i < 42; i++) {
      this.sparks.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        vx: (Math.random() - 0.5) * 18,
        vy: -(24 + Math.random() * 36),
        size: 10 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.55
      });
    }

    for (let i = 0; i < 12; i++) {
      this.wavePool.push({
        active: false,
        x: 540,
        y: 520,
        radius: 30,
        maxRadius: 440,
        alpha: 0,
        lineWidth: 3,
        color: '#FFD97D'
      });
    }

    for (let i = 0; i < 16; i++) {
      this.floatingEffects.push({
        active: false,
        x: 540,
        y: 900,
        vy: -75,
        text: '',
        subtext: '',
        alpha: 0,
        age: 0,
        maxAge: 2.6,
        kind: 'merit'
      });
    }
  }

  public rebuildSeatLayout(cap: number): void {
    this.seatCapacity = cap;
    this.seats = [];

    // 1. First 6 seats are the VIP cushions right in front of the altar platform
    for (let i = 0; i < VIP_SEAT_COORDS.length; i++) {
      const vc = VIP_SEAT_COORDS[i];
      this.seats.push({
        index: i,
        x: vc.x,
        y: vc.y,
        scale: 0.62,
        row: -1,
        col: i,
        maxTagWidth: 112,
        isVip: true
      });
    }

    // 2. Remaining seats form a perspective trapezoid on the two sides of the central red carpet
    const gridPresets: Record<number, [number, number]> = {
      24: [6, 4],
      36: [6, 6],
      64: [8, 8],
      100: [10, 10]
    };
    const [cols, rows] = gridPresets[cap] || gridPresets[24];
    const yTop = 1248;
    const yBot = 1705;
    const halfTop = 365;
    const halfBot = 475;

    const hallSeats: SeatCoord[] = [];
    for (let r = 0; r < rows; r++) {
      const t = rows === 1 ? 0.5 : r / (rows - 1);
      const y = Math.round(yTop + (yBot - yTop) * t);
      const half = halfTop + (halfBot - halfTop) * t;
      const scale = (0.44 + 0.24 * t) * Math.pow(6 / cols, 0.55);
      const maxTagWidth = Math.round(((2 * half) / cols) * 0.92);

      for (let c = 0; c < cols; c++) {
        let u = (c - (cols - 1) / 2) / ((cols - 1) / 2);
        // Leave central red carpet aisle open (x = 430..650)
        u = Math.sign(u || 1) * (0.24 + 0.76 * Math.abs(u));
        hallSeats.push({
          index: 0,
          x: Math.round(540 + u * half),
          y,
          scale,
          row: r,
          col: c,
          maxTagWidth,
          isVip: false
        });
      }
    }

    // Sort hall seats so front rows & aisle-adjacent seats fill first
    hallSeats.sort((a, b) => b.row - a.row || Math.abs(a.x - 540) - Math.abs(b.x - 540));
    hallSeats.forEach((s, idx) => {
      s.index = 6 + idx;
      this.seats.push(s);
    });
  }

  public syncFromSnapshot(
    viewers: SeatedViewer[],
    lanterns: FloatingLanternItem[],
    settings: TempleSettings,
    incenseBurned: number
  ): void {
    this.quality = settings.qualityPreset;
    this.targetFps = settings.targetFps;
    this.timeOfDay = settings.timeOfDay;
    this.weather = settings.weather;
    this.smokeDensity = settings.smokeDensity;
    this.petalDensity = settings.petalDensity;
    this.lightingWarmth = settings.lightingWarmth;
    this.activeIncenseSticks = Math.max(3, Math.min(21, 5 + (incenseBurned % 17)));
    this.lanterns = lanterns.slice(0, this.quality === 'low' ? 6 : this.quality === 'medium' ? 14 : 24);

    const targetCap =
      settings.seatCapacityMode === 'auto'
        ? viewers.length <= 24
          ? 24
          : viewers.length <= 36
            ? 36
            : viewers.length <= 64
              ? 64
              : 100
        : Number(settings.seatCapacityMode) || 24;

    if (targetCap !== this.seatCapacity) {
      this.rebuildSeatLayout(targetCap);
    }

    const incomingIds = new Set(viewers.map((v) => v.id));
    for (const [id, actor] of this.actors) {
      if (!incomingIds.has(id) && actor.state !== 'LEAVE') {
        actor.state = 'LEAVE';
        actor.stateTimer = 0;
      }
    }

    const hadActorsBefore = this.actors.size > 0;
    viewers.forEach((v, idx) => {
      const seat = this.seats[idx] || this.seats[this.seats.length - 1];
      const existing = this.actors.get(v.id);
      if (existing) {
        existing.nickname = v.nickname;
        existing.skin = v.skin;
        existing.seatIndex = idx;
        existing.isVip = v.isVip;
        existing.vipRank = v.vipRank;
        existing.meritPoints = v.meritPoints;
        if (seat) {
          existing.targetX = seat.x;
          existing.targetY = seat.y;
          existing.scale = seat.scale;
        }
      } else {
        const instantSeat = !hadActorsBefore || v.isDemo;
        const startX = instantSeat ? seat.x : 540 + (Math.random() - 0.5) * 40;
        const startY = instantSeat ? seat.y : 1890;
        this.actors.set(v.id, {
          id: v.id,
          nickname: v.nickname,
          skin: v.skin,
          state: instantSeat ? 'SIT_MEDITATE' : 'APPEAR',
          poseKey: instantSeat ? 'sitMeditate' : 'walk1',
          x: startX,
          y: startY,
          targetX: seat.x,
          targetY: seat.y,
          scale: seat.scale,
          alpha: instantSeat ? 1 : 0,
          seatIndex: idx,
          isVip: v.isVip,
          vipRank: v.vipRank,
          meritPoints: v.meritPoints,
          stateTimer: 0,
          walkFrameTimer: 0,
          breathPhase: Math.random() * Math.PI * 2,
          glowIntensity: instantSeat ? 0 : 0.85,
          speechText: v.lastWish || '',
          speechUntilMs: 0
        });
      }
    });
  }

  public triggerRitualVisuals(ritual: DispatchedRitual): void {
    const nowMs = performance.now();
    const actor = this.actors.get(ritual.user.id);

    if (actor) {
      actor.glowIntensity = 1.0;
      if (ritual.skin) actor.skin = ritual.skin;
      if (ritual.wishText) {
        actor.speechText = ritual.wishText;
        actor.speechUntilMs = nowMs + 6500;
      }
      if (
        ritual.actionType === 'BURN_INCENSE' ||
        ritual.actionType === 'OFFER_GIFT' ||
        ritual.actionType === 'GRAND_CEREMONY'
      ) {
        actor.state = 'PROSTRATE_BOW';
        actor.stateTimer = 0;
      } else if (ritual.actionType === 'RELEASE_LANTERN' || ritual.actionType === 'DRAW_FORTUNE') {
        actor.state = 'PRAY_HANDS';
        actor.stateTimer = 0;
      }
    }

    // Trigger central carpet ceremonial walker for active interactive rituals
    if (
      ritual.actionType === 'BURN_INCENSE' ||
      ritual.actionType === 'OFFER_GIFT' ||
      ritual.actionType === 'GRAND_CEREMONY' ||
      ritual.actionType === 'RELEASE_LANTERN' ||
      ritual.actionType === 'DRAW_FORTUNE'
    ) {
      this.centralActor.active = true;
      this.centralActor.nickname = ritual.user.nickname;
      this.centralActor.actionLabel = ritual.ruleName;
      this.centralActor.wishText = ritual.wishText || 'Nam Mô A Di Đà Phật';
      this.centralActor.skin = ritual.skin || actor?.skin || 'lam_female';
      this.centralActor.elapsedSec = 0;
      this.centralActor.durationSec = ritual.actionType === 'GRAND_CEREMONY' ? 7.5 : 5.6;
    }

    if (ritual.actionType === 'RING_BELL' || ritual.actionType === 'PERIODIC_CHANT') {
      this.bellSwing = 1.0;
      this.haloBoost = Math.min(1.2, this.haloBoost + 0.65);
      this.spawnWaveRing(870, 825, '#FFD97D');
      this.spawnWaveRing(540, 440, '#FFEAA0');
    } else if (ritual.actionType === 'GRAND_CEREMONY') {
      this.bellSwing = 1.2;
      this.haloBoost = 1.35;
      this.spawnWaveRing(540, 440, '#FFF1A8');
      this.spawnWaveRing(540, 875, '#FFB8D2');
      this.spawnFloatingBanner(
        540,
        820,
        `+${ritual.meritAwarded} Tinh Tấn`,
        ritual.giftName || 'Đại Lễ Hào Quang',
        'dragon'
      );
      this.burstPetals(28);
    } else if (ritual.actionType === 'OFFER_GIFT') {
      this.haloBoost = Math.min(1.1, this.haloBoost + 0.5);
      this.spawnWaveRing(540, 875, '#FFD97D');
      this.spawnFloatingBanner(
        540,
        850,
        `+${ritual.meritAwarded} Tinh Tấn`,
        ritual.giftName || 'Dâng Lễ Vật',
        ritual.offeringKind || 'lotus'
      );
      this.burstPetals(12);
    } else if (ritual.meritAwarded > 0) {
      this.haloBoost = Math.min(1.0, this.haloBoost + 0.25);
      this.spawnFloatingBanner(
        540,
        885,
        `+${ritual.meritAwarded} Tinh Tấn`,
        ritual.ruleName,
        'merit'
      );
    }
  }

  public triggerLikeBatchVisuals(count: number): void {
    this.moPulse = Math.min(1.0, this.moPulse + 0.65);
    this.spawnWaveRing(210, 855, '#FFCC80');
    const spawnCount = Math.min(6, Math.max(1, Math.ceil(count / 2)));
    this.burstPetals(spawnCount);
  }

  private spawnWaveRing(x: number, y: number, color: string): void {
    const slot = this.wavePool.find((w) => !w.active) || this.wavePool[0];
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.radius = 24;
    slot.maxRadius = 380;
    slot.alpha = 0.78;
    slot.lineWidth = 3.2;
    slot.color = color;
  }

  private spawnFloatingBanner(
    x: number,
    y: number,
    text: string,
    subtext: string,
    kind: FloatingBannerEffect['kind']
  ): void {
    // Push existing active banners upward so rapid bursts never overlap at the same Y
    for (const f of this.floatingEffects) {
      if (f.active) {
        f.y -= 52;
        f.age += 0.45;
        if (f.age >= f.maxAge) {
          f.active = false;
        }
      }
    }
    const slot = this.floatingEffects.find((f) => !f.active) || this.floatingEffects[0];
    slot.active = true;
    slot.x = x + (Math.random() - 0.5) * 24;
    slot.y = y;
    slot.vy = -68;
    slot.text = text;
    slot.subtext = subtext;
    slot.alpha = 1;
    slot.age = 0;
    slot.maxAge = 2.2;
    slot.kind = kind;
  }

  private burstPetals(count: number): void {
    const maxAllowed = this.quality === 'low' ? 14 : this.quality === 'medium' ? 36 : 64;
    let spawned = 0;
    for (let i = 0; i < maxAllowed && spawned < count; i++) {
      const p = this.petalPool[i];
      if (!p.active) {
        p.active = true;
        p.x = 240 + Math.random() * 600;
        p.y = 180 + Math.random() * 240;
        p.vx = (Math.random() - 0.5) * 48;
        p.vy = 55 + Math.random() * 65;
        p.gold = spawned % 2 === 0;
        spawned++;
      }
    }
  }

  private getOrBakeSanctuaryBackdrop(mode: TimeOfDayAmbience): HTMLCanvasElement {
    const cached = this.backdropCache.get(mode);
    if (cached) return cached;

    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext('2d')!;

    // 1. Deep Sanctuary Wall Gradient by TimeOfDay
    const palettes: Record<TimeOfDayAmbience, [string, string, string]> = {
      SACRED_NIGHT: ['#0E0503', '#240B05', '#120604'],
      GOLDEN_DUSK: ['#260D06', '#4A190B', '#1B0805'],
      DAY_SERENE: ['#2B140C', '#522211', '#210C06'],
      FESTIVAL_GLOW: ['#2D0A06', '#5C180D', '#1E0704']
    };
    const [topCol, midCol, botCol] = palettes[mode] || palettes.SACRED_NIGHT;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, topCol);
    bgGrad.addColorStop(0.52, midCol);
    bgGrad.addColorStop(1, botCol);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Warm sanctuary radial ambient glow behind the altar
    const sanctuaryGlow = ctx.createRadialGradient(540, 520, 40, 540, 580, 620);
    sanctuaryGlow.addColorStop(0, 'rgba(255, 196, 85, 0.35)');
    sanctuaryGlow.addColorStop(0.55, 'rgba(180, 68, 20, 0.16)');
    sanctuaryGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sanctuaryGlow;
    ctx.fillRect(0, 0, 1080, 1200);

    // 2. Perspective Wooden Hall Floor & Central Red-Gold Brocade Carpet (y = 1020..1920)
    const floorGrad = ctx.createLinearGradient(0, 1020, 0, 1920);
    floorGrad.addColorStop(0, '#2B1008');
    floorGrad.addColorStop(0.65, '#1D0A05');
    floorGrad.addColorStop(1, '#0D0402');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 1020, 1080, 900);

    // Wooden floor perspective planks
    ctx.strokeStyle = 'rgba(229, 184, 91, 0.08)';
    ctx.lineWidth = 1.5;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(540 + i * 65, 1040);
      ctx.lineTo(540 + i * 145, 1820);
      ctx.stroke();
    }

    // Raised Sanctuary Wooden Platform (Bục Tam Bảo y = 1015..1195)
    const stepGrad = ctx.createLinearGradient(0, 1015, 0, 1195);
    stepGrad.addColorStop(0, '#4A180C');
    stepGrad.addColorStop(1, '#2D0D06');
    ctx.fillStyle = stepGrad;
    ctx.fillRect(40, 1015, 1000, 178);
    ctx.strokeStyle = '#D9A441';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(40, 1015, 1000, 178);

    // Central Royal Crimson-Gold Carpet (Thảm Đỏ Dẫn Lễ Chính Điện)
    const carpetGrad = ctx.createLinearGradient(540, 1020, 540, 1820);
    carpetGrad.addColorStop(0, '#7A160E');
    carpetGrad.addColorStop(0.5, '#991D14');
    carpetGrad.addColorStop(1, '#590E08');
    ctx.fillStyle = carpetGrad;
    ctx.beginPath();
    ctx.moveTo(455, 1020);
    ctx.lineTo(625, 1020);
    ctx.lineTo(685, 1780);
    ctx.lineTo(395, 1780);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#E5B85B';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Inner lotus carpet ornament lines
    ctx.strokeStyle = 'rgba(255, 222, 130, 0.38)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(470, 1025);
    ctx.lineTo(415, 1775);
    ctx.moveTo(610, 1025);
    ctx.lineTo(665, 1775);
    ctx.stroke();

    // 3. Ironwood Pillars (Đôi Cột Gỗ Lim Đại Tự Câu Đối Vàng)
    for (const [px, couplet] of [
      [62, 'PHẬT NHẬT TĂNG HUY'],
      [1018, 'PHÁP LUÂN THƯỜNG CHUYỂN']
    ] as const) {
      const pGrad = ctx.createLinearGradient(px - 36, 0, px + 36, 0);
      pGrad.addColorStop(0, '#240904');
      pGrad.addColorStop(0.45, '#591B0E');
      pGrad.addColorStop(1, '#1E0703');
      ctx.fillStyle = pGrad;
      ctx.fillRect(px - 36, 160, 72, 920);
      ctx.strokeStyle = '#C89638';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 36, 160, 72, 920);

      // Vertical lacquer couplet plaque (Câu đối sơn son thếp vàng)
      ctx.fillStyle = 'rgba(54, 14, 7, 0.92)';
      ctx.beginPath();
      ctx.roundRect(px - 22, 310, 44, 520, 10);
      ctx.fill();
      ctx.strokeStyle = '#F0C35E';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFE28A';
      ctx.font = '700 20px "Noto Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const words = couplet.split(' ');
      words.forEach((w, idx) => {
        ctx.fillText(w, px, 385 + idx * 112);
      });
    }

    // 4. Carved Gilded Wooden Arch & Silk Valance (Cửa Võng Chạm Hoa Sen & Rèm Gấm)
    const archGrad = ctx.createLinearGradient(0, 165, 0, 290);
    archGrad.addColorStop(0, '#4F140A');
    archGrad.addColorStop(1, '#852214');
    ctx.fillStyle = archGrad;
    ctx.fillRect(98, 175, 884, 76);
    ctx.strokeStyle = '#F2C55C';
    ctx.lineWidth = 3;
    ctx.strokeRect(98, 175, 884, 76);

    // Hanging silk scallops
    for (let i = 0; i < 9; i++) {
      const sx = 148 + i * 98;
      ctx.fillStyle = i % 2 === 0 ? '#8E1E12' : '#6E150B';
      ctx.beginPath();
      ctx.arc(sx, 251, 49, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#E5B85B';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Hoi An Silk Lanterns hanging on left and right
    for (const lx of [215, 865]) {
      ctx.strokeStyle = '#D9A441';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx, 250);
      ctx.lineTo(lx, 330);
      ctx.stroke();

      const lGlow = ctx.createRadialGradient(lx, 368, 6, lx, 368, 86);
      lGlow.addColorStop(0, 'rgba(255, 232, 148, 0.85)');
      lGlow.addColorStop(0.5, 'rgba(255, 152, 48, 0.35)');
      lGlow.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = lGlow;
      ctx.beginPath();
      ctx.arc(lx, 368, 86, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#C92A18';
      ctx.beginPath();
      ctx.ellipse(lx, 368, 36, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFD97D';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 6. Main Carved Altar Table (Bàn Thờ Tam Bảo Sơn Son Thếp Vàng y = 785..1020)
    const altarGrad = ctx.createLinearGradient(160, 790, 920, 1020);
    altarGrad.addColorStop(0, '#6B1C0E');
    altarGrad.addColorStop(0.5, '#8A2614');
    altarGrad.addColorStop(1, '#3E0E06');
    ctx.fillStyle = altarGrad;
    ctx.beginPath();
    ctx.roundRect(150, 795, 780, 222, 12);
    ctx.fill();
    ctx.strokeStyle = '#F0C259';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Inner carved golden panel on altar front
    ctx.strokeStyle = 'rgba(255, 220, 125, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(182, 822, 716, 168);

    // Golden lotus vases & fruit trays on the altar
    for (const vx of [285, 795]) {
      // Porcelain & Gold Vase
      ctx.fillStyle = '#E5B85B';
      ctx.beginPath();
      ctx.ellipse(vx, 762, 26, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFF0B5';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Lotus flowers in vase
      for (const dx of [-16, 0, 16]) {
        ctx.fillStyle = '#FF94B8';
        ctx.beginPath();
        ctx.ellipse(vx + dx, 712 - (dx === 0 ? 10 : 0), 10, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Foreground Sacred Lotus Pond at bottom (Hồ Sen Hoa Đăng Tiền Cảnh y = 1755..1920)
    const pondGrad = ctx.createLinearGradient(0, 1755, 0, 1920);
    pondGrad.addColorStop(0, 'rgba(12, 28, 36, 0.88)');
    pondGrad.addColorStop(1, 'rgba(5, 12, 18, 0.98)');
    ctx.fillStyle = pondGrad;
    ctx.fillRect(0, 1755, 1080, 165);

    ctx.strokeStyle = '#D9A441';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 1755);
    ctx.lineTo(1080, 1755);
    ctx.stroke();

    // Lotus pads on pond
    for (const [lx, ly, lr] of [
      [120, 1825, 48],
      [340, 1865, 42],
      [760, 1855, 45],
      [950, 1815, 50]
    ]) {
      ctx.fillStyle = 'rgba(34, 88, 62, 0.72)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr, lr * 0.36, 0, 0.2, Math.PI * 1.95);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 195, 145, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    this.backdropCache.set(mode, c);
    return c;
  }

  private animate(nowMs: number): void {
    requestAnimationFrame(this.animate);

    const elapsedMs = nowMs - this.lastRenderMs;
    const minIntervalMs = this.targetFps === 30 ? 1000 / 31 : 1000 / 62;
    if (elapsedMs < minIntervalMs) return;

    const dt = Math.min(0.05, (nowMs - this.lastRafMs) / 1000);
    this.lastRafMs = nowMs;
    this.lastRenderMs = nowMs;
    this.clockSec += dt;

    const frameStart = performance.now();
    this.renderFrame(dt, nowMs);
    const frameCost = performance.now() - frameStart;

    // Update rolling telemetry
    this.avgFrameTimeMs = this.avgFrameTimeMs * 0.9 + frameCost * 0.1;
    if (frameCost > 34) {
      this.droppedFrames++;
    }
    this.fpsFrameCount++;
    if (nowMs - this.fpsWindowStartMs >= 1000) {
      this.measuredFps = Math.round(
        (this.fpsFrameCount * 1000) / (nowMs - this.fpsWindowStartMs)
      );
      this.fpsFrameCount = 0;
      this.fpsWindowStartMs = nowMs;
    }
  }

  private renderFrame(dt: number, nowMs: number): void {
    const ctx = this.ctx;
    const t = this.clockSec;

    ctx.clearRect(0, 0, 1080, 1920);

    // 1. Sanctuary Backdrop (unless OBS transparent mode is active)
    if (!this.transparentBg) {
      const bg = this.getOrBakeSanctuaryBackdrop(this.timeOfDay);
      ctx.drawImage(bg, 0, 0);
    }

    // 2. Rotating & Breathing Multi-Ring Halo + Amitabha Buddha Statue
    this.haloBoost = Math.max(0, this.haloBoost - dt * 0.45);
    const haloScale = (1.02 + 0.04 * Math.sin(t * 1.4) + this.haloBoost * 0.12) * this.lightingWarmth;
    ctx.save();
    ctx.translate(540, 445);
    ctx.rotate(t * 0.12);
    ctx.globalAlpha = Math.min(1, 0.78 + 0.12 * Math.sin(t * 1.8) + this.haloBoost * 0.2);
    const hw = 520 * haloScale;
    ctx.drawImage(this.atlas.haloWheel, -hw * 0.5, -hw * 0.5, hw, hw);
    ctx.restore();

    // Draw Amitabha Buddha Statue centered on altar
    ctx.drawImage(this.atlas.buddhaStatue, 540 - 230, 250, 460, 540);

    // 3. Temple Bronze Bell (Right) & Wooden Fish (Left) + Bronze Censer (Center)
    this.bellSwing = Math.max(0, this.bellSwing - dt * 0.85);
    this.moPulse = Math.max(0, this.moPulse - dt * 2.4);

    // Wooden Fish (Mõ Gỗ at x=210, y=855)
    ctx.save();
    ctx.translate(210, 855);
    const moScale = 1 + this.moPulse * 0.12;
    ctx.scale(moScale, moScale);
    ctx.drawImage(this.atlas.woodenFish, -70, -60);
    ctx.restore();

    // Temple Bronze Bell (Đại Hồng Chung at x=870, y=795)
    ctx.save();
    ctx.translate(870, 720);
    ctx.rotate(Math.sin(t * 9) * 0.06 * this.bellSwing);
    ctx.drawImage(this.atlas.templeBell, -85, -20);
    ctx.restore();

    // Glowing Incense Sticks inside the Bronze Censer (x=540, y=845)
    for (let i = 0; i < this.activeIncenseSticks; i++) {
      const u =
        this.activeIncenseSticks === 1
          ? 0
          : (i / (this.activeIncenseSticks - 1) - 0.5) * 2;
      const sx = 540 + u * 34;
      const sy = 842;
      const tipX = sx + u * 10;
      const tipY = sy - 64 - (i % 3) * 5;

      ctx.strokeStyle = '#9E2A1B';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Glowing ember tip
      ctx.fillStyle = i % 2 === 0 ? '#FFE066' : '#FF7733';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 2.8 + 0.8 * Math.sin(t * 6 + i), 0, Math.PI * 2);
      ctx.fill();
    }

    // Bronze Censer body in front of stick bases
    ctx.drawImage(this.atlas.bronzeCenser, 540 - 120, 760);

    // 4. Curling Incense Smoke (Pooled)
    this.updateAndDrawSmoke(dt, t);

    // 5. Monastic Teachers + Empty Cushion Mats
    for (const s of this.seats) {
      const matImg = s.isVip ? this.atlas.cushionVip : this.atlas.cushionStandard;
      const mw = 140 * s.scale;
      const mh = 64 * s.scale;
      ctx.drawImage(matImg, s.x - mw * 0.5, s.y - mh * 0.45, mw, mh);
    }

    for (const tc of TEACHERS) {
      const frame = this.atlas.characters[tc.skin].sitMeditate;
      const w = 160 * tc.scale;
      const h = 210 * tc.scale;
      const breathe = Math.sin(t * 1.3) * 1.8;
      ctx.drawImage(frame, tc.x - w * 0.5, tc.y - h * 0.88 + breathe, w, h);
      this.drawNamePill(tc.name, tc.x, tc.y - h * 0.86 - 10, tc.scale, true, 0, 150);
    }

    // 6. Depth-Sorted Viewer Characters (Sorted strictly by Y so front rows overlap back rows cleanly)
    this.updateAndDrawActors(dt, t, nowMs);

    // 7. Central Red-Carpet Ceremonial Worshipper (Walks up -> Kneels -> 3-Bow Prostration)
    this.updateAndDrawCentralWorshipper(dt, t);

    // 8. Foreground Lotus Pond & Floating Prayer Lanterns
    this.drawFloatingLanterns(t);

    // 9. Atmospheric Gold Sparks, Falling Lotus Petals, Bell Sound Waves & Floating Merit Banners
    this.updateAndDrawAtmosphereAndFx(dt, t);
  }

  private updateAndDrawSmoke(dt: number, t: number): void {
    const ctx = this.ctx;
    const maxSmoke = this.quality === 'low' ? 16 : this.quality === 'medium' ? 36 : 64;

    if (Math.random() < 0.55 * this.smokeDensity) {
      for (let i = 0; i < maxSmoke; i++) {
        const s = this.smokePool[i];
        if (!s.active) {
          s.active = true;
          s.x = 540 + (Math.random() - 0.5) * 44;
          s.y = 775;
          s.vx = (Math.random() - 0.5) * 14;
          s.vy = -(48 + Math.random() * 26);
          s.r0 = 10 + Math.random() * 6;
          s.rMax = 38 + Math.random() * 22;
          s.alpha = 0.26 + Math.random() * 0.12;
          s.age = 0;
          s.maxAge = 2.4 + Math.random() * 1.1;
          break;
        }
      }
    }

    for (let i = 0; i < maxSmoke; i++) {
      const p = this.smokePool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        continue;
      }
      const k = p.age / p.maxAge;
      const curl = Math.sin(t * 1.8 + p.seed + p.y * 0.015) * 26;
      p.x += (p.vx + curl * k) * dt;
      p.y += p.vy * dt;

      const r = p.r0 + (p.rMax - p.r0) * k;
      ctx.globalAlpha = Math.max(0, Math.sin(k * Math.PI) * p.alpha * (1 - k * 0.45));
      ctx.drawImage(this.atlas.smokePuff, p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  private updateAndDrawActors(dt: number, t: number, nowMs: number): void {
    const ctx = this.ctx;
    const sorted = [...this.actors.values()].sort((a, b) => a.y - b.y);
    const speechBubblesToDraw: Array<{ text: string; x: number; y: number; scale: number }> = [];

    for (const a of sorted) {
      a.stateTimer += dt;
      a.glowIntensity = Math.max(0, a.glowIntensity - dt * 0.55);

      switch (a.state) {
        case 'APPEAR': {
          a.alpha = Math.min(1, a.alpha + dt * 2.5);
          a.poseKey = 'walk1';
          if (a.alpha >= 1) {
            a.state = 'WALK';
            a.stateTimer = 0;
          }
          break;
        }
        case 'WALK': {
          const dx = a.targetX - a.x;
          const dy = a.targetY - a.y;
          const dist = Math.hypot(dx, dy);
          const speed = 260 * dt;
          if (dist <= speed + 2) {
            a.x = a.targetX;
            a.y = a.targetY;
            a.state = 'KNEEL_DOWN';
            a.stateTimer = 0;
          } else {
            // Walk up central aisle first, then step horizontally into row
            if (Math.abs(dy) > 12) {
              a.y += Math.sign(dy) * Math.min(Math.abs(dy), speed);
              a.x += (540 - a.x) * Math.min(1, dt * 4);
            } else {
              a.x += Math.sign(dx) * Math.min(Math.abs(dx), speed);
            }
            a.walkFrameTimer += dt;
            if (a.walkFrameTimer >= 0.18) {
              a.walkFrameTimer = 0;
              a.poseKey = a.poseKey === 'walk1' ? 'walk2' : 'walk1';
            }
          }
          break;
        }
        case 'KNEEL_DOWN': {
          a.poseKey = 'kneelDown';
          if (a.stateTimer >= 0.45) {
            a.state = 'SIT_MEDITATE';
            a.stateTimer = 0;
          }
          break;
        }
        case 'PRAY_HANDS': {
          a.poseKey = 'prayHands';
          if (a.stateTimer >= 2.2) {
            a.state = 'SIT_MEDITATE';
            a.stateTimer = 0;
          }
          break;
        }
        case 'PROSTRATE_BOW': {
          // Smooth bow cycle: prayHands -> kneelDown -> prostrateBow -> kneelDown -> sitMeditate
          const phase = a.stateTimer;
          if (phase < 0.35) a.poseKey = 'prayHands';
          else if (phase < 0.7) a.poseKey = 'kneelDown';
          else if (phase < 1.55) a.poseKey = 'prostrateBow';
          else if (phase < 1.9) a.poseKey = 'kneelDown';
          else {
            a.state = 'SIT_MEDITATE';
            a.stateTimer = 0;
          }
          break;
        }
        case 'SIT_MEDITATE': {
          a.poseKey = 'sitMeditate';
          a.x += (a.targetX - a.x) * Math.min(1, dt * 4);
          a.y += (a.targetY - a.y) * Math.min(1, dt * 4);
          break;
        }
        case 'LEAVE': {
          a.poseKey = 'prayHands';
          a.alpha = Math.max(0, a.alpha - dt * 1.8);
          if (a.alpha <= 0.02) {
            this.actors.delete(a.id);
            continue;
          }
          break;
        }
      }

      const skinFrames = this.atlas.characters[a.skin] || this.atlas.characters.lam_female;
      const frame = skinFrames[a.poseKey] || skinFrames.sitMeditate;
      const w = 160 * a.scale;
      const h = 210 * a.scale;
      const breathe =
        a.state === 'SIT_MEDITATE' ? Math.sin(t * 1.4 + a.breathPhase) * 1.6 * a.scale : 0;

      ctx.save();
      ctx.globalAlpha = a.alpha;
      if (a.glowIntensity > 0.05) {
        const gSize = 180 * a.scale;
        ctx.drawImage(
          this.atlas.goldSpark,
          a.x - gSize * 0.5,
          a.y - h * 0.5 - gSize * 0.5,
          gSize,
          gSize
        );
      }
      ctx.drawImage(frame, a.x - w * 0.5, a.y - h * 0.88 + breathe, w, h);
      ctx.restore();

      const seat = this.seats[a.seatIndex];
      const tagY = a.y - h * 0.86 - 10;
      this.drawNamePill(
        a.nickname,
        a.x,
        tagY,
        a.scale,
        a.isVip,
        a.vipRank,
        seat?.maxTagWidth || 120
      );

      if (a.speechText && nowMs < a.speechUntilMs) {
        speechBubblesToDraw.push({
          text: a.speechText,
          x: a.x,
          y: tagY - 22,
          scale: a.scale
        });
      }
    }

    // Draw speech bubbles on top of actors so they are never occluded
    for (const b of speechBubblesToDraw) {
      this.drawSpeechBubble(b.text, b.x, b.y);
    }
  }

  private updateAndDrawCentralWorshipper(dt: number, t: number): void {
    const c = this.centralActor;
    if (!c.active) return;

    c.elapsedSec += dt;
    if (c.elapsedSec >= c.durationSec) {
      c.active = false;
      return;
    }

    // Timeline:
    // 0.0s .. 1.6s: Walk up red carpet from y=1660 to y=1115 in front of Bronze Censer
    // 1.6s .. 5.2s: Perform Three Bows (Đảnh Lễ Tam Bái)
    // 5.2s .. end: Pray hands & fade
    if (c.elapsedSec < 1.6) {
      const p = c.elapsedSec / 1.6;
      c.x = 540;
      c.y = 1660 - (1660 - 1115) * p;
      c.poseKey = Math.floor(c.elapsedSec * 6) % 2 === 0 ? 'walk1' : 'walk2';
    } else {
      c.x = 540;
      c.y = 1115;
      const bowCycle = (c.elapsedSec - 1.6) % 1.25;
      if (bowCycle < 0.25) c.poseKey = 'prayHands';
      else if (bowCycle < 0.45) c.poseKey = 'kneelDown';
      else if (bowCycle < 0.9) c.poseKey = 'prostrateBow';
      else c.poseKey = 'kneelDown';
    }

    const scale = 0.72 + ((c.y - 1115) / 550) * 0.18;
    const frame =
      (this.atlas.characters[c.skin] || this.atlas.characters.lam_female)[c.poseKey];
    const w = 160 * scale;
    const h = 210 * scale;

    const ctx = this.ctx;
    ctx.save();
    // Sacred spotlight beam on central worshipper
    ctx.globalAlpha = 0.28 + 0.08 * Math.sin(t * 4);
    ctx.drawImage(this.atlas.haloWheel, c.x - 130, c.y - 190, 260, 260);
    ctx.globalAlpha = 1;
    ctx.drawImage(frame, c.x - w * 0.5, c.y - h * 0.88, w, h);
    ctx.restore();

    this.drawNamePill(c.nickname, c.x, c.y - h * 0.88 - 14, 0.72, true, 0, 220);
    if (c.wishText) {
      this.drawSpeechBubble(c.wishText, c.x, c.y - h * 0.88 - 40);
    }
  }

  private drawFloatingLanterns(t: number): void {
    const ctx = this.ctx;
    const count = this.lanterns.length;
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const item = this.lanterns[i];
      const baseX = 110 + ((i * 173) % 860);
      const driftX = baseX + Math.sin(t * 0.45 + i * 1.3) * 28;
      const driftY = 1795 + (i % 3) * 34 + Math.cos(t * 0.9 + i) * 4;

      ctx.drawImage(this.atlas.floatingLantern, driftX - 48, driftY - 42, 96, 78);

      if (i < 5) {
        ctx.font = '600 15px "Be Vietnam Pro", system-ui, sans-serif';
        ctx.fillStyle = '#FFE8A3';
        ctx.textAlign = 'center';
        ctx.fillText(item.nickname.slice(0, 14), driftX, driftY + 32);
      }
    }
  }

  private updateAndDrawAtmosphereAndFx(dt: number, t: number): void {
    const ctx = this.ctx;

    // 1. Rising Gold Sparks
    const sparkCount = this.quality === 'low' ? 12 : this.quality === 'medium' ? 24 : 42;
    for (let i = 0; i < sparkCount; i++) {
      const sp = this.sparks[i];
      sp.y += sp.vy * dt;
      sp.x += sp.vx * dt + Math.sin(t + sp.phase) * 0.35;
      if (sp.y < 140) {
        sp.y = 1750;
        sp.x = Math.random() * 1080;
      }
      ctx.globalAlpha = sp.alpha * (0.55 + 0.45 * Math.sin(t * 2.2 + sp.phase));
      ctx.drawImage(this.atlas.goldSpark, sp.x - sp.size * 0.5, sp.y - sp.size * 0.5, sp.size, sp.size);
    }

    // 2. Falling Lotus Petals
    ctx.globalAlpha = 1;
    const maxPetals =
      Math.round(
        (this.quality === 'low' ? 12 : this.quality === 'medium' ? 28 : 48) *
          this.petalDensity *
          (this.weather === 'LOTUS_RAIN' || this.weather === 'SPRING_BLOSSOM' ? 1.3 : 1.0)
      );

    for (let i = 0; i < Math.min(this.petalPool.length, maxPetals); i++) {
      const p = this.petalPool[i];
      if (!p.active) {
        p.active = true;
        p.x = Math.random() * 1080;
        p.y = -20;
      }
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(t * 1.6 + p.swayPhase) * 24 * dt;
      p.rot += p.vrot * dt;

      if (p.y > 1940) {
        p.y = -25;
        p.x = Math.random() * 1080;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const sz = 28 * p.scale;
      ctx.drawImage(
        p.gold ? this.atlas.goldPetal : this.atlas.pinkPetal,
        -sz * 0.5,
        -sz * 0.5,
        sz,
        sz
      );
      ctx.restore();
    }

    // 3. Bell Sound Wave Rings
    for (const w of this.wavePool) {
      if (!w.active) continue;
      w.radius += 280 * dt;
      w.alpha *= Math.pow(0.18, dt);
      if (w.radius >= w.maxRadius || w.alpha < 0.03) {
        w.active = false;
        continue;
      }
      ctx.save();
      ctx.globalAlpha = w.alpha;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = w.lineWidth;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Floating Merit & Offering Banners
    for (const f of this.floatingEffects) {
      if (!f.active) continue;
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        continue;
      }
      f.y += f.vy * dt;
      const k = f.age / f.maxAge;
      const alpha = k < 0.7 ? 1 : (1 - k) / 0.3;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      if (f.kind !== 'merit') {
        const icon =
          f.kind === 'dragon'
            ? this.atlas.offeringDragon
            : f.kind === 'fruit'
              ? this.atlas.offeringFruit
              : f.kind === 'lamp'
                ? this.atlas.offeringLamp
                : this.atlas.offeringLotus;
        ctx.drawImage(icon, f.x - 36, f.y - 82, 72, 72);
      }
      ctx.font = '700 26px "Be Vietnam Pro", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20, 6, 3, 0.92)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = '#FFE382';
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private drawNamePill(
    name: string,
    x: number,
    y: number,
    scale: number,
    isGold: boolean,
    vipRank: number,
    maxW: number
  ): void {
    const ctx = this.ctx;
    const fontSize = Math.max(14, Math.min(22, Math.round(25 * scale)));
    ctx.font = `600 ${fontSize}px "Be Vietnam Pro", system-ui, sans-serif`;

    const prefix = vipRank > 0 ? `#${vipRank} ` : '';
    let label = `${prefix}${name}`;
    while (label.length > 4 && ctx.measureText(label).width > maxW) {
      label = label.slice(0, -1);
    }
    if (label !== `${prefix}${name}`) {
      label = label.trimEnd() + '…';
    }

    const textW = ctx.measureText(label).width;
    const padX = 10;
    const pillW = textW + padX * 2;
    const pillH = fontSize + 9;

    ctx.fillStyle = isGold ? 'rgba(68, 24, 8, 0.92)' : 'rgba(20, 8, 4, 0.78)';
    ctx.beginPath();
    ctx.roundRect(x - pillW * 0.5, y - pillH * 0.5, pillW, pillH, pillH * 0.5);
    ctx.fill();

    ctx.lineWidth = isGold ? 2 : 1.2;
    ctx.strokeStyle = isGold ? '#F2C55C' : 'rgba(229, 184, 91, 0.52)';
    ctx.stroke();

    ctx.fillStyle = isGold ? '#FFE596' : '#F8ECD6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
  }

  private drawSpeechBubble(text: string, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.font = '600 18px "Be Vietnam Pro", system-ui, sans-serif';
    let clean = text;
    if (clean.length > 44) {
      clean = clean.slice(0, 42).trimEnd() + '…';
    }

    const w = Math.min(420, ctx.measureText(clean).width + 26);
    const h = 34;
    const clampedX = Math.max(w * 0.5 + 16, Math.min(1080 - w * 0.5 - 16, x));

    ctx.fillStyle = 'rgba(255, 248, 231, 0.96)';
    ctx.beginPath();
    ctx.roundRect(clampedX - w * 0.5, y - h, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = '#D99B26';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#3B1506';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clean, clampedX, y - h * 0.5 + 1);
  }

  public getPerfReport(clientId = 'overlay'): ClientPerfReport {
    const perfMem = (performance as any).memory;
    const jsHeapMb = perfMem?.usedJSHeapSize
      ? +(perfMem.usedJSHeapSize / (1024 * 1024)).toFixed(1)
      : 0;
    const activeParticles =
      this.smokePool.filter((s) => s.active).length +
      this.petalPool.filter((p) => p.active).length +
      this.sparks.length;

    return {
      clientId,
      fps: this.measuredFps,
      frameTimeMs: +this.avgFrameTimeMs.toFixed(2),
      droppedFrames: this.droppedFrames,
      activeActors: this.actors.size + TEACHERS.length + (this.centralActor.active ? 1 : 0),
      activeParticles,
      rendererType: this.pixiVerifyBadge,
      jsHeapMb,
      reportedAt: Date.now()
    };
  }
}
