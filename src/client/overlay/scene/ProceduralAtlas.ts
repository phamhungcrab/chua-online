import type { CharacterSkinId } from '../../../shared/types.ts';

export type CharacterPoseKey =
  | 'walk1'
  | 'walk2'
  | 'kneelDown'
  | 'sitMeditate'
  | 'prayHands'
  | 'prostrateBow';

export interface BakedAtlas {
  buddhaStatue: HTMLCanvasElement;
  haloWheel: HTMLCanvasElement;
  bronzeCenser: HTMLCanvasElement;
  templeBell: HTMLCanvasElement;
  woodenFish: HTMLCanvasElement;
  floatingLantern: HTMLCanvasElement;
  cushionStandard: HTMLCanvasElement;
  cushionVip: HTMLCanvasElement;
  smokePuff: HTMLCanvasElement;
  goldSpark: HTMLCanvasElement;
  pinkPetal: HTMLCanvasElement;
  goldPetal: HTMLCanvasElement;
  offeringLotus: HTMLCanvasElement;
  offeringLamp: HTMLCanvasElement;
  offeringFruit: HTMLCanvasElement;
  offeringDragon: HTMLCanvasElement;
  characters: Record<CharacterSkinId, Record<CharacterPoseKey, HTMLCanvasElement>>;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

/**
 * Clean-Room Procedural High-DPI Artwork Baker.
 * Pre-renders every sacred element, lotus throne, bronze censer, lantern, particle,
 * and 7 character skins × 6 animation poses ONCE at startup into GPU-friendly bitmaps.
 * Zero per-frame radial gradients or complex path allocations during the 60 FPS loop.
 */
export function buildProceduralAtlas(): BakedAtlas {
  return {
    buddhaStatue: bakeBuddhaStatue(),
    haloWheel: bakeHaloWheel(),
    bronzeCenser: bakeBronzeCenser(),
    templeBell: bakeTempleBell(),
    woodenFish: bakeWoodenFish(),
    floatingLantern: bakeFloatingLantern(),
    cushionStandard: bakeCushion(false),
    cushionVip: bakeCushion(true),
    smokePuff: bakeSmokePuff(),
    goldSpark: bakeGoldSpark(),
    pinkPetal: bakePetal('#F79AC0', '#FFD6E7'),
    goldPetal: bakePetal('#F4C44E', '#FFF3B0'),
    offeringLotus: bakeOfferingIcon('lotus'),
    offeringLamp: bakeOfferingIcon('lamp'),
    offeringFruit: bakeOfferingIcon('fruit'),
    offeringDragon: bakeOfferingIcon('dragon'),
    characters: bakeAllCharacterSkins()
  };
}

function bakeHaloWheel(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(520, 520);
  const cx = 260;
  const cy = 260;

  const outerGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 255);
  outerGlow.addColorStop(0, 'rgba(255, 238, 170, 0.92)');
  outerGlow.addColorStop(0.38, 'rgba(255, 195, 75, 0.55)');
  outerGlow.addColorStop(0.72, 'rgba(229, 130, 35, 0.20)');
  outerGlow.addColorStop(1, 'rgba(229, 130, 35, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 255, 0, Math.PI * 2);
  ctx.fill();

  // 24 sacred rays
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 232, 145, 0.34)' : 'rgba(255, 205, 95, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -240);
    ctx.lineTo(9, -240);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Concentric filigree rings
  for (const r of [92, 136, 178, 214]) {
    ctx.strokeStyle = 'rgba(255, 226, 138, 0.65)';
    ctx.lineWidth = r === 136 ? 3 : 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  return c;
}

function bakeBuddhaStatue(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(460, 540);
  const cx = 230;

  // Back mandorla (Lá đề vàng son)
  const mandorlaGrad = ctx.createLinearGradient(cx, 30, cx, 440);
  mandorlaGrad.addColorStop(0, '#FFE89E');
  mandorlaGrad.addColorStop(0.5, '#D99B26');
  mandorlaGrad.addColorStop(1, '#6E3809');
  ctx.fillStyle = mandorlaGrad;
  ctx.beginPath();
  ctx.moveTo(cx, 28);
  ctx.bezierCurveTo(cx + 155, 95, cx + 175, 290, cx + 115, 420);
  ctx.lineTo(cx - 115, 420);
  ctx.bezierCurveTo(cx - 175, 290, cx - 155, 95, cx, 28);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFF1B8';
  ctx.stroke();

  // Inner dark crimson sanctuary recess inside mandorla
  const innerGrad = ctx.createRadialGradient(cx, 210, 15, cx, 230, 165);
  innerGrad.addColorStop(0, '#5B1F0E');
  innerGrad.addColorStop(1, '#240A04');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.moveTo(cx, 52);
  ctx.bezierCurveTo(cx + 132, 110, cx + 148, 285, cx + 98, 405);
  ctx.lineTo(cx - 98, 405);
  ctx.bezierCurveTo(cx - 148, 285, cx - 132, 110, cx, 52);
  ctx.closePath();
  ctx.fill();

  // Head halo behind Buddha head
  const headHalo = ctx.createRadialGradient(cx, 148, 8, cx, 148, 72);
  headHalo.addColorStop(0, 'rgba(255, 248, 205, 0.95)');
  headHalo.addColorStop(0.65, 'rgba(255, 204, 82, 0.55)');
  headHalo.addColorStop(1, 'rgba(255, 180, 40, 0)');
  ctx.fillStyle = headHalo;
  ctx.beginPath();
  ctx.arc(cx, 148, 72, 0, Math.PI * 2);
  ctx.fill();

  // Golden Body & Robe (Áo cà sa vàng ánh kim)
  const goldGrad = ctx.createLinearGradient(cx - 90, 110, cx + 90, 410);
  goldGrad.addColorStop(0, '#FFF0B5');
  goldGrad.addColorStop(0.35, '#F2BE49');
  goldGrad.addColorStop(0.75, '#C88719');
  goldGrad.addColorStop(1, '#8C5408');

  // Crossed legs in lotus posture (Kiết già)
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 378, 108, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6A3B05';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Torso & draped monastic robe
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 68, 212);
  ctx.quadraticCurveTo(cx - 102, 295, cx - 95, 372);
  ctx.lineTo(cx + 95, 372);
  ctx.quadraticCurveTo(cx + 102, 295, cx + 68, 212);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner chest swastika / lotus emblem (Chữ Vạn nhà Phật)
  ctx.fillStyle = '#FFEFA6';
  ctx.beginPath();
  ctx.arc(cx, 250, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#B72C18';
  ctx.lineWidth = 2.6;
  ctx.font = '700 22px serif';
  ctx.fillStyle = '#B72C18';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('卍', cx, 251);

  // Robe folds
  ctx.strokeStyle = 'rgba(105, 52, 6, 0.55)';
  ctx.lineWidth = 2.2;
  for (const offset of [-45, -22, 22, 45]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset * 0.6, 218);
    ctx.quadraticCurveTo(cx + offset * 1.1, 295, cx + offset, 365);
    ctx.stroke();
  }

