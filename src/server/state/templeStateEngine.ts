import {
  BUDDHIST_CHANTS,
  DEFAULT_SKIN_CYCLE,
  DEFAULT_WISHES,
  FORTUNE_STICKS_DECK
} from '../../shared/constants.ts';
import type {
  CharacterSkinId,
  ClientPerfReport,
  CommunityGoalState,
  ConnectorStatus,
  DispatchedRitual,
  EventActionRule,
  FloatingLanternItem,
  FortuneStick,
  GiftTier,
  LivePollState,
  NormalizedLiveEvent,
  NormalizedUser,
  OfferingKind,
  PrayerRegistryItem,
  QueueMetrics,
  RitualActionType,
  SeatedViewer,
  SimulatorStatus,
  TempleSettings,
  TempleStateSnapshot
} from '../../shared/types.ts';
import { getVietnameseLunarInfo } from '../utils/lunarCalendar.ts';
import type { PriorityTtsService } from '../audio/ttsService.ts';
import type { PersistedTotals, SqlitePersistenceStore } from '../persistence/sqliteStore.ts';
import {
  GiftStreakTracker,
  LikeBatchAggregator,
  LruDeduplicator,
  TokenBucket,
  UserCooldownTracker,
  classifyGiftTier
} from '../router/eventNormalizer.ts';
import {
  matchSkinKeyword,
  moderateAndSanitizeComment,
  sanitizeDisplayName,
  sanitizeSpokenName
} from '../router/moderation.ts';
import { DynamicRuleEngine } from '../router/ruleEngine.ts';
import { SIM_PERSONAS } from '../simulator/offlineSimulator.ts';

const SEAT_CAPS = [24, 36, 64, 100] as const;

export class TempleStateEngine {
  private readonly store: SqlitePersistenceStore;
  private readonly tts: PriorityTtsService;
  private readonly ruleEngine: DynamicRuleEngine;
  private readonly deduper = new LruDeduplicator(5000, 10 * 60 * 1000);
  private readonly userCooldowns = new UserCooldownTracker(2000);
  private readonly giftStreaks: GiftStreakTracker;
  private readonly likeBatcher: LikeBatchAggregator;
  private readonly buckets: Record<string, TokenBucket>;

  private settings: TempleSettings;
  private totals: PersistedTotals;
  private readonly startedAt = Date.now();
  private readonly viewers: Map<string, SeatedViewer> = new Map();
  private readonly lanterns: FloatingLanternItem[] = [];
  private readonly prayers: PrayerRegistryItem[] = [];
  private readonly recentRituals: DispatchedRitual[] = [];
  private readonly clientPerfMap: Map<string, ClientPerfReport> = new Map();

  private communityGoal: CommunityGoalState = {
    id: 'goal_incense_108',
    title: 'Đại Nguyện 108 Nén Tâm Hương — Khai Mở Đại Lễ Hoa Đăng',
    metric: 'incense',
    currentValue: 27,
    targetValue: 108,
    completedCount: 0,
    rewardAction: 'GRAND_CEREMONY'
  };

  private poll: LivePollState = {
    active: true,
    question: 'Đại chúng tâm nguyện điều gì nhất trong buổi lễ hôm nay?',
    options: [
      { id: 'opt_1', keyword: '1', label: '1 · Gia đạo bình an, cha mẹ mạnh khỏe', votes: 12 },
      { id: 'opt_2', keyword: '2', label: '2 · Tâm an trí sáng, muộn phiền tiêu tan', votes: 9 },
      { id: 'opt_3', keyword: '3', label: '3 · Công việc hanh thông, thiện duyên hội tụ', votes: 7 }
    ],
    totalVotes: 28,
    startedAt: Date.now()
  };
  private readonly pollVotedUsers: Set<string> = new Set();

  private eventsAcceptedTotal = 0;
  private eventsDeduplicatedTotal = 0;
  private eventsRateLimitedTotal = 0;
  private eventsModeratedTotal = 0;
  private ritualSeq = 0;
  private chantIndex = 0;
  private chantTimer: ReturnType<typeof setInterval> | null = null;

  private readonly onRitualCallback?: (
    ritual: DispatchedRitual,
    totals: PersistedTotals,
    goal: CommunityGoalState
  ) => void;
  private readonly onLikeBatchCallback?: (batch: {
    count: number;
    totalWoodenFish: number;
    users: Array<{ id: string; nickname: string }>;
  }) => void;
  private readonly onStreakProgressCallback?: (info: {
    userId: string;
    nickname: string;
    giftName: string;
    currentCount: number;
  }) => void;
  private readonly onPrayerCallback?: (prayer: PrayerRegistryItem) => void;
  private readonly onStateChangedCallback?: () => void;

