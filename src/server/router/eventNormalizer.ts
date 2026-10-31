import type {
  GiftTier,
  NormalizedLiveEvent,
  NormalizedUser,
  RawLiveEventType
} from '../../shared/types.ts';
import { sanitizeDisplayName } from './moderation.ts';

/**
 * Bounded LRU Deduplicator for Event IDs
 */
export class LruDeduplicator {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly seen: Map<string, number> = new Map();

  constructor(maxEntries = 5000, ttlMs = 10 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  public isDuplicate(eventId: string, now = Date.now()): boolean {
    if (!eventId) return false;
    const prevAt = this.seen.get(eventId);
    if (prevAt !== undefined && now - prevAt <= this.ttlMs) {
      return true;
    }
    if (this.seen.has(eventId)) {
      this.seen.delete(eventId);
    }
    this.seen.set(eventId, now);
    if (this.seen.size > this.maxEntries) {
      const oldestKey = this.seen.keys().next().value;
      if (oldestKey !== undefined) {
        this.seen.delete(oldestKey);
      }
    }
    return false;
  }

  public get size(): number {
    return this.seen.size;
  }

  public clear(): void {
    this.seen.clear();
  }
}

/**
 * Token Bucket Rate Limiter per event type
 */
export class TokenBucket {
  private readonly capacity: number;
  private readonly refillPerSec: number;
  private tokens: number;
  private lastRefillMs: number;

  constructor(capacity: number, refillPerSec: number, now = Date.now()) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.tokens = capacity;
    this.lastRefillMs = now;
  }

  public tryConsume(amount = 1, now = Date.now()): boolean {
    const elapsedSec = Math.max(0, (now - this.lastRefillMs) / 1000);
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSec);
    this.lastRefillMs = now;
    if (this.tokens >= amount) {
      this.tokens -= amount;
      return true;
    }
    return false;
  }
}

/**
 * Per-User Cooldown Tracker (Bounded Map)
 */
export class UserCooldownTracker {
  private readonly maxUsers: number;
  private readonly lastActionByUser: Map<string, number> = new Map();

  constructor(maxUsers = 2000) {
    this.maxUsers = maxUsers;
  }

  public checkAndRecord(userId: string, cooldownMs: number, now = Date.now()): boolean {
    if (!userId || cooldownMs <= 0) return true;
    const prev = this.lastActionByUser.get(userId);
    if (prev !== undefined && now - prev < cooldownMs) {
      return false;
    }
    this.lastActionByUser.delete(userId);
    this.lastActionByUser.set(userId, now);
    if (this.lastActionByUser.size > this.maxUsers) {
      const oldest = this.lastActionByUser.keys().next().value;
      if (oldest !== undefined) {
        this.lastActionByUser.delete(oldest);
      }
    }
    return true;
  }
}

/**
 * Gift Streak Tracker for streakable TikTok gifts (giftType === 1).
 * Prevents duplicate full ceremonies on intermediate combo ticks while emitting
 * lightweight streak progress updates, and finalizes either on repeatEnd=true
 * or after an inactivity timeout.
 */
export interface ActiveGiftStreak {
  key: string;
  event: NormalizedLiveEvent;
  lastCount: number;
  updatedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export class GiftStreakTracker {
  private readonly streaks: Map<string, ActiveGiftStreak> = new Map();
  private readonly streakTimeoutMs: number;
  private readonly onFinalize: (finalEvent: NormalizedLiveEvent) => void;
  private readonly onProgress?: (info: {
    userId: string;
    nickname: string;
    giftName: string;
    currentCount: number;
  }) => void;

  constructor(options: {
    streakTimeoutMs?: number;
    onFinalize: (finalEvent: NormalizedLiveEvent) => void;
    onProgress?: (info: {
      userId: string;
      nickname: string;
      giftName: string;
      currentCount: number;
    }) => void;
  }) {
    this.streakTimeoutMs = options.streakTimeoutMs ?? 4500;
    this.onFinalize = options.onFinalize;
    this.onProgress = options.onProgress;
  }

  public handleGiftEvent(event: NormalizedLiveEvent): void {
    const gift = event.gift;
    if (!gift) return;

    // Non-streakable gifts (giftType !== 1) or already ended streaks
    if (gift.giftType !== 1) {
      this.onFinalize(event);
      return;
    }

    const key = `${event.user.id}::${gift.giftId}::${gift.groupId || 'default'}`;
    const existing = this.streaks.get(key);
    const highestCount = Math.max(gift.repeatCount, existing?.lastCount ?? 0);

    const updatedEvent: NormalizedLiveEvent = {
      ...event,
      gift: {
        ...gift,
        repeatCount: highestCount,
        totalDiamonds: Math.max(1, gift.diamondCount) * highestCount,
        tier: classifyGiftTier(Math.max(1, gift.diamondCount) * highestCount)
      }
    };

    if (gift.repeatEnd) {
      if (existing?.timer) {
        clearTimeout(existing.timer);
      }
      this.streaks.delete(key);
      this.onFinalize(updatedEvent);
      return;
    }

    // Intermediate streak tick
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    if (this.onProgress) {
      this.onProgress({
        userId: event.user.id,
        nickname: event.user.nickname,
        giftName: gift.giftName,
        currentCount: highestCount
      });
    }

    const timer = setTimeout(() => {
      const pending = this.streaks.get(key);
      if (pending) {
        this.streaks.delete(key);
        this.onFinalize(pending.event);
      }
    }, this.streakTimeoutMs);

    this.streaks.set(key, {
      key,
      event: updatedEvent,
      lastCount: highestCount,
      updatedAt: Date.now(),
      timer
    });
  }

  public get activeCount(): number {
    return this.streaks.size;
  }

  public flushAll(): void {
    for (const [, entry] of this.streaks) {
      if (entry.timer) clearTimeout(entry.timer);
      this.onFinalize(entry.event);
    }
    this.streaks.clear();
  }
}

/**
 * Like Batch Aggregator: coalesces high-frequency like events into bounded batches
 * so 500 likes/sec never spawns 500 separate DOM/canvas animations.
 */
export class LikeBatchAggregator {
  private readonly windowMs: number;
  private readonly onFlush: (batch: {
    count: number;
    users: Array<{ id: string; nickname: string }>;
  }) => void;
  private pendingCount = 0;
  private pendingUsers: Map<string, string> = new Map();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    windowMs: number,
    onFlush: (batch: { count: number; users: Array<{ id: string; nickname: string }> }) => void
  ) {
    this.windowMs = windowMs;
    this.onFlush = onFlush;
  }

