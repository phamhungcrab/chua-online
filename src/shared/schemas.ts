import { z } from 'zod';

export const CharacterSkinSchema = z.enum([
  'lam_female',
  'lam_male',
  'brown_elder',
  'monk',
  'nun',
  'child',
  'master_vip'
]);

export const QualityPresetSchema = z.enum(['low', 'medium', 'high']);

export const TimeOfDaySchema = z.enum([
  'DAY_SERENE',
  'GOLDEN_DUSK',
  'SACRED_NIGHT',
  'FESTIVAL_GLOW'
]);

export const WeatherSchema = z.enum([
  'CLEAR',
  'LOTUS_RAIN',
  'MISTY_INCENSE',
  'SPRING_BLOSSOM'
]);

export const SeatCapacityModeSchema = z.enum(['auto', '24', '36', '64', '100']);

export const OfferingKindSchema = z.enum(['lotus', 'lamp', 'fruit', 'dragon']);

export const RitualActionTypeSchema = z.enum([
  'SEAT_AND_CHAT',
  'CHANGE_SKIN',
  'BURN_INCENSE',
  'STRIKE_WOODEN_FISH',
  'RING_BELL',
  'RELEASE_LANTERN',
  'DRAW_FORTUNE',
  'OFFER_GIFT',
  'GRAND_CEREMONY',
  'CAST_POLL_VOTE',
  'PERIODIC_CHANT'
]);

export const RuleConditionItemSchema = z.object({
  field: z.enum([
    'event.type',
    'event.comment',
    'event.gift.totalDiamonds',
    'event.gift.giftName',
    'event.likeCount'
  ]),
  op: z.enum([
    'equals',
    'not_equals',
    'contains',
    'starts_with',
    'greater_or_equal',
    'less_or_equal'
  ]),
  value: z.union([z.string().max(120), z.number().min(0).max(1_000_000)])
});

export const EventActionRuleSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(80),
  enabled: z.boolean(),
  priority: z.number().int().min(1).max(200),
  cooldownSec: z.number().min(0).max(3600),
  matchMode: z.enum(['all', 'any']),
  conditions: z.array(RuleConditionItemSchema).min(1).max(12),
  actionType: RitualActionTypeSchema,
  actionParams: z.object({
    incenseCount: z.number().int().min(1).max(18).optional(),
    woodenFishCount: z.number().int().min(1).max(50).optional(),
    offeringKind: OfferingKindSchema.optional(),
    meritBase: z.number().int().min(0).max(10000).optional(),
    readTts: z.boolean().optional(),
    ttsTemplate: z.string().max(320).optional()
  })
});

export const TempleSettingsPartialSchema = z
  .object({
    title: z.string().min(1).max(48),
    subtitle: z.string().min(1).max(80),
    ethicsNotice: z.string().min(10).max(280),
    seatCapacityMode: SeatCapacityModeSchema,
    joinOnMemberEnter: z.boolean(),
    qualityPreset: QualityPresetSchema,
    targetFps: z.union([z.literal(30), z.literal(60)]),
    timeOfDay: TimeOfDaySchema,
    weather: WeatherSchema,
    smokeDensity: z.number().min(0).max(2),
    petalDensity: z.number().min(0).max(2),
    lightingWarmth: z.number().min(0.4).max(1.6),
    autoChantEnabled: z.boolean(),
    autoChantIntervalMin: z.number().int().min(1).max(60),
    woodenFishRhythmEnabled: z.boolean(),
    woodenFishBpm: z.number().int().min(20).max(120),
    ttsEnabled: z.boolean(),
    ttsVoice: z.enum(['vi-VN-NamMinhNeural', 'vi-VN-HoaiMyNeural']),
    ttsRatePercent: z.number().int().min(-50).max(50),
    ttsPitchHz: z.number().int().min(-40).max(40),
    ttsMinGiftDiamonds: z.number().int().min(1).max(50000),
    ttsReadPrayers: z.boolean(),
    ttsReadFortunes: z.boolean(),
    audioMasterVolume: z.number().min(0).max(1),
    audioMusicVolume: z.number().min(0).max(1),
    audioSfxVolume: z.number().min(0).max(1),
    audioTtsVolume: z.number().min(0).max(1),
    moderationEnabled: z.boolean(),
    userCooldownMs: z.number().int().min(200).max(30000)
  })
  .partial();

export const SimEventTriggerSchema = z.object({
  type: z.enum(['chat', 'like', 'gift', 'follow', 'share', 'join']),
  uniqueId: z.string().max(40).optional(),
  nickname: z.string().max(40).optional(),
  comment: z.string().max(200).optional(),
  likeCount: z.number().int().min(1).max(100).optional(),
  giftName: z.string().max(50).optional(),
  diamondCount: z.number().int().min(1).max(50000).optional(),
  repeatCount: z.number().int().min(1).max(999).optional(),
  repeatEnd: z.boolean().optional(),
  giftType: z.number().int().min(0).max(5).optional(),
  groupId: z.string().max(64).optional()
});

export const ConfigBundleExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  settings: TempleSettingsPartialSchema,
  rules: z.array(EventActionRuleSchema).min(1).max(50)
});
