/**
 * Shared Typed Contracts & Interfaces for Temple Live Studio
 * Compatible with Node 24 native type-stripping (erasableSyntaxOnly).
 */

export type CharacterSkinId =
  | 'lam_female'
  | 'lam_male'
  | 'brown_elder'
  | 'monk'
  | 'nun'
  | 'child'
  | 'master_vip';

export type CharacterPoseState =
  | 'APPEAR'
  | 'WALK'
  | 'KNEEL_DOWN'
  | 'SIT_MEDITATE'
  | 'PRAY_HANDS'
  | 'PROSTRATE_BOW'
  | 'LEAVE';

export type QualityPreset = 'low' | 'medium' | 'high';

export type TimeOfDayAmbience = 'DAY_SERENE' | 'GOLDEN_DUSK' | 'SACRED_NIGHT' | 'FESTIVAL_GLOW';

export type WeatherAmbience = 'CLEAR' | 'LOTUS_RAIN' | 'MISTY_INCENSE' | 'SPRING_BLOSSOM';

export type SeatCapacityMode = 'auto' | '24' | '36' | '64' | '100';

export type GiftTier = 1 | 2 | 3 | 4;

export type OfferingKind = 'lotus' | 'lamp' | 'fruit' | 'dragon';

export type RawLiveEventType =
  | 'chat'
  | 'like'
  | 'gift'
  | 'follow'
  | 'share'
  | 'join'
  | 'viewerCount'
  | 'streamEnd';

export interface NormalizedUser {
  id: string;
  uniqueId: string;
  nickname: string;
  avatarUrl: string;
}

export interface NormalizedLiveEvent {
  eventId: string;
  type: RawLiveEventType;
  timestamp: number;
  source: 'tiktok' | 'simulator' | 'admin';
  user: NormalizedUser;
  comment?: string;
  likeCount?: number;
  totalLikes?: number;
  gift?: {
    giftId: string;
    giftName: string;
    diamondCount: number;
    repeatCount: number;
    repeatEnd: boolean;
    giftType: number;
    groupId: string;
    totalDiamonds: number;
    tier: GiftTier;
  };
  viewerCount?: number;
}

export type RitualActionType =
  | 'SEAT_AND_CHAT'
  | 'CHANGE_SKIN'
  | 'BURN_INCENSE'
  | 'STRIKE_WOODEN_FISH'
  | 'RING_BELL'
  | 'RELEASE_LANTERN'
  | 'DRAW_FORTUNE'
  | 'OFFER_GIFT'
  | 'OFFER_FLOWERS'
  | 'TAM_QUAN_ENTER'
  | 'GRAND_CEREMONY'
  | 'CAST_POLL_VOTE'
  | 'PERIODIC_CHANT';

export interface FortuneStick {
  number: number;
  rank: string;
  title: string;
  poem: string;
  meaning: string;
  ttsSummary: string;
}

export interface DispatchedRitual {
  id: string;
  actionType: RitualActionType;
  priority: number;
  timestamp: number;
  ruleId: string;
  ruleName: string;
  user: NormalizedUser;
  skin?: CharacterSkinId;
  wishText?: string;
  incenseCount?: number;
  woodenFishCount?: number;
  bellIntensity?: number;
  offeringKind?: OfferingKind;
  giftName?: string;
  giftCount?: number;
  diamonds?: number;
  giftTier?: GiftTier;
  meritAwarded: number;
  fortune?: FortuneStick;
  pollOptionId?: string;
  ttsText?: string;
}

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'greater_or_equal'
  | 'less_or_equal';

export interface RuleConditionItem {
  field: 'event.type' | 'event.comment' | 'event.gift.totalDiamonds' | 'event.gift.giftName' | 'event.likeCount';
  op: RuleOperator;
  value: string | number;
}

export interface EventActionRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  cooldownSec: number;
  matchMode: 'all' | 'any';
  conditions: RuleConditionItem[];
  actionType: RitualActionType;
  actionParams: {
    incenseCount?: number;
    woodenFishCount?: number;
    offeringKind?: OfferingKind;
    meritBase?: number;
    readTts?: boolean;
    ttsTemplate?: string;
  };
}

export interface SeatedViewer {
  id: string;
  uniqueId: string;
  nickname: string;
  avatarUrl: string;
  skin: CharacterSkinId;
  seatIndex: number;
  isVip: boolean;
  vipRank: number;
  meritPoints: number;
  incenseCount: number;
  giftsCount: number;
  diamondsTotal: number;
  lastWish: string;
  joinedAt: number;
  lastActiveAt: number;
  isDemo: boolean;
}

export interface FloatingLanternItem {
  id: string;
  userId: string;
  nickname: string;
  wishText: string;
  createdAt: number;
}

export interface PrayerRegistryItem {
  id: string;
  userId: string;
  nickname: string;
  wishText: string;
  category: 'BÌNH AN' | 'SỨC KHỎE' | 'CẦU SIÊU' | 'TRÍ TUỆ' | 'HỒI HƯỚNG';
  meritAwarded: number;
  createdAt: number;
}

export interface LunarDateResult {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeapMonth: boolean;
  canChiYear: string;
  canChiDay: string;
  solarDateStr: string;
  lunarDateStr: string;
  festivalTitle?: string;
  isFullMoonOrNewMoon: boolean;
}