  constructor(options: {
    store: SqlitePersistenceStore;
    tts: PriorityTtsService;
    onRitual?: (
      ritual: DispatchedRitual,
      totals: PersistedTotals,
      goal: CommunityGoalState
    ) => void;
    onLikeBatch?: (batch: {
      count: number;
      totalWoodenFish: number;
      users: Array<{ id: string; nickname: string }>;
    }) => void;
    onStreakProgress?: (info: {
      userId: string;
      nickname: string;
      giftName: string;
      currentCount: number;
    }) => void;
    onPrayer?: (prayer: PrayerRegistryItem) => void;
    onStateChanged?: () => void;
  }) {
    this.store = options.store;
    this.tts = options.tts;
    this.onRitualCallback = options.onRitual;
    this.onLikeBatchCallback = options.onLikeBatch;
    this.onStreakProgressCallback = options.onStreakProgress;
    this.onPrayerCallback = options.onPrayer;
    this.onStateChangedCallback = options.onStateChanged;

    this.settings = this.store.loadSettings();
    this.totals = this.store.loadTotals();
    this.communityGoal.currentValue = this.totals.incenseBurned;
    this.ruleEngine = new DynamicRuleEngine(this.store.loadRules());
    this.prayers = this.store.loadRecentPrayers(40);

    // Restore persisted viewers or seed initial serene congregation so the hall looks alive immediately
    const savedViewers = this.store.loadTopViewers(48);
    if (savedViewers.length > 0) {
      for (const v of savedViewers) {
        this.viewers.set(v.id, v);
      }
    } else {
      this.seedDemoCongregation(12);
    }

    // Seed initial floating lanterns
    for (let i = 0; i < 4; i++) {
      const p = SIM_PERSONAS[i % SIM_PERSONAS.length];
      this.lanterns.push({
        id: `lantern_init_${i}`,
        userId: p.uniqueId,
        nickname: p.nickname,
        wishText: DEFAULT_WISHES[i % DEFAULT_WISHES.length],
        createdAt: Date.now() - i * 15000
      });
    }

    this.buckets = {
      chat: new TokenBucket(25, 14),
      like: new TokenBucket(60, 40),
      follow: new TokenBucket(15, 6),
      share: new TokenBucket(15, 6),
      join: new TokenBucket(15, 6),
      gift: new TokenBucket(40, 25)
    };

    this.giftStreaks = new GiftStreakTracker({
      streakTimeoutMs: 4200,
      onFinalize: (finalEvent) => this.processFinalizedGift(finalEvent),
      onProgress: (info) => this.onStreakProgressCallback?.(info)
    });

    this.likeBatcher = new LikeBatchAggregator(550, (batch) => {
      this.totals.woodenFishHits += batch.count;
      this.totals.meritPoints += batch.count;
      this.store.saveTotals(this.totals);
      this.onLikeBatchCallback?.({
        count: batch.count,
        totalWoodenFish: this.totals.woodenFishHits,
        users: batch.users
      });
    });

    this.reschedulePeriodicChant();
  }

  public computeSeatCapacity(): number {
    if (this.settings.seatCapacityMode !== 'auto') {
      return Number(this.settings.seatCapacityMode) || 24;
    }
    const count = this.viewers.size;
    return SEAT_CAPS.find((c) => count <= c) ?? 100;
  }

  private recomputeSeatingAndVipRanks(): void {
    const all = [...this.viewers.values()].sort(
      (a, b) => b.meritPoints - a.meritPoints || a.joinedAt - b.joinedAt
    );
    all.forEach((v, idx) => {
      v.seatIndex = idx;
      v.isVip = idx < 6 && v.meritPoints > 0;
      v.vipRank = v.isVip ? idx + 1 : 0;
    });
  }

