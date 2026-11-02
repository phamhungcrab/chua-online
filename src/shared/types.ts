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

export type FortuneReadMode = 'summary' | 'full' | 'poem_meaning';

export interface FortuneExecutionRecord {
  id: string;
  timestamp: number;
  user: { id: string; nickname: string; avatarUrl?: string };
  fortune: FortuneStick;
  mode: FortuneReadMode;
  ttsText?: string;
  audioUrl?: string | null;
  status: 'ENQUEUED' | 'PLAYING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  reason?: string;
  traceId?: string;
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
  fortuneReadMode?: FortuneReadMode;
  fortuneUserCooldownSec?: number;
  fortuneVoice?: 'vi-VN-NamMinhNeural' | 'vi-VN-HoaiMyNeural' | string;
  fortuneRatePercent?: number;
  fortuneVolume?: number;
  flowerOfferingEnabled: boolean;
  lunarFestivalAuto: boolean;
  showSafeZones: boolean;
  collectivePrayersEnabled: boolean;
  idleSereneChimes: boolean;
  audioMasterVolume: number;
  audioMusicVolume: number;
  audioSfxVolume: number;
  audioTtsVolume: number;
  audioBellVolume: number;
  audioWoodenFishVolume: number;
  audioCeremonyVolume: number;
  audioDuckingPercent: number;
  audioDuckingEnabled: boolean;
  ttsModerationStrict: boolean;
  ttsReadFreeComments: boolean;
  activeBgmTrackId: string | null;
  activePlaylistId: string | null;
  moderationEnabled: boolean;
  userCooldownMs: number;
}

export type AudioCategory =
  | 'chant'
  | 'buddha_name'
  | 'meditation'
  | 'bell'
  | 'wooden_fish'
  | 'prayer'
  | 'greeting'
  | 'festival'
  | 'sfx';

export interface AudioTrackItem {
  id: string;
  name: string;
  filename: string;
  filepath: string;
  category: AudioCategory;
  durationSec: number;
  fileSizeBytes: number;
  mimeType: string;
  isDefaultFor?: string | null;
  createdAt: number;
  url: string;
}

export interface AudioPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  mode: 'sequence' | 'loop_all' | 'loop_one' | 'shuffle';
  isActive: boolean;
  createdAt: number;
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

export type TraceStage =
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'QUEUED'
  | 'SYNTHESIZED'
  | 'PLAYING'
  | 'COMPLETED'
  | 'DROPPED';

export interface EventTraceItem {
  traceId: string;
  eventId: string;
  timestamp: number;
  receivedAt: number;
  source: 'tiktok' | 'simulator' | 'admin';
  type: RawLiveEventType;
  user: { id: string; nickname: string; uniqueId?: string };
  rawContent: string;
  stage: TraceStage;
  reason?: string;
  ttsVoice?: string;
  ttsText?: string;
  audioUrl?: string | null;
  leaderClientId?: string | null;
  latencyMs?: number;
  updatedAt: number;
}

export type SystemResetScope = 'session' | 'config' | 'factory';

export type SceneLayerId =
  | 'background'
  | 'architecture'
  | 'altar'
  | 'floor'
  | 'characters'
  | 'ceremony'
  | 'foreground'
  | 'particles'
  | 'hud';

export type ScaleMode = 'cover' | 'contain' | 'center' | 'custom';

export interface SceneLayerConfig {
  id: SceneLayerId;
  order?: number;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  assetId?: string | null;
  assetUrl?: string | null;
  mediaType?: 'image' | 'video';
  scaleMode: ScaleMode;
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
  rotation: number;
  blendMode?: 'normal' | 'add' | 'screen' | 'multiply';
  hideProcedural: boolean;
}

export interface RitualAnchorsConfig {
  buddhaStatue: {
    x: number;
    y: number;
    scale: number;
    visible: boolean;
  };
  incenseBurner: {
    x: number;
    y: number;
    scale: number;
    visible: boolean;
  };
  woodenFish: {
    x: number;
    y: number;
    scale: number;
    visible: boolean;
  };
  templeBell: {
    x: number;
    y: number;
    scale: number;
    visible: boolean;
  };
  congregation: {
    yTop: number;
    yBottom: number;
    halfTop: number;
    halfBottom: number;
    visible: boolean;
  };
  ceremony: {
    spawnX: number;
    spawnY: number;
    kneelX: number;
    kneelY: number;
    exitX: number;
    exitY: number;
    visible: boolean;
  };
}

export interface SceneConfig {
  version: string;
  id: string;
  name: string;
  ambience: TimeOfDayAmbience;
  transitionDurationMs: number;
  layers: SceneLayerConfig[];
  anchors: RitualAnchorsConfig;
  updatedAt: number;
}

export interface SceneAssetItem {
  id: string;
  name: string;
  filename: string;
  filepath: string;
  targetLayer: SceneLayerId;
  layerTarget?: SceneLayerId;
  mediaType: 'image' | 'video';
  fileSizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  url: string;
  createdAt: number;
}

export interface ScenePresetItem {
  id: string;
  name: string;
  isBuiltin: boolean;
  config: SceneConfig;
  thumbnailUrl?: string;
  createdAt: number;
  updatedAt: number;
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
  eventTraces?: EventTraceItem[];
  audioLeaderClientId?: string | null;
  gitCommit?: string;
  sceneConfig?: SceneConfig;
  lastFortuneRecord?: FortuneExecutionRecord;
  recentFortuneExecutions?: FortuneExecutionRecord[];
  fortuneDeckCount?: number;
}

export interface TtsBroadcastPayload {
  id: string;
  text: string;
  audioUrl: string | null;
  voice: string;
  priority: number;
  ritualId?: string;
  leaderClientId?: string | null;
  traceId?: string;
}

export type ServerToClientWsMessage =
  | { type: 'clientInit'; clientId: string; isAudioLeader: boolean }
  | { type: 'snapshot'; snapshot: TempleStateSnapshot; clientId?: string }
  | { type: 'fortuneExecutionUpdate'; record: FortuneExecutionRecord }
  | { type: 'ritual'; ritual: DispatchedRitual; totals: TempleStateSnapshot['totals']; communityGoal: CommunityGoalState }
  | { type: 'likeBatch'; count: number; totalWoodenFish: number; users: Array<{ id: string; nickname: string }> }
  | { type: 'giftStreakProgress'; userId: string; nickname: string; giftName: string; currentCount: number }
  | { type: 'statePatch'; patch: Partial<TempleStateSnapshot> }
  | { type: 'prayer'; prayer: PrayerRegistryItem }
  | { type: 'tts'; tts: TtsBroadcastPayload }
  | { type: 'eventTrace'; trace: EventTraceItem }
  | { type: 'eventTraceBatch'; traces: EventTraceItem[] }
  | { type: 'audioLeaderUpdate'; leaderClientId: string | null }
  | { type: 'sceneConfigUpdate'; sceneConfig: SceneConfig }
  | { type: 'stopAudio' }
  | { type: 'clearTtsQueue' }
  | { type: 'restartAudioEngine' }
  | { type: 'sessionReset'; timestamp: number }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string; timestamp: string };

export interface ITikTokConnector {
  getStatus(): ConnectorStatus;
  connect(uniqueId: string): Promise<ConnectorStatus>;
  disconnect(): Promise<void>;
  verifyRoom?(uniqueId: string): Promise<{ verified: boolean; uniqueId: string; roomId?: string; message?: string }>;
  onEvent(handler: (event: NormalizedLiveEvent) => void): void;
  onStatusChange(handler: (status: ConnectorStatus) => void): void;
}