export interface CommunityGoalState {
  id: string;
  title: string;
  metric: 'incense' | 'merit' | 'lanterns' | 'woodenFish';
  currentValue: number;
  targetValue: number;
  completedCount: number;
  rewardAction: 'GRAND_CEREMONY' | 'FESTIVAL_GLOW';
}

export interface LivePollOption {
  id: string;
  keyword: string;
  label: string;
  votes: number;
}

export interface LivePollState {
  active: boolean;
  question: string;
  options: LivePollOption[];
  totalVotes: number;
  startedAt: number;
}

export interface TempleSettings {
  title: string;
  subtitle: string;
  ethicsNotice: string;
  seatCapacityMode: SeatCapacityMode;
  joinOnMemberEnter: boolean;
  qualityPreset: QualityPreset;
  targetFps: 30 | 60;
  timeOfDay: TimeOfDayAmbience;
  weather: WeatherAmbience;
  smokeDensity: number;
  petalDensity: number;
  lightingWarmth: number;
  autoChantEnabled: boolean;
  autoChantIntervalMin: number;
  woodenFishRhythmEnabled: boolean;
  woodenFishBpm: number;
  ttsEnabled: boolean;
  ttsVoice: 'vi-VN-NamMinhNeural' | 'vi-VN-HoaiMyNeural';
  ttsRatePercent: number;
  ttsPitchHz: number;
  ttsMinGiftDiamonds: number;
  ttsReadPrayers: boolean;
  ttsReadFortunes: boolean;
  fortuneEnabled: boolean;
  flowerOfferingEnabled: boolean;
  lunarFestivalAuto: boolean;
  showSafeZones: boolean;
  collectivePrayersEnabled: boolean;
  idleSereneChimes: boolean;
  audioMasterVolume: number;
  audioMusicVolume: number;
  audioSfxVolume: number;
  audioTtsVolume: number;
  moderationEnabled: boolean;
  userCooldownMs: number;
}

export interface ConnectorStatus {
  state: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';
  uniqueId: string;
  roomId: string;
  viewerCount: number;
  reconnectAttempt: number;
  nextRetryInMs: number;
  lastFrameAt: number;
  lastError: string;
}

export interface SimulatorStatus {
  running: boolean;
  scenario: 'serene' | 'busy' | 'grand_festival';
  intervalMs: number;
  eventsGenerated: number;
}

export interface QueueMetrics {
  ttsQueueDepth: number;
  ttsDroppedTotal: number;
  ttsProcessedTotal: number;
  ttsCacheHits: number;
  eventsAcceptedTotal: number;
  eventsDeduplicatedTotal: number;
  eventsRateLimitedTotal: number;
  eventsModeratedTotal: number;
  activeGiftStreaks: number;
}

export interface ClientPerfReport {
  clientId: string;
  fps: number;
  frameTimeMs: number;
  droppedFrames: number;
  activeActors: number;
  activeParticles: number;
  rendererType: string;
  jsHeapMb: number;
  reportedAt: number;
}

export interface TempleStateSnapshot {
  startedAt: number;
  uptimeSec: number;
  settings: TempleSettings;
  connector: ConnectorStatus;
  simulator: SimulatorStatus;
  metrics: QueueMetrics;
  totals: {
    meritPoints: number;
    incenseBurned: number;
    woodenFishHits: number;
    bellRings: number;
    lanternsReleased: number;
    fortunesDrawn: number;
    offerings: Record<OfferingKind, number>;
  };
  seatCapacity: number;
  seatedViewers: SeatedViewer[];
  leaderboard: SeatedViewer[];
  lanterns: FloatingLanternItem[];
  communityGoal: CommunityGoalState;
  poll: LivePollState;
  recentRituals: DispatchedRitual[];
  rules: EventActionRule[];
  clientPerf: ClientPerfReport[];
  lunarInfo: LunarDateResult;
  prayers: PrayerRegistryItem[];
}

export interface TtsBroadcastPayload {
  id: string;
  text: string;
  audioUrl: string | null;
  voice: string;
  priority: number;
  ritualId?: string;
}

export type ServerToClientWsMessage =
  | { type: 'snapshot'; snapshot: TempleStateSnapshot }
  | { type: 'ritual'; ritual: DispatchedRitual; totals: TempleStateSnapshot['totals']; communityGoal: CommunityGoalState }
  | { type: 'likeBatch'; count: number; totalWoodenFish: number; users: Array<{ id: string; nickname: string }> }
  | { type: 'giftStreakProgress'; userId: string; nickname: string; giftName: string; currentCount: number }
  | { type: 'statePatch'; patch: Partial<TempleStateSnapshot> }
  | { type: 'prayer'; prayer: PrayerRegistryItem }
  | { type: 'tts'; tts: TtsBroadcastPayload }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string; timestamp: string };

export interface ITikTokConnector {
  getStatus(): ConnectorStatus;
  connect(uniqueId: string): Promise<ConnectorStatus>;
  disconnect(): Promise<void>;
  onEvent(handler: (event: NormalizedLiveEvent) => void): void;
  onStatusChange(handler: (status: ConnectorStatus) => void): void;
}