  public ensureSeatedViewer(
    user: NormalizedUser,
    opts?: {
      skin?: CharacterSkinId;
      isDemo?: boolean;
      meritDelta?: number;
      incenseDelta?: number;
      giftDelta?: number;
      diamondsDelta?: number;
      wishText?: string;
    }
  ): SeatedViewer {
    const now = Date.now();
    let v = this.viewers.get(user.id);

    if (!v) {
      // Evict oldest inactive non-donor if at capacity 100
      if (this.viewers.size >= 100) {
        const candidates = [...this.viewers.values()]
          .filter((x) => x.giftsCount === 0)
          .sort((a, b) => a.lastActiveAt - b.lastActiveAt);
        const evict = candidates[0] ?? [...this.viewers.values()][0];
        if (evict) {
          this.viewers.delete(evict.id);
        }
      }

      const defaultSkin =
        opts?.skin ?? DEFAULT_SKIN_CYCLE[this.viewers.size % DEFAULT_SKIN_CYCLE.length];
      v = {
        id: user.id,
        uniqueId: user.uniqueId,
        nickname: sanitizeDisplayName(user.nickname),
        avatarUrl: user.avatarUrl || '',
        skin: defaultSkin,
        seatIndex: this.viewers.size,
        isVip: false,
        vipRank: 0,
        meritPoints: 0,
        incenseCount: 0,
        giftsCount: 0,
        diamondsTotal: 0,
        lastWish: '',
        joinedAt: now,
        lastActiveAt: now,
        isDemo: Boolean(opts?.isDemo)
      };
      this.viewers.set(v.id, v);
    }

    v.nickname = sanitizeDisplayName(user.nickname || v.nickname);
    if (user.avatarUrl) v.avatarUrl = user.avatarUrl;
    if (opts?.skin) v.skin = opts.skin;
    v.lastActiveAt = now;

    if (opts?.meritDelta) v.meritPoints += opts.meritDelta;
    if (opts?.incenseDelta) v.incenseCount += opts.incenseDelta;
    if (opts?.giftDelta) v.giftsCount += opts.giftDelta;
    if (opts?.diamondsDelta) v.diamondsTotal += opts.diamondsDelta;
    if (opts?.wishText) v.lastWish = opts.wishText;

    this.recomputeSeatingAndVipRanks();
    if (!v.isDemo) {
      this.store.upsertViewer(v);
    }
    return v;
  }

