import type { NormalizedLiveEvent, SimulatorStatus } from '../../shared/types.ts';
import { normalizeRawTikTokEvent } from '../router/eventNormalizer.ts';

export interface SimPersona {
  uniqueId: string;
  nickname: string;
  comments: readonly string[];
}

export const SIM_PERSONAS: readonly SimPersona[] = [
  {
    uniqueId: 'dieu.hanh.98',
    nickname: 'Diệu Hạnh Tâm An',
    comments: [
      'Nam mô A Di Đà Phật, con xin thắp hương cầu cho cha mẹ luôn mạnh khỏe bình an',
      'Cầu nguyện gia đình bốn mùa hòa thuận ấm êm',
      'nữ'
    ]
  },
  {
    uniqueId: 'minh.tam.dev',
    nickname: 'Trần Minh Tâm',
    comments: [
      'Con xin xăm đầu năm cầu công việc hanh thông thuận lợi',
      'Thắp hương kính lễ Đức Phật A Di Đà',
      'nam'
    ]
  },
  {
    uniqueId: 'hue.an.lotus',
    nickname: 'Nguyễn Huệ An',
    comments: [
      'Con xin thả đèn hoa đăng cầu bình an cho khắp đại chúng',
      'Tiếng chuông chùa nghe thanh tịnh quá, thỉnh chuông cầu an',
      'sư'
    ]
  },
  {
    uniqueId: 'quang.tri.88',
    nickname: 'Lê Quảng Trí',
    comments: [
      'Nam mô Bổn Sư Thích Ca Mâu Ni Phật, nguyện cầu thế giới hòa bình',
      'Con xin gieo quẻ đầu xuân tìm lời khuyên tích cực',
      '1'
    ]
  },
  {
    uniqueId: 'thanh.ha.zen',
    nickname: 'Phạm Thanh Hà',
    comments: [
      'Cầu cho các con học hành chăm ngoan, gia đạo an vui',
      'Thắp hương cầu bình an tháng mới',
      '2'
    ]
  },
  {
    uniqueId: 'tue.minh.vn',
    nickname: 'Vũ Tuệ Minh',
    comments: [
      'Mô Phật, đêm nay nhìn khói hương bay thấy lòng nhẹ nhàng quá',
      'Xin xăm cầu sức khỏe cho ông bà',
      'bà'
    ]
  },
  {
    uniqueId: 'bao.ngoc.sen',
    nickname: 'Đỗ Bảo Ngọc',
    comments: [
      'Con thành tâm dâng hương bái Phật, cầu vạn sự cát tường',
      'Nguyện cầu mọi người xem live đều an lạc hạnh phúc',
      'tiểu'
    ]
  },
  {
    uniqueId: 'hai.dang.hp',
    nickname: 'Hoàng Hải Đăng',
    comments: [
      'Thỉnh chuông Bát Nhã cầu tâm sáng trí minh',
      'Nam mô Đại Bi Quán Thế Âm Bồ Tát',
      'hộ pháp'
    ]
  }
];

const SIM_GIFTS = [
  { giftId: 'lotus_1', giftName: 'Hoa Sen Tinh Khiết', diamondCount: 1, giftType: 1 },
  { giftId: 'incense_5', giftName: 'Hương Trầm Bát Nhã', diamondCount: 5, giftType: 1 },
  { giftId: 'lamp_20', giftName: 'Đèn Lưu Ly Trí Tuệ', diamondCount: 20, giftType: 0 },
  { giftId: 'fruit_68', giftName: 'Mâm Ngũ Quả Cát Tường', diamondCount: 68, giftType: 0 },
  { giftId: 'dragon_299', giftName: 'Đại Lễ Kim Liên Hào Quang', diamondCount: 299, giftType: 0 }
] as const;

export class OfflineEventSimulator {
  private running = false;
  private scenario: SimulatorStatus['scenario'] = 'serene';
  private intervalMs = 3200;
  private eventsGenerated = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onEvent: (event: NormalizedLiveEvent) => void;

  constructor(onEvent: (event: NormalizedLiveEvent) => void) {
    this.onEvent = onEvent;
  }

  public getStatus(): SimulatorStatus {
    return {
      running: this.running,
      scenario: this.scenario,
      intervalMs: this.intervalMs,
      eventsGenerated: this.eventsGenerated
    };
  }

  public start(
    scenario: SimulatorStatus['scenario'] = 'serene',
    customIntervalMs?: number
  ): SimulatorStatus {
    this.stop();
    this.scenario = scenario;
    const defaultIntervals: Record<SimulatorStatus['scenario'], number> = {
      serene: 3600,
      busy: 1100,
      grand_festival: 750
    };
    this.intervalMs = customIntervalMs ?? defaultIntervals[scenario];
    this.running = true;

    this.stepOnce();
    this.timer = setInterval(() => this.stepOnce(), this.intervalMs);
    return this.getStatus();
  }