  // Hands in Dhyana Mudra holding a radiant Lotus (Ấn Thiền Định nâng Đài Sen)
  ctx.fillStyle = '#FAD47B';
  ctx.beginPath();
  ctx.ellipse(cx, 342, 36, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Small radiant lotus in hands
  ctx.fillStyle = '#FF94B8';
  for (let p = -2; p <= 2; p++) {
    ctx.save();
    ctx.translate(cx + p * 7, 332);
    ctx.rotate(p * 0.22);
    ctx.beginPath();
    ctx.ellipse(0, -6, 6, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Neck & Head
  ctx.fillStyle = '#F8D57E';
  ctx.fillRect(cx - 16, 186, 32, 26);

  // Long compassionate ears (Tai dài tướng Phật)
  ctx.beginPath();
  ctx.ellipse(cx - 43, 158, 8, 24, -0.1, 0, Math.PI * 2);
  ctx.ellipse(cx + 43, 158, 8, 24, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Serene face
  const faceGrad = ctx.createRadialGradient(cx - 8, 142, 6, cx, 150, 44);
  faceGrad.addColorStop(0, '#FFF4C2');
  faceGrad.addColorStop(0.7, '#F3C65F');
  faceGrad.addColorStop(1, '#CA8E22');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 150, 40, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7A4608';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hair & Ushnisha (Nhục髻 trên đỉnh đầu)
  ctx.fillStyle = '#2B1D16';
  ctx.beginPath();
  ctx.arc(cx, 132, 41, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, 96, 21, 0, Math.PI * 2);
  ctx.fill();

  // Sacred crown jewel (Châu ngọc giữa nhục kế & bạch hào)
  ctx.fillStyle = '#FFF5B8';
  ctx.beginPath();
  ctx.arc(cx, 102, 6, 0, Math.PI * 2);
  ctx.arc(cx, 134, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Half-closed meditative eyes & gentle smile
  ctx.strokeStyle = '#4A2506';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 22, 148);
  ctx.quadraticCurveTo(cx - 13, 153, cx - 5, 148);
  ctx.moveTo(cx + 5, 148);
  ctx.quadraticCurveTo(cx + 13, 153, cx + 22, 148);
  ctx.stroke();

  ctx.strokeStyle = '#8F3218';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, 173);
  ctx.quadraticCurveTo(cx, 179, cx + 10, 173);
  ctx.stroke();

  // Three-Tier Grand Lotus Throne (Đài Sen Ba Tầng)
  const petalRow = (y: number, count: number, spreadX: number, pw: number, ph: number, up: boolean, colorTop: string, colorBot: string) => {
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
      const px = cx + u * spreadX;
      const py = y + Math.abs(u) * (up ? 8 : -6);
      const g = ctx.createLinearGradient(px, py - ph, px, py + ph);
      g.addColorStop(0, colorTop);
      g.addColorStop(1, colorBot);
      ctx.fillStyle = g;
      ctx.beginPath();
      if (up) {
        ctx.moveTo(px, py - ph);
        ctx.quadraticCurveTo(px + pw, py, px + pw * 0.65, py + ph * 0.5);
        ctx.lineTo(px - pw * 0.65, py + ph * 0.5);
        ctx.quadraticCurveTo(px - pw, py, px, py - ph);
      } else {
        ctx.moveTo(px, py + ph);
        ctx.quadraticCurveTo(px + pw, py, px + pw * 0.65, py - ph * 0.5);
        ctx.lineTo(px - pw * 0.65, py - ph * 0.5);
        ctx.quadraticCurveTo(px - pw, py, px, py + ph);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#D99E30';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  };

  // Back & front lotus petals + golden pedestal base
  petalRow(405, 9, 138, 24, 34, true, '#FFD6E6', '#C94A78');
  petalRow(426, 7, 122, 28, 36, true, '#FFF0B8', '#D18B1C');
  petalRow(458, 9, 145, 25, 30, false, '#FFBCD6', '#A1325B');

  // Octagonal carved wood & gold pedestal
  const baseGrad = ctx.createLinearGradient(cx - 160, 470, cx + 160, 525);
  baseGrad.addColorStop(0, '#5A1B0C');
  baseGrad.addColorStop(0.5, '#9E3818');
  baseGrad.addColorStop(1, '#471307');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.roundRect(cx - 155, 474, 310, 44, 10);
  ctx.fill();
  ctx.strokeStyle = '#F0C05A';
  ctx.lineWidth = 3;
  ctx.stroke();

  return c;
}

function bakeBronzeCenser(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 220);
  const cx = 120;

  // Tripod legs (Chân đỉnh nghê đồng)
  ctx.fillStyle = '#6E4B1F';
  ctx.strokeStyle = '#D8A648';
  ctx.lineWidth = 2.5;
  for (const lx of [cx - 52, cx, cx + 52]) {
    ctx.beginPath();
    ctx.roundRect(lx - 10, 148, 20, 48, 8);
    ctx.fill();
    ctx.stroke();
  }

  // Cloud ears (Tai mây hai bên)
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 68, 92);
    ctx.bezierCurveTo(cx + dir * 108, 66, cx + dir * 112, 134, cx + dir * 66, 136);
    ctx.strokeStyle = '#E8B954';
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  // Main bronze belly (Bụng đỉnh đồng chạm rồng)
  const bellyGrad = ctx.createRadialGradient(cx - 18, 106, 10, cx, 116, 78);
  bellyGrad.addColorStop(0, '#FCE092');
  bellyGrad.addColorStop(0.45, '#C48A2C');
  bellyGrad.addColorStop(0.85, '#6E4412');
  bellyGrad.addColorStop(1, '#3D2206');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 118, 74, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFE291';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Ash bed at rim
  ctx.fillStyle = '#CDB896';
  ctx.beginPath();
  ctx.ellipse(cx, 82, 58, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8F621B';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Moon pearl emblem on censer front
  ctx.fillStyle = '#FFF2B2';
  ctx.beginPath();
  ctx.arc(cx, 118, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#731A0C';
  ctx.lineWidth = 2;
  ctx.stroke();

  return c;
}

function bakeTempleBell(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(170, 230);
  const cx = 85;

  // Wooden bell stand frame
  ctx.strokeStyle = '#5C1E0E';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 16, 134, 198);
  ctx.strokeStyle = '#D9A441';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 16, 134, 198);

  // Bell body (Đại Hồng Chung)
  const bellGrad = ctx.createLinearGradient(cx - 42, 46, cx + 42, 176);
  bellGrad.addColorStop(0, '#F5CB69');
  bellGrad.addColorStop(0.5, '#A8721E');
  bellGrad.addColorStop(1, '#4F3108');
  ctx.fillStyle = bellGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 24, 52);
  ctx.quadraticCurveTo(cx - 42, 110, cx - 48, 168);
  ctx.lineTo(cx + 48, 168);
  ctx.quadraticCurveTo(cx + 42, 110, cx + 24, 52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFE499';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  return c;
}

function bakeWoodenFish(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 120);
  const cx = 70;

  // Brocade cushion under wooden fish
  ctx.fillStyle = '#8F1D14';
  ctx.beginPath();
  ctx.roundRect(22, 74, 96, 26, 12);
  ctx.fill();
  ctx.strokeStyle = '#E5B85B';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Carved wooden fish body
  const woodGrad = ctx.createRadialGradient(cx - 10, 48, 6, cx, 55, 42);
  woodGrad.addColorStop(0, '#D98E43');
  woodGrad.addColorStop(0.7, '#8C4A19');
  woodGrad.addColorStop(1, '#4D2207');
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 54, 40, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3B1804';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Acoustic resonant slit
  ctx.fillStyle = '#1E0A02';
  ctx.beginPath();
  ctx.roundRect(cx - 26, 52, 48, 6, 3);
  ctx.fill();

  return c;
}

function bakeFloatingLantern(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(110, 90);
  const cx = 55;
  const cy = 48;

  // Warm water glow
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
  glow.addColorStop(0, 'rgba(255, 240, 175, 0.95)');
  glow.addColorStop(0.5, 'rgba(255, 165, 90, 0.45)');
  glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fill();

  // Lotus petals of lantern
  for (let i = -3; i <= 3; i++) {
    ctx.save();
    ctx.translate(cx + i * 7, cy + 4);
    ctx.rotate(i * 0.22);
    ctx.fillStyle = i % 2 === 0 ? '#FF8FB8' : '#FFB8D2';
    ctx.beginPath();
    ctx.ellipse(0, -10, 8, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFE4EE';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Candle flame center
  ctx.fillStyle = '#FFF9D6';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, 5, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

function bakeCushion(isVip: boolean): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 64);
  const cx = 70;
  const cy = 34;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 58, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brocade cushion (Bồ đoàn thêu sen)
  const g = ctx.createRadialGradient(cx, cy - 4, 6, cx, cy, 56);
  if (isVip) {
    g.addColorStop(0, '#FFE89C');
    g.addColorStop(0.55, '#C7881E');
    g.addColorStop(1, '#6E3208');
  } else {
    g.addColorStop(0, '#B53824');
    g.addColorStop(0.65, '#6E180D');
    g.addColorStop(1, '#3D0B05');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 54, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isVip ? '#FFF2B5' : '#D9A441';
  ctx.lineWidth = isVip ? 2.8 : 1.8;
  ctx.stroke();

  return c;
}

function bakeSmokePuff(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255, 246, 222, 0.80)');
  g.addColorStop(0.5, 'rgba(235, 220, 192, 0.36)');
  g.addColorStop(1, 'rgba(215, 198, 168, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function bakeGoldSpark(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(20, 20);
  const g = ctx.createRadialGradient(10, 10, 1, 10, 10, 9);
  g.addColorStop(0, 'rgba(255, 250, 210, 1)');
  g.addColorStop(0.45, 'rgba(255, 210, 88, 0.65)');
  g.addColorStop(1, 'rgba(255, 180, 40, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(10, 10, 9, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function bakePetal(outerColor: string, innerColor: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(32, 32);
  ctx.translate(16, 16);
  const g = ctx.createLinearGradient(0, -12, 0, 12);
  g.addColorStop(0, innerColor);
  g.addColorStop(1, outerColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(10, -5, 9, 9, 0, 12);
  ctx.bezierCurveTo(-9, 9, -10, -5, 0, -12);
  ctx.closePath();
  ctx.fill();
  return c;
}

function bakeOfferingIcon(kind: 'lotus' | 'lamp' | 'fruit' | 'dragon'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 96);
  const cx = 48;
  const cy = 48;

  const halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, 44);
  halo.addColorStop(0, 'rgba(255, 238, 168, 0.92)');
  halo.addColorStop(0.6, 'rgba(255, 188, 66, 0.35)');
  halo.addColorStop(1, 'rgba(255, 160, 30, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle =
    kind === 'dragon'
      ? '#FFD75E'
      : kind === 'fruit'
        ? '#FF9F4A'
        : kind === 'lamp'
          ? '#FFE885'
          : '#FF94B8';
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFF6C8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = '700 28px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3D1206';
  const symbol =
    kind === 'dragon' ? '龍' : kind === 'fruit' ? '果' : kind === 'lamp' ? '燈' : '蓮';
  ctx.fillText(symbol, cx, cy + 1);
  return c;
}

interface SkinPalette {
  robePrimary: string;
  robeSecondary: string;
  trimGold: boolean;
  hairColor: string;
  hairStyle: 'bun' | 'short' | 'shaved' | 'tuft' | 'elder_bun';
  hasHalo: boolean;
}

const SKIN_PALETTES: Record<CharacterSkinId, SkinPalette> = {
  lam_female: {
    robePrimary: '#7C93B0',
    robeSecondary: '#596F8C',
    trimGold: false,
    hairColor: '#1E1612',
    hairStyle: 'bun',
    hasHalo: false
  },
  lam_male: {
    robePrimary: '#6D84A3',
    robeSecondary: '#4B607D',
    trimGold: false,
    hairColor: '#1E1612',
    hairStyle: 'short',
    hasHalo: false
  },
  brown_elder: {
    robePrimary: '#7D4E38',
    robeSecondary: '#593423',
    trimGold: false,
    hairColor: '#D8D2C9',
    hairStyle: 'elder_bun',
    hasHalo: false
  },
  monk: {
    robePrimary: '#D98A2B',
    robeSecondary: '#9E3E14',
    trimGold: true,
    hairColor: '#2E231D',
    hairStyle: 'shaved',
    hasHalo: false
  },
  nun: {
    robePrimary: '#A67B4B',
    robeSecondary: '#73512C',
    trimGold: false,
    hairColor: '#2E231D',
    hairStyle: 'shaved',
    hasHalo: false
  },
  child: {
    robePrimary: '#8CA6C4',
    robeSecondary: '#637C99',
    trimGold: false,
    hairColor: '#1E1612',
    hairStyle: 'tuft',
    hasHalo: false
  },
  master_vip: {
    robePrimary: '#5D779E',
    robeSecondary: '#3B5073',
    trimGold: true,
    hairColor: '#1E1612',
    hairStyle: 'bun',
    hasHalo: true
  }
};

function bakeAllCharacterSkins(): Record<
  CharacterSkinId,
  Record<CharacterPoseKey, HTMLCanvasElement>
> {
  const poses: CharacterPoseKey[] = [
    'walk1',
    'walk2',
    'kneelDown',
    'sitMeditate',
    'prayHands',
    'prostrateBow'
  ];
  const result = {} as Record<CharacterSkinId, Record<CharacterPoseKey, HTMLCanvasElement>>;

  for (const skin of Object.keys(SKIN_PALETTES) as CharacterSkinId[]) {
    result[skin] = {} as Record<CharacterPoseKey, HTMLCanvasElement>;
    for (const pose of poses) {
      result[skin][pose] = bakeCharacterFrame(skin, pose);
    }
  }
  return result;
}

function bakeCharacterFrame(skin: CharacterSkinId, pose: CharacterPoseKey): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(160, 210);
  const pal = SKIN_PALETTES[skin];
  const cx = 80;
  const isChild = skin === 'child';
  if (isChild) {
    ctx.translate(cx, 200);
    ctx.scale(0.84, 0.84);
    ctx.translate(-cx, -200);
  }

  // Optional VIP aura
  if (pal.hasHalo) {
    const aura = ctx.createRadialGradient(cx, 118, 8, cx, 118, 68);
    aura.addColorStop(0, 'rgba(255, 232, 148, 0.55)');
    aura.addColorStop(1, 'rgba(255, 190, 60, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, 118, 68, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(cx, 194, pose === 'prostrateBow' ? 54 : 38, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const robeGrad = ctx.createLinearGradient(cx - 40, 75, cx + 40, 192);
  robeGrad.addColorStop(0, pal.robePrimary);
  robeGrad.addColorStop(1, pal.robeSecondary);

  if (pose === 'prostrateBow') {
    // Full deep prostration (Ngũ thể đầu địa)
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 166, 46, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.trimGold ? '#F2C55C' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Extended praying hands on mat
    ctx.fillStyle = '#F2C9A0';
    ctx.beginPath();
    ctx.ellipse(cx - 24, 148, 8, 12, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + 24, 148, 8, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bowed head
    drawCharacterHead(ctx, cx, 138, pal);
    return c;
  }

  const headY =
    pose === 'walk1'
      ? 62
      : pose === 'walk2'
        ? 65
        : pose === 'kneelDown'
          ? 78
          : 82;
  const torsoTop = headY + 24;
  const torsoBottom = pose === 'walk1' || pose === 'walk2' ? 168 : 188;

  // Walking legs when in walk1/walk2
  if (pose === 'walk1' || pose === 'walk2') {
    const leftStep = pose === 'walk1' ? -5 : 5;
    ctx.fillStyle = pal.robeSecondary;
    ctx.beginPath();
    ctx.roundRect(cx - 20, 152 + leftStep, 15, 36, 6);
    ctx.roundRect(cx + 5, 152 - leftStep, 15, 36, 6);
    ctx.fill();
  } else {
    // Folded meditation base (Chân xếp bằng trên bồ đoàn)
    ctx.fillStyle = pal.robeSecondary;
    ctx.beginPath();
    ctx.ellipse(cx, 182, 42, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main robe body (Áo tràng lam / Y hậu)
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 26, torsoTop);
  ctx.quadraticCurveTo(cx - 44, (torsoTop + torsoBottom) * 0.5, cx - 36, torsoBottom);
  ctx.lineTo(cx + 36, torsoBottom);
  ctx.quadraticCurveTo(cx + 44, (torsoTop + torsoBottom) * 0.5, cx + 26, torsoTop);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pal.trimGold ? '#F2C55C' : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = pal.trimGold ? 2.5 : 1.5;
  ctx.stroke();

  // Collar V-lapel & prayer beads (Cổ áo tràng & tràng hạt)
  ctx.strokeStyle = pal.trimGold ? '#FFE28A' : '#D5E1F0';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - 11, torsoTop);
  ctx.lineTo(cx, torsoTop + 24);
  ctx.lineTo(cx + 11, torsoTop);
  ctx.stroke();

  // Clasped hands (Chắp tay búp sen)
  const handsY = pose === 'prayHands' ? headY + 18 : torsoTop + 34;
  ctx.fillStyle = '#F5CBA4';
  ctx.beginPath();
  ctx.ellipse(cx, handsY, 9, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9C6234';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Head & hair from back-3/4 view facing the Buddha altar
  drawCharacterHead(ctx, cx, headY, pal);

  return c;
}

function drawCharacterHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  pal: SkinPalette
): void {
  // Base head
  ctx.fillStyle = pal.hairStyle === 'shaved' ? '#E8BA91' : pal.hairColor;
  ctx.beginPath();
  ctx.arc(cx, headY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Hair bun or tuft details
  if (pal.hairStyle === 'bun' || pal.hairStyle === 'elder_bun') {
    ctx.fillStyle = pal.hairColor;
    ctx.beginPath();
    ctx.arc(cx, headY - 6, 11, 0, Math.PI * 2);
    ctx.fill();
    // Lotus hairpin
    ctx.fillStyle = pal.trimGold ? '#FFD86B' : '#F48FB1';
    ctx.beginPath();
    ctx.arc(cx + 8, headY - 9, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.hairStyle === 'tuft') {
    ctx.fillStyle = pal.hairColor;
    ctx.beginPath();
    ctx.arc(cx - 16, headY - 12, 7, 0, Math.PI * 2);
    ctx.arc(cx + 16, headY - 12, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}