  public ingestEvent(event: NormalizedLiveEvent): DispatchedRitual | null {
    if (event.type === 'viewerCount' || event.type === 'streamEnd') {
      return null;
    }

    // 1. Deduplication check
    if (this.deduper.isDuplicate(event.eventId, event.timestamp)) {
      this.eventsDeduplicatedTotal++;
      return null;
    }

    // 2. Token bucket check per event type
    const bucket = this.buckets[event.type];
    if (bucket && !bucket.tryConsume(1, event.timestamp)) {
      this.eventsRateLimitedTotal++;
      return null;
    }

    // 3. Special handling for Likes (batched)
    if (event.type === 'like') {
      this.eventsAcceptedTotal++;
      this.ensureSeatedViewer(event.user, { meritDelta: 1 });
      this.likeBatcher.addLike(event.user, event.likeCount ?? 1);
      return null;
    }

    // 4. Special handling for Gifts (streak tracker)
    if (event.type === 'gift') {
      this.eventsAcceptedTotal++;
      this.giftStreaks.handleGiftEvent(event);
      return null;
    }

    // 5. Member enter
    if (event.type === 'join') {
      if (!this.settings.joinOnMemberEnter) return null;
      this.eventsAcceptedTotal++;
      const v = this.ensureSeatedViewer(event.user, { meritDelta: 1 });
      return this.dispatchRitual({
        actionType: 'TAM_QUAN_ENTER',
        priority: 25,
        ruleId: 'builtin_member_join',
        ruleName: 'Bước Qua Tam Quan',
        user: event.user,
        skin: v.skin,
        wishText: 'Đã bước qua Tam Quan, vào Chánh Điện tĩnh tâm',
        meritAwarded: 1
      });
    }

    // 6. Follow / Share
    if (event.type === 'follow' || event.type === 'share') {
      if (!this.userCooldowns.checkAndRecord(event.user.id, 3000, event.timestamp)) {
        this.eventsRateLimitedTotal++;
        return null;
      }
      this.eventsAcceptedTotal++;
      const matched = this.ruleEngine.evaluateFirstMatch(event, event.timestamp);
      const merit = matched?.rule.actionParams.meritBase ?? 12;
      const v = this.ensureSeatedViewer(event.user, { meritDelta: merit });
      this.totals.bellRings += 1;
      this.totals.meritPoints += merit;
      this.store.saveTotals(this.totals);

      return this.dispatchRitual({
        actionType: matched?.rule.actionType ?? 'RING_BELL',
        priority: matched?.rule.priority ?? 65,
        ruleId: matched?.rule.id ?? 'builtin_social_bell',
        ruleName: matched?.rule.name ?? 'Thỉnh Chuông Chào Mừng',
        user: event.user,
        skin: v.skin,
        bellIntensity: 1.0,
        wishText:
          event.type === 'follow'
            ? 'Hữu duyên theo dõi Chánh Điện, cầu bình an cát tường'
            : 'Chia sẻ ánh sáng thiện lành tới đại chúng',
        meritAwarded: merit
      });
    }

    // 7. Chat comment moderation & routing
    if (event.type === 'chat') {
      const mod = moderateAndSanitizeComment(event.comment, this.settings.moderationEnabled);
      if (!mod.allowed) {
        this.eventsModeratedTotal++;
        return null;
      }

      if (
        !this.userCooldowns.checkAndRecord(
          event.user.id,
          this.settings.userCooldownMs,
          event.timestamp
        )
      ) {
        this.eventsRateLimitedTotal++;
        return null;
      }

      this.eventsAcceptedTotal++;
      const cleanComment = mod.cleanedText;
      const normalizedEvent: NormalizedLiveEvent = {
        ...event,
        comment: cleanComment
      };

      // Check outfit change command (<= 3 words)
      const skinChoice = matchSkinKeyword(cleanComment);
      if (skinChoice) {
        const v = this.ensureSeatedViewer(event.user, {
          skin: skinChoice,
          meritDelta: 2
        });
        this.totals.meritPoints += 2;
        this.store.saveTotals(this.totals);
        return this.dispatchRitual({
          actionType: 'CHANGE_SKIN',
          priority: 50,
          ruleId: 'builtin_skin_change',
          ruleName: 'Đổi Trang Phục Phật Tử',
          user: event.user,
          skin: v.skin,
          wishText: `Đổi trang phục: ${cleanComment}`,
          meritAwarded: 2
        });
      }

      // Check active Live Poll vote ("1", "2", "3")
      if (this.poll.active) {
        const trimmedLower = cleanComment.toLowerCase().trim();
        const option = this.poll.options.find(
          (o) => trimmedLower === o.keyword.toLowerCase() || trimmedLower.startsWith(o.keyword.toLowerCase() + ' ')
        );
        if (option && !this.pollVotedUsers.has(event.user.id)) {
          this.pollVotedUsers.add(event.user.id);
          option.votes += 1;
          this.poll.totalVotes += 1;
          const v = this.ensureSeatedViewer(event.user, {
            meritDelta: 5,
            wishText: option.label
          });
          this.totals.meritPoints += 5;
          this.store.saveTotals(this.totals);
          return this.dispatchRitual({
            actionType: 'CAST_POLL_VOTE',
            priority: 60,
            ruleId: 'builtin_poll_vote',
            ruleName: 'Bình Chọn Tâm Nguyện',
            user: event.user,
            skin: v.skin,
            pollOptionId: option.id,
            wishText: option.label,
            meritAwarded: 5
          });
        }
      }

      // Evaluate dynamic IFTTT rules
      const match = this.ruleEngine.evaluateFirstMatch(normalizedEvent, event.timestamp);
      if (match) {
        return this.executeMatchedRule(match.rule, normalizedEvent);
      }

      // Default chat action: Seat & burn 1 incense stick with prayer bubble
      const v = this.ensureSeatedViewer(event.user, {
        meritDelta: 5,
        incenseDelta: 1,
        wishText: cleanComment
      });
      this.totals.incenseBurned += 1;
      this.totals.meritPoints += 5;
      this.advanceCommunityGoal('incense', 1);
      this.store.saveTotals(this.totals);
      this.recordPrayer(event.user, cleanComment, 5);

      return this.dispatchRitual({
        actionType: 'BURN_INCENSE',
        priority: 55,
        ruleId: 'default_chat_incense',
        ruleName: 'Dâng Tâm Hương',
        user: event.user,
        skin: v.skin,
        incenseCount: 1,
        wishText: cleanComment,
        meritAwarded: 5
      });
    }

    return null;
  }

  public recordPrayer(user: NormalizedUser, wishText: string, merit = 5): PrayerRegistryItem {
    const masked = String(wishText || '')
      .replace(/\b(0\d{9,10}|\+84\d{9,10})\b/g, '***')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***');

    const lower = masked.toLowerCase();
    let category: PrayerRegistryItem['category'] = 'BÌNH AN';
    if (lower.includes('sức khỏe') || lower.includes('bệnh') || lower.includes('chữa') || lower.includes('thuốc')) {
      category = 'SỨC KHỎE';
    } else if (lower.includes('cầu siêu') || lower.includes('hương linh') || lower.includes('vãng sanh') || lower.includes('quá vãng')) {
      category = 'CẦU SIÊU';
    } else if (lower.includes('trí tuệ') || lower.includes('học') || lower.includes('thi') || lower.includes('sáng suốt')) {
      category = 'TRÍ TUỆ';
    } else if (lower.includes('hồi hướng') || lower.includes('công đức') || lower.includes('tam bảo')) {
      category = 'HỒI HƯỚNG';
    }

    const item: PrayerRegistryItem = {
      id: `prayer_${Date.now()}_${++this.ritualSeq}`,
      userId: user.id,
      nickname: user.nickname,
      wishText: masked,
      category,
      meritAwarded: merit,
      createdAt: Date.now()
    };
    this.prayers.unshift(item);
    if (this.prayers.length > 50) this.prayers.length = 50;
    this.store.logPrayer(item);
    if (this.onPrayerCallback) {
      this.onPrayerCallback(item);
    }
    return item;
  }