  public stop(): SimulatorStatus {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    return this.getStatus();
  }

  public stepOnce(): NormalizedLiveEvent {
    const persona = SIM_PERSONAS[this.eventsGenerated % SIM_PERSONAS.length];
    const roll = Math.random();
    let evt: NormalizedLiveEvent;

    if (this.scenario === 'grand_festival' && roll < 0.28) {
      const g = SIM_GIFTS[Math.min(SIM_GIFTS.length - 1, 2 + Math.floor(Math.random() * 3))];
      evt = normalizeRawTikTokEvent(
        'gift',
        {
          user: { uniqueId: persona.uniqueId, nickname: persona.nickname },
          giftId: g.giftId,
          giftName: g.giftName,
          diamondCount: g.diamondCount,
          repeatCount: 1,
          repeatEnd: true,
          giftType: g.giftType
        },
        'simulator'
      );
    } else if (roll < 0.52) {
      const comment =
        persona.comments[Math.floor(Math.random() * persona.comments.length)];
      evt = normalizeRawTikTokEvent(
        'chat',
        {
          user: { uniqueId: persona.uniqueId, nickname: persona.nickname },
          comment
        },
        'simulator'
      );
    } else if (roll < 0.76) {
      evt = normalizeRawTikTokEvent(
        'like',
        {
          user: { uniqueId: persona.uniqueId, nickname: persona.nickname },
          likeCount: 1 + Math.floor(Math.random() * 6)
        },
        'simulator'
      );
    } else if (roll < 0.88) {
      evt = normalizeRawTikTokEvent(
        'follow',
        {
          user: { uniqueId: persona.uniqueId, nickname: persona.nickname }
        },
        'simulator'
      );
    } else {
      const g = SIM_GIFTS[Math.floor(Math.random() * 3)];
      evt = normalizeRawTikTokEvent(
        'gift',
        {
          user: { uniqueId: persona.uniqueId, nickname: persona.nickname },
          giftId: g.giftId,
          giftName: g.giftName,
          diamondCount: g.diamondCount,
          repeatCount: 1 + Math.floor(Math.random() * 3),
          repeatEnd: true,
          giftType: g.giftType
        },
        'simulator'
      );
    }

    this.eventsGenerated++;
    this.onEvent(evt);
    return evt;
  }

  /**
   * Generates a deterministic or mixed burst of N events (e.g. 100 to 2000 events)
   * including streakable gift ticks, duplicate eventIds, spam strings, and rapid likes.
   */
  public runBurst(count: number): {
    generated: number;
    durationMs: number;
  } {
    const safeCount = Math.max(1, Math.min(5000, Math.round(count)));
    const t0 = performance.now();

    for (let i = 0; i < safeCount; i++) {
      const p = SIM_PERSONAS[i % SIM_PERSONAS.length];
      const mod = i % 10;

      if (mod < 5) {
        this.onEvent(
          normalizeRawTikTokEvent(
            'like',
            {
              user: { uniqueId: p.uniqueId, nickname: p.nickname },
              likeCount: 3
            },
            'simulator'
          )
        );
      } else if (mod < 8) {
        const text = p.comments[i % p.comments.length];
        this.onEvent(
          normalizeRawTikTokEvent(
            'chat',
            {
              user: { uniqueId: `${p.uniqueId}_${i % 24}`, nickname: p.nickname },
              comment: text
            },
            'simulator'
          )
        );
      } else if (mod === 8) {
        // Streakable gift intermediate tick followed by final tick
        const groupId = `burst_grp_${Math.floor(i / 10)}`;
        const isFinal = i % 20 === 18;
        this.onEvent(
          normalizeRawTikTokEvent(
            'gift',
            {
              user: { uniqueId: p.uniqueId, nickname: p.nickname },
              giftId: 'lotus_1',
              giftName: 'Hoa Sen Tinh Khiết',
              diamondCount: 5,
              repeatCount: isFinal ? 5 : 2,
              repeatEnd: isFinal,
              giftType: 1,
              groupId
            },
            'simulator'
          )
        );
      } else {
        this.onEvent(
          normalizeRawTikTokEvent(
            'follow',
            {
              user: { uniqueId: `${p.uniqueId}_${i % 30}`, nickname: p.nickname }
            },
            'simulator'
          )
        );
      }
      this.eventsGenerated++;
    }

    const durationMs = +(performance.now() - t0).toFixed(2);
    return { generated: safeCount, durationMs };
  }
}
