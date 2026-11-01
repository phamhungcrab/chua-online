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
  offeringFlowers: HTMLCanvasElement;
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
 * Emulates authentic Vietnamese Lacquerware & Gilded Sanctuary Art (Sơn Son Thếp Vàng).
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
    offeringFlowers: bakeOfferingIcon('flowers'),
    characters: bakeAllCharacterSkins()
  };
}

function bakeHaloWheel(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(540, 540);
  const cx = 270;
  const cy = 270;

  // Outer golden ethereal aura
  const outerGlow = ctx.createRadialGradient(cx, cy, 25, cx, cy, 265);
  outerGlow.addColorStop(0, 'rgba(255, 245, 195, 0.95)');
  outerGlow.addColorStop(0.35, 'rgba(255, 205, 85, 0.60)');
  outerGlow.addColorStop(0.68, 'rgba(235, 140, 38, 0.22)');
  outerGlow.addColorStop(1, 'rgba(235, 140, 38, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 265, 0, Math.PI * 2);
  ctx.fill();

  // 24 Sacred Dharmachakra Radiance Rays (24 tia hào quang trí tuệ)
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    const rayGrad = ctx.createLinearGradient(0, 0, 0, -250);
    if (i % 2 === 0) {
      rayGrad.addColorStop(0, 'rgba(255, 240, 165, 0.45)');
      rayGrad.addColorStop(0.6, 'rgba(255, 215, 110, 0.35)');
      rayGrad.addColorStop(1, 'rgba(255, 215, 110, 0)');
    } else {
      rayGrad.addColorStop(0, 'rgba(255, 215, 110, 0.25)');
      rayGrad.addColorStop(0.6, 'rgba(235, 150, 50, 0.15)');
      rayGrad.addColorStop(1, 'rgba(235, 150, 50, 0)');
    }
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -250);
    ctx.lineTo(10, -250);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Ornate Concentric Lotus & Filigree Rings (Vòng họa văn Bát Chiết Liên Hoa)
  const ringRadii = [96, 142, 185, 222];
  for (let idx = 0; idx < ringRadii.length; idx++) {
    const r = ringRadii[idx];
    ctx.strokeStyle = idx === 1 ? 'rgba(255, 235, 155, 0.85)' : 'rgba(255, 218, 120, 0.65)';
    ctx.lineWidth = idx === 1 ? 3.5 : 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Small radiant golden beads on inner ring
    if (idx === 1) {
      const beadCount = 36;
      for (let b = 0; b < beadCount; b++) {
        const ang = (b / beadCount) * Math.PI * 2;
        const bx = cx + Math.cos(ang) * r;
        const by = cy + Math.sin(ang) * r;
        ctx.fillStyle = '#FFF8D6';
        ctx.beginPath();
        ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return c;
}

function bakeBuddhaStatue(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(480, 560);
  const cx = 240;

  // 1. Grand Mandorla (Lá đề chạm mây vàng son thếp ngọc)
  const mandorlaGrad = ctx.createLinearGradient(cx, 25, cx, 445);
  mandorlaGrad.addColorStop(0, '#FFECA6');
  mandorlaGrad.addColorStop(0.3, '#E5A932');
  mandorlaGrad.addColorStop(0.7, '#A86812');
  mandorlaGrad.addColorStop(1, '#522104');
  ctx.fillStyle = mandorlaGrad;
  ctx.beginPath();
  ctx.moveTo(cx, 24);
  ctx.bezierCurveTo(cx + 168, 90, cx + 185, 295, cx + 120, 425);
  ctx.lineTo(cx - 120, 425);
  ctx.bezierCurveTo(cx - 185, 295, cx - 168, 90, cx, 24);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = '#FFF3C2';
  ctx.stroke();

  // Carved border filigree on mandorla (Vân mây ngọn lửa Bát Nhã)
  ctx.strokeStyle = 'rgba(255, 235, 145, 0.42)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx, 38);
  ctx.bezierCurveTo(cx + 150, 100, cx + 165, 285, cx + 105, 412);
  ctx.lineTo(cx - 105, 412);
  ctx.bezierCurveTo(cx - 165, 285, cx - 150, 100, cx, 38);
  ctx.stroke();

  // Inner deep crimson lacquer recess
  const innerGrad = ctx.createRadialGradient(cx, 215, 16, cx, 235, 175);
  innerGrad.addColorStop(0, '#66200D');
  innerGrad.addColorStop(0.7, '#380E05');
  innerGrad.addColorStop(1, '#1A0602');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.moveTo(cx, 54);
  ctx.bezierCurveTo(cx + 138, 112, cx + 152, 288, cx + 98, 408);
  ctx.lineTo(cx - 98, 408);
  ctx.bezierCurveTo(cx - 152, 288, cx - 138, 112, cx, 54);
  ctx.closePath();
  ctx.fill();

  // Head halo behind Buddha head
  const headHalo = ctx.createRadialGradient(cx, 150, 10, cx, 150, 78);
  headHalo.addColorStop(0, 'rgba(255, 250, 215, 0.98)');
  headHalo.addColorStop(0.55, 'rgba(255, 210, 85, 0.65)');
  headHalo.addColorStop(1, 'rgba(255, 185, 40, 0)');
  ctx.fillStyle = headHalo;
  ctx.beginPath();
  ctx.arc(cx, 150, 78, 0, Math.PI * 2);
  ctx.fill();

  // 2. Golden Body & Sacred Robes (Kim Thân & Áo Cà Sa Thếp Vàng Sơn Mài)
  const goldBodyGrad = ctx.createLinearGradient(cx - 95, 115, cx + 95, 415);
  goldBodyGrad.addColorStop(0, '#FFF4C8');
  goldBodyGrad.addColorStop(0.28, '#F5C856');
  goldBodyGrad.addColorStop(0.68, '#C98818');
  goldBodyGrad.addColorStop(1, '#824805');

  // Folded legs in full lotus meditation posture (Tọa thiền kiết già)
  ctx.fillStyle = goldBodyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 376, 122, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5E3003';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Soles of Buddha feet facing upward in vajra posture (Chân xếp liên hoa)
  ctx.fillStyle = '#FFE296';
  ctx.beginPath();
  ctx.ellipse(cx - 52, 366, 18, 9, -0.22, 0, Math.PI * 2);
  ctx.ellipse(cx + 52, 366, 18, 9, 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Torso & Shoulders in majestic seated posture
  ctx.fillStyle = goldBodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 72, 222);
  ctx.bezierCurveTo(cx - 96, 260, cx - 110, 345, cx - 88, 376);
  ctx.lineTo(cx + 88, 376);
  ctx.bezierCurveTo(cx + 110, 345, cx + 96, 222, cx + 72, 222);
  ctx.bezierCurveTo(cx + 42, 204, cx - 42, 204, cx - 72, 222);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4F2602';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Robe diagonal drapery & gilded folds (Nếp y cà sa vắt chéo qua vai trái)
  ctx.strokeStyle = '#FFE89C';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 68, 225);
  ctx.quadraticCurveTo(cx - 12, 290, cx + 78, 355);
  ctx.moveTo(cx - 58, 245);
  ctx.quadraticCurveTo(cx - 8, 308, cx + 72, 372);
  ctx.stroke();

  // Sacred Wan Symbol on Buddha Chest (Chữ Vạn 卐 Kim Sắc Cát Tường)
  ctx.strokeStyle = '#7D1F08';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  // Horizontal & vertical arms
  ctx.moveTo(cx - 9, 252);
  ctx.lineTo(cx + 9, 252);
  ctx.moveTo(cx, 243);
  ctx.lineTo(cx, 261);
  // Four hooks of Wan
  ctx.moveTo(cx - 9, 252);
  ctx.lineTo(cx - 9, 245);
  ctx.moveTo(cx + 9, 252);
  ctx.lineTo(cx + 9, 259);
  ctx.moveTo(cx, 243);
  ctx.lineTo(cx + 7, 243);
  ctx.moveTo(cx, 261);
  ctx.lineTo(cx - 7, 261);
  ctx.stroke();

  // Hands in Dhyana Mudra (Ấn Định Tam Muội) holding glowing pink lotus
  ctx.fillStyle = '#FCE39E';
  ctx.beginPath();
  ctx.ellipse(cx, 346, 38, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#824606';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Radiant pink lotus in palms
  for (let p = -2; p <= 2; p++) {
    ctx.save();
    ctx.translate(cx + p * 8, 335);
    ctx.rotate(p * 0.22);
    ctx.fillStyle = p === 0 ? '#FFE8F2' : '#FF9CBD';
    ctx.beginPath();
    ctx.ellipse(0, -7, 6, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Neck with three beauty folds (Cổ cao ba ngấn)
  ctx.fillStyle = '#F7D688';
  ctx.fillRect(cx - 17, 188, 34, 28);
  ctx.strokeStyle = 'rgba(120, 60, 8, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 14, 196);
  ctx.lineTo(cx + 14, 196);
  ctx.moveTo(cx - 15, 204);
  ctx.lineTo(cx + 15, 204);
  ctx.stroke();

  // Compassionate long ears (Tướng tai dài chấm vai)
  ctx.fillStyle = '#F7D688';
  ctx.beginPath();
  ctx.ellipse(cx - 45, 158, 9, 26, -0.1, 0, Math.PI * 2);
  ctx.ellipse(cx + 45, 158, 9, 26, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7D4106';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Serene Face (Khuôn mặt tròn đầy từ bi)
  const faceGrad = ctx.createRadialGradient(cx - 6, 144, 8, cx, 152, 46);
  faceGrad.addColorStop(0, '#FFF9DC');
  faceGrad.addColorStop(0.68, '#F6CD68');
  faceGrad.addColorStop(1, '#D19626');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 152, 42, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6E3A04';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Spiral Hair & Ushnisha (Nhục kế hình xoắn ốc xanh đen)
  ctx.fillStyle = '#221A15';
  ctx.beginPath();
  ctx.arc(cx, 134, 43, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, 98, 22, 0, Math.PI * 2);
  ctx.fill();

  // Urna (Bạch hào ngọc phát quang giữa hai chân mày)
  ctx.fillStyle = '#FFF8DB';
  ctx.beginPath();
  ctx.arc(cx, 102, 6.5, 0, Math.PI * 2);
  ctx.arc(cx, 136, 3.8, 0, Math.PI * 2);
  ctx.fill();

  // Eyes khép 3/4 nhìn xuống chúng sinh & nụ cười từ ái
  ctx.strokeStyle = '#4A2304';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - 24, 149);
  ctx.quadraticCurveTo(cx - 14, 155, cx - 5, 150);
  ctx.moveTo(cx + 5, 150);
  ctx.quadraticCurveTo(cx + 14, 155, cx + 24, 149);
  ctx.stroke();

  ctx.strokeStyle = '#993018';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - 11, 175);
  ctx.quadraticCurveTo(cx, 181, cx + 11, 175);
  ctx.stroke();

  // 3. Three-Tier Grand Lotus Throne (Đài Sen Sơn Mài Ba Tầng Thời Lý)
  const drawLotusLayer = (
    y: number,
    count: number,
    spreadX: number,
    pw: number,
    ph: number,
    isUp: boolean,
    colTop: string,
    colBot: string
  ) => {
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
      const px = cx + u * spreadX;
      const py = y + Math.abs(u) * (isUp ? 9 : -7);
      const g = ctx.createLinearGradient(px, py - ph, px, py + ph);
      g.addColorStop(0, colTop);
      g.addColorStop(1, colBot);
      ctx.fillStyle = g;
      ctx.beginPath();
      if (isUp) {
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
      ctx.strokeStyle = '#E5B84B';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Tier 1: Cánh sen hồng chu sa ngửa lên
  drawLotusLayer(410, 9, 144, 25, 36, true, '#FFE2EE', '#BA3864');
  // Tier 2: Cánh sen vàng nhũ kim giữa
  drawLotusLayer(432, 7, 126, 29, 38, true, '#FFF5CA', '#D18815');
  // Tier 3: Cánh sen úp xuống đỡ đài
  drawLotusLayer(466, 9, 150, 26, 32, false, '#FFC8DE', '#8F244A');

  // Gilded Octagonal Sanctuary Pedestal Base
  const baseGrad = ctx.createLinearGradient(cx - 165, 480, cx + 165, 538);
  baseGrad.addColorStop(0, '#5C1A09');
  baseGrad.addColorStop(0.5, '#A33614');
  baseGrad.addColorStop(1, '#4A1205');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.roundRect(cx - 160, 482, 320, 48, 12);
  ctx.fill();
  ctx.strokeStyle = '#F2C256';
  ctx.lineWidth = 3.2;
  ctx.stroke();

  return c;
}

function bakeBronzeCenser(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(250, 230);
  const cx = 125;

  // Carved lion-paw tripod legs (Ba chân lân đồng thếp vàng)
  ctx.fillStyle = '#734E20';
  ctx.strokeStyle = '#E2B150';
  ctx.lineWidth = 2.6;
  for (const lx of [cx - 56, cx, cx + 56]) {
    ctx.beginPath();
    ctx.roundRect(lx - 11, 154, 22, 52, 9);
    ctx.fill();
    ctx.stroke();
  }

  // Double dragon cloud handles (Đôi quai rồng mây uyển chuyển)
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 72, 96);
    ctx.bezierCurveTo(cx + dir * 114, 68, cx + dir * 118, 142, cx + dir * 70, 144);
    ctx.strokeStyle = '#F0C259';
    ctx.lineWidth = 7.5;
    ctx.stroke();
    // Inner filigree
    ctx.strokeStyle = '#7D4610';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Bronze belly (Bụng đỉnh đồng tam khí chạm nổi lưỡng long)
  const bellyGrad = ctx.createRadialGradient(cx - 20, 110, 12, cx, 122, 82);
  bellyGrad.addColorStop(0, '#FFF0A8');
  bellyGrad.addColorStop(0.42, '#CE9232');
  bellyGrad.addColorStop(0.82, '#7A4A15');
  bellyGrad.addColorStop(1, '#422407');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 124, 78, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFE89E';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Glowing ash bed at censer rim (Mặt tàn hương trầm nóng ấm)
  ctx.fillStyle = '#D6C4A6';
  ctx.beginPath();
  ctx.ellipse(cx, 86, 62, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9C6C21';
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // Embers glow & central golden medallion
  ctx.fillStyle = '#FFF8C8';
  ctx.beginPath();
  ctx.arc(cx, 124, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7E1C0A';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  return c;
}

function bakeTempleBell(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 240);
  const cx = 90;

  // Ironwood bell stand frame (Giá gỗ lim chạm hoa cúc)
  ctx.strokeStyle = '#611F0E';
  ctx.lineWidth = 11;
  ctx.strokeRect(18, 16, 144, 208);
  ctx.strokeStyle = '#E0AD45';
  ctx.lineWidth = 2.2;
  ctx.strokeRect(18, 16, 144, 208);

  // Dragon suspension loop (Quai chuông Bồ Lao hình rồng)
  ctx.strokeStyle = '#F2C358';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.arc(cx, 44, 16, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Bronze Bell body (Đại Hồng Chung đúc đồng cổ)
  const bellGrad = ctx.createLinearGradient(cx - 45, 48, cx + 45, 185);
  bellGrad.addColorStop(0, '#F7D476');
  bellGrad.addColorStop(0.48, '#B37C22');
  bellGrad.addColorStop(1, '#543409');
  ctx.fillStyle = bellGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 26, 54);
  ctx.quadraticCurveTo(cx - 44, 115, cx - 52, 176);
  ctx.lineTo(cx + 52, 176);
  ctx.quadraticCurveTo(cx + 44, 115, cx + 26, 54);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFF0AE';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Horizontal cast bronze inscription bands (Chỉ chuông đúc nổi minh văn)
  ctx.strokeStyle = '#472A07';
  ctx.lineWidth = 2;
  for (const by of [90, 132, 168]) {
    ctx.beginPath();
    ctx.moveTo(cx - 36, by);
    ctx.lineTo(cx + 36, by);
    ctx.stroke();
  }

  return c;
}

function bakeWoodenFish(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 130);
  const cx = 75;

  // Brocade cushion under wooden fish (Đệm gấm đỏ thếp kim nhung)
  ctx.fillStyle = '#9C2117';
  ctx.beginPath();
  ctx.roundRect(24, 82, 102, 28, 14);
  ctx.fill();
  ctx.strokeStyle = '#E8B954';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Carved wooden fish body (Mộc Ngư Sơn Mài Trác Tuyệt)
  const woodGrad = ctx.createRadialGradient(cx - 12, 52, 8, cx, 58, 46);
  woodGrad.addColorStop(0, '#E29748');
  woodGrad.addColorStop(0.68, '#964F1C');
  woodGrad.addColorStop(1, '#522508');
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 58, 44, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3E1903';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Acoustic resonant slit (Khe rãnh cộng hưởng âm thanh)
  ctx.fillStyle = '#1F0B02';
  ctx.beginPath();
  ctx.roundRect(cx - 28, 56, 52, 7, 3.5);
  ctx.fill();

  // Carved fish scales & eye motif (Mắt cá không nhắm biểu trưng tinh tấn)
  ctx.fillStyle = '#FFF2B2';
  ctx.beginPath();
  ctx.arc(cx - 22, 44, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3E1903';
  ctx.beginPath();
  ctx.arc(cx - 22, 44, 2, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

function bakeFloatingLantern(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 100);
  const cx = 60;
  const cy = 52;

  // Warm water reflection glow
  const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 52);
  glow.addColorStop(0, 'rgba(255, 245, 185, 0.98)');
  glow.addColorStop(0.48, 'rgba(255, 170, 95, 0.50)');
  glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.fill();

  // Green lotus leaf base
  ctx.fillStyle = '#266946';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lotus petals of lantern (Hoa đăng sen hồng xếp nếp)
  for (let i = -3; i <= 3; i++) {
    ctx.save();
    ctx.translate(cx + i * 8, cy + 6);
    ctx.rotate(i * 0.22);
    ctx.fillStyle = i % 2 === 0 ? '#FF82B0' : '#FFB5D0';
    ctx.beginPath();
    ctx.ellipse(0, -11, 9, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF0F6';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // Candle flame center
  const flame = ctx.createRadialGradient(cx, cy - 8, 2, cx, cy - 8, 12);
  flame.addColorStop(0, '#FFFFFF');
  flame.addColorStop(0.4, '#FFE66E');
  flame.addColorStop(1, 'rgba(255, 120, 30, 0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, 6, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

function bakeCushion(isVip: boolean): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 70);
  const cx = 75;
  const cy = 36;

  // Soft contact drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 62, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brocade cushion (Bồ đoàn gấm thêu sen)
  const g = ctx.createRadialGradient(cx, cy - 5, 8, cx, cy, 60);
  if (isVip) {
    g.addColorStop(0, '#FFF0A8');
    g.addColorStop(0.52, '#D19024');
    g.addColorStop(1, '#78380A');
  } else {
    g.addColorStop(0, '#C43D28');
    g.addColorStop(0.62, '#7A1B10');
    g.addColorStop(1, '#420D06');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 58, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isVip ? '#FFF4C2' : '#E5B24D';
  ctx.lineWidth = isVip ? 3.0 : 2.0;
  ctx.stroke();

  // Lotus embroidery motif in center
  ctx.strokeStyle = isVip ? 'rgba(255,255,255,0.7)' : 'rgba(255,220,130,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 18, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  return c;
}

function bakeSmokePuff(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(68, 68);
  const g = ctx.createRadialGradient(34, 34, 2, 34, 34, 32);
  g.addColorStop(0, 'rgba(255, 248, 230, 0.85)');
  g.addColorStop(0.48, 'rgba(240, 225, 200, 0.40)');
  g.addColorStop(1, 'rgba(220, 205, 175, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(34, 34, 32, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function bakeGoldSpark(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(24, 24);
  const g = ctx.createRadialGradient(12, 12, 1, 12, 12, 11);
  g.addColorStop(0, 'rgba(255, 255, 225, 1)');
  g.addColorStop(0.45, 'rgba(255, 218, 95, 0.75)');
  g.addColorStop(1, 'rgba(255, 185, 40, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(12, 12, 11, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function bakePetal(outerColor: string, innerColor: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(34, 34);
  ctx.translate(17, 17);
  const g = ctx.createLinearGradient(0, -13, 0, 13);
  g.addColorStop(0, innerColor);
  g.addColorStop(1, outerColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.bezierCurveTo(11, -6, 10, 10, 0, 13);
  ctx.bezierCurveTo(-10, 10, -11, -6, 0, -13);
  ctx.closePath();
  ctx.fill();
  return c;
}

function bakeOfferingIcon(kind: 'lotus' | 'lamp' | 'fruit' | 'dragon' | 'flowers'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(100, 100);
  const cx = 50;
  const cy = 50;

  const halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, 46);
  halo.addColorStop(0, 'rgba(255, 242, 175, 0.95)');
  halo.addColorStop(0.6, 'rgba(255, 192, 70, 0.40)');
  halo.addColorStop(1, 'rgba(255, 160, 30, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle =
    kind === 'dragon'
      ? '#FFD862'
      : kind === 'fruit'
        ? '#FFA352'
        : kind === 'lamp'
          ? '#FFE98E'
          : kind === 'flowers'
            ? '#FF7FA8'
            : '#FF94B8';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFF8D2';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.font = '700 28px "Noto Serif", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3D1206';
  const symbol =
    kind === 'dragon'
      ? '龍'
      : kind === 'fruit'
        ? '果'
        : kind === 'lamp'
          ? '燈'
          : kind === 'flowers'
            ? '花'
            : '蓮';
  ctx.fillText(symbol, cx, cy + 1);
  return c;
}

interface SkinPalette {
  robePrimary: string;
  robeSecondary: string;
  collarColor: string;
  trimGold: boolean;
  hairColor: string;
  hairStyle: 'bun' | 'short' | 'shaved' | 'tuft' | 'elder_bun';
  hasHalo: boolean;
  isMonkKasa: boolean;
}

const SKIN_PALETTES: Record<CharacterSkinId, SkinPalette> = {
  lam_female: {
    robePrimary: '#7E96B5',
    robeSecondary: '#546C8C',
    collarColor: '#E8F0FA',
    trimGold: false,
    hairColor: '#1A1410',
    hairStyle: 'bun',
    hasHalo: false,
    isMonkKasa: false
  },
  lam_male: {
    robePrimary: '#6E85A6',
    robeSecondary: '#475E80',
    collarColor: '#E8F0FA',
    trimGold: false,
    hairColor: '#1A1410',
    hairStyle: 'short',
    hasHalo: false,
    isMonkKasa: false
  },
  brown_elder: {
    robePrimary: '#82523C',
    robeSecondary: '#573322',
    collarColor: '#D4B5A5',
    trimGold: false,
    hairColor: '#D4CFC6',
    hairStyle: 'elder_bun',
    hasHalo: false,
    isMonkKasa: false
  },
  monk: {
    robePrimary: '#E09131',
    robeSecondary: '#A34316',
    collarColor: '#FFF2C2',
    trimGold: true,
    hairColor: '#2E231D',
    hairStyle: 'shaved',
    hasHalo: false,
    isMonkKasa: true
  },
  nun: {
    robePrimary: '#AD8150',
    robeSecondary: '#78552F',
    collarColor: '#E0C8B0',
    trimGold: false,
    hairColor: '#2E231D',
    hairStyle: 'shaved',
    hasHalo: false,
    isMonkKasa: false
  },
  child: {
    robePrimary: '#94AED0',
    robeSecondary: '#6680A2',
    collarColor: '#F0F6FF',
    trimGold: false,
    hairColor: '#1A1410',
    hairStyle: 'tuft',
    hasHalo: false,
    isMonkKasa: false
  },
  master_vip: {
    robePrimary: '#58739C',
    robeSecondary: '#364B6E',
    collarColor: '#FFEAA6',
    trimGold: true,
    hairColor: '#1A1410',
    hairStyle: 'bun',
    hasHalo: true,
    isMonkKasa: false
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
  const [c, ctx] = makeCanvas(168, 220);
  const pal = SKIN_PALETTES[skin];
  const cx = 84;
  const isChild = skin === 'child';
  if (isChild) {
    ctx.translate(cx, 208);
    ctx.scale(0.82, 0.82);
    ctx.translate(-cx, -208);
  }

  // VIP golden glow aura
  if (pal.hasHalo) {
    const aura = ctx.createRadialGradient(cx, 120, 10, cx, 120, 74);
    aura.addColorStop(0, 'rgba(255, 235, 155, 0.60)');
    aura.addColorStop(1, 'rgba(255, 190, 60, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, 120, 74, 0, Math.PI * 2);
    ctx.fill();
  }

  // Contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(cx, 202, pose === 'prostrateBow' ? 58 : 42, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  const robeGrad = ctx.createLinearGradient(cx - 44, 78, cx + 44, 198);
  robeGrad.addColorStop(0, pal.robePrimary);
  robeGrad.addColorStop(1, pal.robeSecondary);

  if (pose === 'prostrateBow') {
    // Ngũ thể đầu địa (Đảnh lễ Tam Bái phủ phục trang nghiêm)
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 172, 50, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.trimGold ? '#F5CB64' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Two reverent open hands touching the mat
    ctx.fillStyle = '#F5CEA6';
    ctx.beginPath();
    ctx.ellipse(cx - 28, 152, 9, 14, -0.32, 0, Math.PI * 2);
    ctx.ellipse(cx + 28, 152, 9, 14, 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Bowed head touching mat
    drawCharacterHead(ctx, cx, 142, pal);
    return c;
  }

  const headY =
    pose === 'walk1'
      ? 64
      : pose === 'walk2'
        ? 67
        : pose === 'kneelDown'
          ? 82
          : 86;
  const torsoTop = headY + 26;
  const torsoBottom = pose === 'walk1' || pose === 'walk2' ? 172 : 194;

  // Walking feet/legs
  if (pose === 'walk1' || pose === 'walk2') {
    const leftStep = pose === 'walk1' ? -6 : 6;
    ctx.fillStyle = pal.robeSecondary;
    ctx.beginPath();
    ctx.roundRect(cx - 22, 156 + leftStep, 16, 38, 7);
    ctx.roundRect(cx + 6, 156 - leftStep, 16, 38, 7);
    ctx.fill();
  } else {
    // Folded lotus meditation legs
    ctx.fillStyle = pal.robeSecondary;
    ctx.beginPath();
    ctx.ellipse(cx, 188, 46, 17, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main Robe Body (Áo tràng Phật tử truyền thống)
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 28, torsoTop);
  ctx.quadraticCurveTo(cx - 48, (torsoTop + torsoBottom) * 0.5, cx - 40, torsoBottom);
  ctx.lineTo(cx + 40, torsoBottom);
  ctx.quadraticCurveTo(cx + 48, (torsoTop + torsoBottom) * 0.5, cx + 28, torsoTop);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pal.trimGold ? '#F5CB64' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = pal.trimGold ? 2.8 : 1.6;
  ctx.stroke();

  // Monk Kasa drapery if monk
  if (pal.isMonkKasa) {
    ctx.fillStyle = '#C25219';
    ctx.beginPath();
    ctx.moveTo(cx - 26, torsoTop);
    ctx.quadraticCurveTo(cx - 10, torsoTop + 40, cx + 38, torsoBottom);
    ctx.lineTo(cx - 38, torsoBottom);
    ctx.closePath();
    ctx.fill();
  }

  // Collar V-Lapel (Cổ áo tràng truyền thống)
  ctx.strokeStyle = pal.collarColor;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cx - 12, torsoTop);
  ctx.lineTo(cx, torsoTop + 26);
  ctx.lineTo(cx + 12, torsoTop);
  ctx.stroke();

  // Hands in prayer (Chắp tay búp sen) or holding prayer beads
  const handsY = pose === 'prayHands' ? headY + 20 : torsoTop + 36;
  ctx.fillStyle = '#F5CEA6';
  ctx.beginPath();
  ctx.ellipse(cx, handsY, 10, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#995C2B';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Prayer beads (Chuỗi tràng hạt bồ đề)
  if (skin === 'lam_male' || skin === 'brown_elder' || skin === 'master_vip') {
    ctx.strokeStyle = '#633B19';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(cx, handsY + 12, 14, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Head & Hair
  drawCharacterHead(ctx, cx, headY, pal);

  return c;
}

function drawCharacterHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  pal: SkinPalette
): void {
  // Base head shape
  ctx.fillStyle = pal.hairStyle === 'shaved' ? '#ECC097' : pal.hairColor;
  ctx.beginPath();
  ctx.arc(cx, headY, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.40)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Hair bun or tuft details
  if (pal.hairStyle === 'bun' || pal.hairStyle === 'elder_bun') {
    ctx.fillStyle = pal.hairColor;
    ctx.beginPath();
    ctx.arc(cx, headY - 7, 12, 0, Math.PI * 2);
    ctx.fill();
    // Lotus hairpin
    ctx.fillStyle = pal.trimGold ? '#FFDB70' : '#F48FB1';
    ctx.beginPath();
    ctx.arc(cx + 9, headY - 10, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.hairStyle === 'tuft') {
    ctx.fillStyle = pal.hairColor;
    ctx.beginPath();
    ctx.arc(cx - 17, headY - 13, 8, 0, Math.PI * 2);
    ctx.arc(cx + 17, headY - 13, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