  private processFinalizedGift(event: NormalizedLiveEvent): DispatchedRitual | null {
    const gift = event.gift;
    if (!gift) return null;

    const totalDiamonds = gift.totalDiamonds;
    const tier: GiftTier = classifyGiftTier(totalDiamonds);
    const offeringKind: OfferingKind =
      tier === 4 ? 'dragon' : tier === 3 ? 'fruit' : tier === 2 ? 'lamp' : 'lotus';
    const incenseAdded = tier >= 4 ? 9 : tier === 3 ? 6 : 3;
    const meritAwarded = Math.max(15, totalDiamonds * (tier >= 4 ? 25 : 15));

    const existingViewer = this.viewers.get(event.user.id);
    const recentWish =
      existingViewer?.lastWish && Date.now() - existingViewer.lastActiveAt < 120_000
        ? existingViewer.lastWish
        : DEFAULT_WISHES[Math.floor(Math.random() * DEFAULT_WISHES.length)];

    const v = this.ensureSeatedViewer(event.user, {
      skin: tier >= 4 ? 'master_vip' : undefined,
      meritDelta: meritAwarded,
      incenseDelta: incenseAdded,
      giftDelta: gift.repeatCount,
      diamondsDelta: totalDiamonds,
      wishText: recentWish
    });

    this.totals.meritPoints += meritAwarded;
    this.totals.incenseBurned += incenseAdded;
    this.totals.offerings[offeringKind] = (this.totals.offerings[offeringKind] || 0) + 1;
    if (tier >= 3) {
      this.totals.bellRings += 1;
    }
    this.advanceCommunityGoal('incense', incenseAdded);
    this.store.saveTotals(this.totals);

    const displayGiftName =
      gift.repeatCount > 1 ? `${gift.giftName} ×${gift.repeatCount}` : gift.giftName;
    const spokenUser = sanitizeSpokenName(v.nickname);
    const ttsText = `Nam mô A Di Đà Phật. Cảm tạ Phật tử ${spokenUser} thành tâm dâng ${displayGiftName}. ${recentWish}.`;

    if (this.settings.ttsEnabled && totalDiamonds >= this.settings.ttsMinGiftDiamonds) {
      this.tts.enqueue({
        userId: v.id,
        text: ttsText,
        voice: this.settings.ttsVoice,
        ratePercent: this.settings.ttsRatePercent,
        pitchHz: this.settings.ttsPitchHz,
        priority: tier >= 4 ? 110 : 100,
        ttlMs: 300_000
      });
    }

    this.recordPrayer(event.user, recentWish, meritAwarded);

    return this.dispatchRitual({
      actionType: tier >= 4 ? 'GRAND_CEREMONY' : 'OFFER_GIFT',
      priority: tier >= 4 ? 110 : 95,
      ruleId: tier >= 4 ? 'rule_grand_gift' : 'rule_standard_gift',
      ruleName: tier >= 4 ? 'Đại Lễ Hào Quang Kim Liên' : 'Dâng Lễ Vật Tam Bảo',
      user: event.user,
      skin: v.skin,
      wishText: recentWish,
      incenseCount: incenseAdded,
      offeringKind,
      giftName: displayGiftName,
      giftCount: gift.repeatCount,
      diamonds: totalDiamonds,
      giftTier: tier,
      meritAwarded,
      ttsText
    });
  }