  public addLike(user: NormalizedUser, likeCount: number): void {
    const clamped = Math.max(1, Math.min(25, Math.round(likeCount || 1)));
    this.pendingCount += clamped;
    if (this.pendingUsers.size < 8) {
      this.pendingUsers.set(user.id, user.nickname);
    }
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.windowMs);
    }
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingCount <= 0) return;
    const count = this.pendingCount;
    const users = Array.from(this.pendingUsers.entries()).map(([id, nickname]) => ({
      id,
      nickname
    }));
    this.pendingCount = 0;
    this.pendingUsers.clear();
    this.onFlush({ count, users });
  }
}

export function classifyGiftTier(totalDiamonds: number): GiftTier {
  if (totalDiamonds >= 200) return 4;
  if (totalDiamonds >= 50) return 3;
  if (totalDiamonds >= 10) return 2;
  return 1;
}

export function extractNormalizedUser(raw: Record<string, any> | undefined | null): NormalizedUser {
  const u = (raw?.user as Record<string, any>) || raw || {};
  const rawUniqueId = String(
    u.uniqueId || u.displayId || u.userId || u.id || raw?.uniqueId || 'khach_huu_duyen'
  )
    .trim()
    .slice(0, 48);
  const nickname = sanitizeDisplayName(u.nickname || u.uniqueId || u.displayId || raw?.nickname);
  const avatarUrl = String(
    u.profilePictureUrl ||
      u.profilePicture?.url?.[0] ||
      u.profilePicture?.urls?.[0] ||
      u.profilePicture?.urlList?.[0] ||
      u.avatarThumb?.urlList?.[0] ||
      u.avatarThumb?.url?.[0] ||
      u.avatarLarge?.urlList?.[0] ||
      raw?.avatarUrl ||
      ''
  ).slice(0, 400);

  return {
    id: rawUniqueId.toLowerCase().replace(/[^a-z0-9._-]/g, '_') || 'anon',
    uniqueId: rawUniqueId,
    nickname,
    avatarUrl
  };
}

let seqCounter = 0;

export function normalizeRawTikTokEvent(
  type: RawLiveEventType,
  raw: Record<string, any>,
  source: 'tiktok' | 'simulator' | 'admin' = 'tiktok'
): NormalizedLiveEvent {
  const now = Date.now();
  const user = extractNormalizedUser(raw);
  const rawMsgId =
    raw?.common?.msgId ||
    raw?.msgId ||
    raw?.eventId ||
    (type === 'gift'
      ? `${user.id}_${raw?.giftId || raw?.gift?.id || 'g'}_${raw?.groupId || ''}_${raw?.repeatCount || 1}_${raw?.repeatEnd ? 'end' : 'tick'}`
      : `${type}_${user.id}_${now}_${++seqCounter}`);

  const base: NormalizedLiveEvent = {
    eventId: String(rawMsgId),
    type,
    timestamp: now,
    source,
    user
  };

  if (type === 'chat') {
    base.comment = String(raw?.comment ?? raw?.content ?? '').slice(0, 200);
  } else if (type === 'like') {
    base.likeCount = Math.max(1, Math.min(100, Number(raw?.likeCount ?? raw?.count ?? 1)));
    base.totalLikes = Number(raw?.totalLikeCount ?? raw?.total ?? 0);
  } else if (type === 'gift') {
    const giftObj = (raw?.gift as Record<string, any>) || (raw?.giftDetails as Record<string, any>) || {};
    const giftId = String(raw?.giftId ?? giftObj.id ?? 'lotus');
    const giftName = String(
      giftObj.name ??
        giftObj.giftName ??
        raw?.giftName ??
        raw?.extendedGiftInfo?.name ??
        'Hoa Sen Tịnh Tâm'
    ).slice(0, 48);
    const diamondCount = Math.max(
      1,
      Number(
        giftObj.diamondCount ??
          raw?.diamondCount ??
          raw?.extendedGiftInfo?.diamond_count ??
          1
      )
    );
    const repeatCount = Math.max(1, Math.min(9999, Number(raw?.repeatCount ?? raw?.comboCount ?? 1)));
    const giftType = Number(giftObj.type ?? giftObj.giftType ?? raw?.giftType ?? 0);
    const repeatEnd = Boolean(raw?.repeatEnd ?? giftType !== 1);
    const groupId = String(raw?.groupId ?? `${user.id}_${giftId}`);
    const totalDiamonds = diamondCount * repeatCount;
    base.gift = {
      giftId,
      giftName,
      diamondCount,
      repeatCount,
      repeatEnd,
      giftType,
      groupId,
      totalDiamonds,
      tier: classifyGiftTier(totalDiamonds)
    };
  } else if (type === 'viewerCount') {
    base.viewerCount = Math.max(0, Number(raw?.viewerCount ?? raw?.total ?? 0));
  }

  return base;
}