  private executeMatchedRule(
    rule: EventActionRule,
    event: NormalizedLiveEvent
  ): DispatchedRitual {
    const wish =
      event.comment ||
      DEFAULT_WISHES[Math.floor(Math.random() * DEFAULT_WISHES.length)];
    const merit = rule.actionParams.meritBase ?? 10;
    const incenseCount = rule.actionParams.incenseCount ?? 1;

    let actionType = rule.actionType;
    let ruleName = rule.name;
    let fortune: FortuneStick | undefined;

    if (actionType === 'DRAW_FORTUNE') {
      if (this.settings.fortuneEnabled) {
        fortune = FORTUNE_STICKS_DECK[Math.floor(Math.random() * FORTUNE_STICKS_DECK.length)];
        this.totals.fortunesDrawn += 1;
      } else {
        // Fallback when cultural fortune is disabled in settings: transform into incense prayer
        actionType = 'BURN_INCENSE';
        ruleName = 'Dâng Hương Tịnh Tâm';
      }
    } else if (actionType === 'OFFER_FLOWERS') {
      this.totals.offerings.lotus = (this.totals.offerings.lotus || 0) + 1;
      this.recordPrayer(event.user, wish, merit);
    } else if (actionType === 'RELEASE_LANTERN') {
      this.totals.lanternsReleased += 1;
      this.totals.incenseBurned += incenseCount;
      this.lanterns.unshift({
        id: `lantern_${Date.now()}_${++this.ritualSeq}`,
        userId: event.user.id,
        nickname: event.user.nickname,
        wishText: wish,
        createdAt: Date.now()
      });
      if (this.lanterns.length > 24) {
        this.lanterns.length = 24;
      }
      this.advanceCommunityGoal('incense', incenseCount);
      this.recordPrayer(event.user, wish, merit);
    } else if (actionType === 'BURN_INCENSE') {
      this.totals.incenseBurned += incenseCount;
      this.advanceCommunityGoal('incense', incenseCount);
      this.recordPrayer(event.user, wish, merit);
    } else if (actionType === 'RING_BELL') {
      this.totals.bellRings += 1;
    } else if (actionType === 'STRIKE_WOODEN_FISH') {
      const hits = rule.actionParams.woodenFishCount ?? 3;
      this.totals.woodenFishHits += hits;
    }

    this.totals.meritPoints += merit;
    this.store.saveTotals(this.totals);

    const v = this.ensureSeatedViewer(event.user, {
      meritDelta: merit,
      incenseDelta:
        rule.actionType === 'BURN_INCENSE' || rule.actionType === 'RELEASE_LANTERN'
          ? incenseCount
          : 0,
      wishText: fortune ? `Quẻ số ${fortune.number}: ${fortune.rank}` : wish
    });

    let ttsText: string | undefined;
    const shouldReadTts =
      this.settings.ttsEnabled &&
      Boolean(rule.actionParams.readTts) &&
      (rule.actionType !== 'DRAW_FORTUNE' || this.settings.ttsReadFortunes) &&
      (rule.actionType !== 'RELEASE_LANTERN' || this.settings.ttsReadPrayers);

    if (shouldReadTts && rule.actionParams.ttsTemplate) {
      ttsText = DynamicRuleEngine.interpolateTemplate(rule.actionParams.ttsTemplate, {
        nickname: v.nickname,
        wish,
        merit,
        fortune
      });
      this.tts.enqueue({
        userId: v.id,
        text: ttsText,
        voice: this.settings.ttsVoice,
        ratePercent: this.settings.ttsRatePercent,
        pitchHz: this.settings.ttsPitchHz,
        priority: rule.priority,
        ttlMs: 90_000
      });
    }

    return this.dispatchRitual({
      actionType,
      priority: rule.priority,
      ruleId: rule.id,
      ruleName,
      user: event.user,
      skin: v.skin,
      wishText: wish,
      incenseCount,
      offeringKind: rule.actionParams.offeringKind,
      fortune,
      meritAwarded: merit,
      ttsText
    });
  }

  private advanceCommunityGoal(metric: CommunityGoalState['metric'], delta: number): void {
    if (this.communityGoal.metric !== metric) return;
    this.communityGoal.currentValue += delta;
    while (this.communityGoal.currentValue >= this.communityGoal.targetValue) {
      this.communityGoal.completedCount += 1;
      this.communityGoal.targetValue += 108;
    }
  }

  private dispatchRitual(
    partial: Omit<DispatchedRitual, 'id' | 'timestamp'>
  ): DispatchedRitual {
    const ritual: DispatchedRitual = {
      ...partial,
      id: `ritual_${Date.now()}_${++this.ritualSeq}`,
      timestamp: Date.now()
    };
    this.recentRituals.unshift(ritual);
    if (this.recentRituals.length > 30) {
      this.recentRituals.length = 30;
    }
    this.store.logRitual(ritual);
    this.onRitualCallback?.(ritual, this.totals, this.communityGoal);
    return ritual;
  }

  public triggerPeriodicChant(): DispatchedRitual {
    const text = BUDDHIST_CHANTS[this.chantIndex++ % BUDDHIST_CHANTS.length];
    this.totals.bellRings += 1;
    this.store.saveTotals(this.totals);

    if (this.settings.ttsEnabled) {
      this.tts.enqueue({
        userId: 'system_chant',
        text,
        voice: this.settings.ttsVoice,
        ratePercent: this.settings.ttsRatePercent,
        pitchHz: this.settings.ttsPitchHz,
        priority: 45,
        ttlMs: 45_000
      });
    }

    return this.dispatchRitual({
      actionType: 'PERIODIC_CHANT',
      priority: 45,
      ruleId: 'periodic_chant',
      ruleName: 'Tụng Kinh & Thỉnh Chuông Định Kỳ',
      user: {
        id: 'thay_tru_tri',
        uniqueId: 'thay_tru_tri',
        nickname: 'Sư Trụ Trì',
        avatarUrl: ''
      },
      wishText: text,
      bellIntensity: 1.2,
      meritAwarded: 0,
      ttsText: text
    });
  }

  private reschedulePeriodicChant(): void {
    if (this.chantTimer) {
      clearInterval(this.chantTimer);
      this.chantTimer = null;
    }
    if (this.settings.autoChantEnabled) {
      const intervalMs = Math.max(1, this.settings.autoChantIntervalMin) * 60_000;
      this.chantTimer = setInterval(() => {
        if (this.tts.getMetrics().ttsQueueDepth === 0) {
          this.triggerPeriodicChant();
        }
      }, intervalMs);
    }
  }

  public seedDemoCongregation(targetCount: number): void {
    const safeCount = Math.max(0, Math.min(100, Math.round(targetCount)));
    for (let i = 0; i < safeCount && this.viewers.size < 100; i++) {
      const p = SIM_PERSONAS[i % SIM_PERSONAS.length];
      const suffix = i >= SIM_PERSONAS.length ? ` ${Math.floor(i / SIM_PERSONAS.length) + 1}` : '';
      const id = `demo_${i + 1}`;
      if (!this.viewers.has(id)) {
        this.ensureSeatedViewer(
          {
            id,
            uniqueId: `${p.uniqueId}.${i + 1}`,
            nickname: `${p.nickname}${suffix}`,
            avatarUrl: ''
          },
          {
            skin: DEFAULT_SKIN_CYCLE[i % DEFAULT_SKIN_CYCLE.length],
            isDemo: true,
            meritDelta: (safeCount - i) * 3,
            incenseDelta: 1,
            wishText: DEFAULT_WISHES[i % DEFAULT_WISHES.length]
          }
        );
      }
    }
    this.onStateChangedCallback?.();
  }

  public clearDemoCongregation(): void {
    for (const [id, v] of this.viewers) {
      if (v.isDemo) {
        this.viewers.delete(id);
      }
    }
    this.recomputeSeatingAndVipRanks();
    this.onStateChangedCallback?.();
  }

  public updateSettings(patch: Partial<TempleSettings>): TempleSettings {
    this.settings = { ...this.settings, ...patch };
    this.store.saveSettings(this.settings);
    this.reschedulePeriodicChant();
    this.onStateChangedCallback?.();
    return { ...this.settings };
  }

  public upsertRule(rule: EventActionRule): EventActionRule[] {
    const updated = this.ruleEngine.upsertRule(rule);
    this.store.saveRules(updated);
    this.onStateChangedCallback?.();
    return updated;
  }

  public deleteRule(ruleId: string): EventActionRule[] {
    const updated = this.ruleEngine.deleteRule(ruleId);
    this.store.saveRules(updated);
    this.onStateChangedCallback?.();
    return updated;
  }

  public importConfigBundle(bundle: {
    settings?: Partial<TempleSettings>;
    rules: EventActionRule[];
  }): void {
    this.store.createBackupSnapshot();
    if (bundle.settings) {
      this.settings = { ...this.settings, ...bundle.settings };
      this.store.saveSettings(this.settings);
    }
    this.ruleEngine.setRules(bundle.rules);
    this.store.saveRules(bundle.rules);
    this.reschedulePeriodicChant();
    this.onStateChangedCallback?.();
  }

  public resetSession(): void {
    this.store.createBackupSnapshot();
    this.viewers.clear();
    this.lanterns.length = 0;
    this.recentRituals.length = 0;
    this.pollVotedUsers.clear();
    this.totals = this.store.resetSessionData();
    this.communityGoal.currentValue = this.totals.incenseBurned;
    this.communityGoal.targetValue = 108;
    this.communityGoal.completedCount = 0;
    this.seedDemoCongregation(8);
    this.onStateChangedCallback?.();
  }

  public recordClientPerf(report: ClientPerfReport): void {
    this.clientPerfMap.set(report.clientId, {
      ...report,
      reportedAt: Date.now()
    });
    // Evict stale clients (>30s)
    const now = Date.now();
    for (const [id, r] of this.clientPerfMap) {
      if (now - r.reportedAt > 30000) {
        this.clientPerfMap.delete(id);
      }
    }
  }

  public getMetrics(): QueueMetrics {
    const ttsMetrics = this.tts.getMetrics();
    return {
      ...ttsMetrics,
      eventsAcceptedTotal: this.eventsAcceptedTotal,
      eventsDeduplicatedTotal: this.eventsDeduplicatedTotal,
      eventsRateLimitedTotal: this.eventsRateLimitedTotal,
      eventsModeratedTotal: this.eventsModeratedTotal,
      activeGiftStreaks: this.giftStreaks.activeCount
    };
  }

  public getSnapshot(
    connectorStatus: ConnectorStatus,
    simulatorStatus: SimulatorStatus
  ): TempleStateSnapshot {
    const sortedViewers = [...this.viewers.values()].sort(
      (a, b) => b.meritPoints - a.meritPoints || a.joinedAt - b.joinedAt
    );

    return {
      startedAt: this.startedAt,
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      settings: { ...this.settings },
      connector: connectorStatus,
      simulator: simulatorStatus,
      metrics: this.getMetrics(),
      totals: JSON.parse(JSON.stringify(this.totals)),
      seatCapacity: this.computeSeatCapacity(),
      seatedViewers: sortedViewers,
      leaderboard: sortedViewers.filter((v) => v.meritPoints > 0).slice(0, 12),
      lanterns: [...this.lanterns],
      communityGoal: { ...this.communityGoal },
      poll: JSON.parse(JSON.stringify(this.poll)),
      recentRituals: [...this.recentRituals].slice(0, 15),
      rules: this.ruleEngine.getRules(),
      clientPerf: [...this.clientPerfMap.values()],
      lunarInfo: getVietnameseLunarInfo(),
      prayers: [...this.prayers].slice(0, 30)
    };
  }

  public triggerSereneIdleAction(): DispatchedRitual | null {
    if (!this.settings.idleSereneChimes) return null;
    const actions: Array<'RING_BELL' | 'STRIKE_WOODEN_FISH' | 'BURN_INCENSE'> = [
      'RING_BELL',
      'STRIKE_WOODEN_FISH',
      'BURN_INCENSE'
    ];
    const picked = actions[Math.floor(Math.random() * actions.length)];
    if (picked === 'RING_BELL') {
      this.totals.bellRings += 1;
      this.store.saveTotals(this.totals);
      return this.dispatchRitual({
        actionType: 'RING_BELL',
        priority: 30,
        ruleId: 'serene_idle_bell',
        ruleName: 'Tiếng Chuông Tịnh Tâm',
        user: { id: 'thay_tru_tri', uniqueId: 'thay_tru_tri', nickname: 'Chánh Điện', avatarUrl: '' },
        wishText: 'Tiếng chuông Bát Nhã ngân nga, thân tâm an lạc',
        bellIntensity: 0.9,
        meritAwarded: 0
      });
    } else if (picked === 'STRIKE_WOODEN_FISH') {
      this.totals.woodenFishHits += 3;
      this.store.saveTotals(this.totals);
      return this.dispatchRitual({
        actionType: 'STRIKE_WOODEN_FISH',
        priority: 30,
        ruleId: 'serene_idle_mo',
        ruleName: 'Nhịp Mõ Thanh Tịnh',
        user: { id: 'thay_tru_tri', uniqueId: 'thay_tru_tri', nickname: 'Chánh Điện', avatarUrl: '' },
        wishText: 'Mộc ngư điểm nhịp tinh tấn',
        woodenFishCount: 3,
        meritAwarded: 0
      });
    } else {
      this.totals.incenseBurned += 1;
      this.advanceCommunityGoal('incense', 1);
      this.store.saveTotals(this.totals);
      return this.dispatchRitual({
        actionType: 'BURN_INCENSE',
        priority: 30,
        ruleId: 'serene_idle_incense',
        ruleName: 'Khói Trầm Hương Tịch Tịnh',
        user: { id: 'thay_tru_tri', uniqueId: 'thay_tru_tri', nickname: 'Chánh Điện', avatarUrl: '' },
        wishText: 'Một nén tâm hương cúng dường mười phương chư Phật',
        incenseCount: 1,
        meritAwarded: 0
      });
    }
  }

  public shutdown(): void {
    if (this.chantTimer) clearInterval(this.chantTimer);
    this.giftStreaks.flushAll();
    this.likeBatcher.flush();
  }
}
