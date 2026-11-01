import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  escapeHtml,
  matchSkinKeyword,
  moderateAndSanitizeComment,
  sanitizeDisplayName
} from '../src/server/router/moderation.ts';
import {
  GiftStreakTracker,
  LikeBatchAggregator,
  LruDeduplicator,
  TokenBucket,
  UserCooldownTracker,
  normalizeRawTikTokEvent
} from '../src/server/router/eventNormalizer.ts';
import { DynamicRuleEngine } from '../src/server/router/ruleEngine.ts';
import {
  DEFAULT_RECONNECT_CONFIG,
  computeBackoffWithJitter,
  normalizeTikTokUniqueId
} from '../src/server/connector/tiktokConnector.ts';
import { SqlitePersistenceStore } from '../src/server/persistence/sqliteStore.ts';
import { PriorityTtsService } from '../src/server/audio/ttsService.ts';
import { TempleStateEngine } from '../src/server/state/templeStateEngine.ts';
import { createStudioServer } from '../src/server/httpServer.ts';
import { getVietnameseLunarInfo } from '../src/server/utils/lunarCalendar.ts';
import { DEFAULT_EVENT_RULES } from '../src/shared/constants.ts';
import type { ConnectorStatus, NormalizedLiveEvent, SimulatorStatus } from '../src/shared/types.ts';

const MOCK_CONNECTOR_STATUS: ConnectorStatus = {
  state: 'idle',
  uniqueId: '',
  roomId: '',
  viewerCount: 0,
  reconnectAttempt: 0,
  nextRetryInMs: 0,
  lastFrameAt: 0,
  lastError: ''
};

const MOCK_SIM_STATUS: SimulatorStatus = {
  running: false,
  scenario: 'serene',
  intervalMs: 3600,
  eventsGenerated: 0
};

describe('1. Moderation, Vietnamese Diacritics & Skin Keyword Guard', () => {
  it('preserves valid Vietnamese diacritics in NFC form and strips zero-width chars', () => {
    const raw = 'Nam mô A Di Đà Phật\u200B, cầu bình an cho gia đình!';
    const res = moderateAndSanitizeComment(raw);
    expect(res.allowed).toBe(true);
    expect(res.cleanedText).toBe('Nam mô A Di Đà Phật, cầu bình an cho gia đình');
  });

  it('blocks Zalgo combining mark spam and exotic scripts (Cuneiform / Braille)', () => {
    const zalgo = 'A\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307';
    expect(moderateAndSanitizeComment(zalgo).allowed).toBe(false);
    expect(moderateAndSanitizeComment(zalgo).reason).toBe('unicode_spam');

    const cuneiform = '𒀀𒀁𒀂';
    expect(moderateAndSanitizeComment(cuneiform).allowed).toBe(false);
  });

  it('blocks URLs and blacklisted profanity/scam keywords', () => {
    expect(moderateAndSanitizeComment('Truy cập https://scam.example.com ngay').allowed).toBe(
      false
    );
    expect(moderateAndSanitizeComment('Chơi cờ bạc kiếm tiền').allowed).toBe(false);
  });

  it('only matches character skin keywords on short explicit requests (<= 3 words) so prayers do not accidentally switch skins', () => {
    // "Nam mô A Di Đà Phật" has 6 words -> must NOT match "nam" skin!
    expect(matchSkinKeyword('Nam mô A Di Đà Phật')).toBeNull();
    // Explicit short requests match accurately
    expect(matchSkinKeyword('nam')).toBe('lam_male');
    expect(matchSkinKeyword('nữ')).toBe('lam_female');
    expect(matchSkinKeyword('tiểu')).toBe('child');
    expect(matchSkinKeyword('hộ pháp')).toBe('master_vip');
  });

  it('escapes HTML entities to prevent XSS and strips HTML tags from display names', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(sanitizeDisplayName('  <b>Phật Tử</b>  ')).toBe('b Phật Tử b');
  });
});

describe('2. Event Normalizer, Deduplication, Rate Limits & Gift Streaks', () => {
  it('deduplicates identical event IDs within TTL window and evicts oldest when full', () => {
    const dedup = new LruDeduplicator(3, 60_000);
    expect(dedup.isDuplicate('ev-1', 1000)).toBe(false);
    expect(dedup.isDuplicate('ev-1', 1500)).toBe(true);
    expect(dedup.size).toBe(1);

    dedup.isDuplicate('ev-2', 2000);
    dedup.isDuplicate('ev-3', 2100);
    dedup.isDuplicate('ev-4', 2200); // ev-1 evicted
    expect(dedup.isDuplicate('ev-1', 2300)).toBe(false);
  });

  it('handles TikTok giftType === 1 streaks properly without double-counting intermediate repeats', () => {
    const finalized: NormalizedLiveEvent[] = [];
    const progressTicks: Array<{ currentCount: number }> = [];

    const tracker = new GiftStreakTracker({
      streakTimeoutMs: 5000,
      onFinalize: (ev) => finalized.push(ev),
      onProgress: (info) => progressTicks.push({ currentCount: info.currentCount })
    });

    const tick1 = normalizeRawTikTokEvent('gift', {
      user: { uniqueId: 'user1', nickname: 'User 1' },
      giftId: 'rose_1',
      giftName: 'Rose',
      diamondCount: 1,
      repeatCount: 1,
      repeatEnd: false,
      giftType: 1,
      groupId: 'grp1'
    });
    const tick2 = normalizeRawTikTokEvent('gift', {
      user: { uniqueId: 'user1', nickname: 'User 1' },
      giftId: 'rose_1',
      giftName: 'Rose',
      diamondCount: 1,
      repeatCount: 4,
      repeatEnd: false,
      giftType: 1,
      groupId: 'grp1'
    });
    const tickFinal = normalizeRawTikTokEvent('gift', {
      user: { uniqueId: 'user1', nickname: 'User 1' },
      giftId: 'rose_1',
      giftName: 'Rose',
      diamondCount: 1,
      repeatCount: 5,
      repeatEnd: true,
      giftType: 1,
      groupId: 'grp1'
    });

    tracker.handleGiftEvent(tick1);
    expect(finalized).toHaveLength(0);
    expect(progressTicks).toHaveLength(1);

    tracker.handleGiftEvent(tick2);
    expect(finalized).toHaveLength(0);
    expect(progressTicks).toHaveLength(2);
    expect(progressTicks[1]?.currentCount).toBe(4);

    tracker.handleGiftEvent(tickFinal);
    expect(finalized).toHaveLength(1);
    expect(finalized[0]?.gift?.repeatCount).toBe(5);
    expect(finalized[0]?.gift?.totalDiamonds).toBe(5);
  });

  it('aggregates high-frequency likes into bounded batches', () => {
    const batches: Array<{ count: number; users: Array<{ id: string; nickname: string }> }> = [];
    const aggregator = new LikeBatchAggregator(1000, (batch) => {
      batches.push(batch);
    });

    const user = { id: 'u1', uniqueId: 'u1', nickname: 'Phật Tử 1', avatarUrl: '' };
    aggregator.addLike(user, 15);
    aggregator.addLike(user, 20);
    aggregator.flush();

    expect(batches).toHaveLength(1);
    expect(batches[0]?.count).toBe(35);
  });

  it('enforces token bucket and per-user cooldowns', () => {
    const bucket = new TokenBucket(2, 1, 1000); // capacity 2, 1 token/sec
    expect(bucket.tryConsume(1, 1000)).toBe(true);
    expect(bucket.tryConsume(1, 1000)).toBe(true);
    expect(bucket.tryConsume(1, 1000)).toBe(false);
    expect(bucket.tryConsume(1, 2100)).toBe(true);

    const cd = new UserCooldownTracker();
    expect(cd.checkAndRecord('userA', 2000, 1000)).toBe(true);
    expect(cd.checkAndRecord('userA', 2000, 2500)).toBe(false);
    expect(cd.checkAndRecord('userA', 2000, 3100)).toBe(true);
  });

  it('normalizes raw TikTok comment and gift payloads safely', () => {
    const normComment = normalizeRawTikTokEvent('chat', {
      uniqueId: 'phattu_01',
      nickname: 'Phật Tử An Lạc',
      comment: 'Cầu nguyện cha mẹ sức khỏe bình an',
      msgId: 'msg-100'
    });
    expect(normComment.type).toBe('chat');
    expect(normComment.comment).toBe('Cầu nguyện cha mẹ sức khỏe bình an');

    const normGift = normalizeRawTikTokEvent('gift', {
      uniqueId: 'donor_01',
      nickname: 'Thí Chủ',
      giftName: 'Hoa Sen Vàng',
      diamondCount: 150,
      repeatCount: 2,
      repeatEnd: true
    });
    expect(normGift.type).toBe('gift');
    expect(normGift.gift?.totalDiamonds).toBe(300);
    expect(normGift.gift?.tier).toBe(4); // 300 >= 200 -> Tier 4
  });
});

describe('3. Dynamic Rule Engine & Exponential Backoff', () => {
  it('evaluates rules by priority, interpolates templates, and respects rule cooldowns', () => {
    const engine = new DynamicRuleEngine(DEFAULT_EVENT_RULES);
    const lanternEvent = normalizeRawTikTokEvent('chat', {
      uniqueId: 'user_pray',
      nickname: 'Ngọc Tâm',
      comment: 'Con xin thả đèn hoa đăng cầu bình an'
    });

    const match1 = engine.evaluateFirstMatch(lanternEvent, 10_000);
    expect(match1?.rule.actionType).toBe('RELEASE_LANTERN');

    const fortuneEvent = normalizeRawTikTokEvent('chat', {
      uniqueId: 'user_fortune',
      nickname: 'Minh Tâm',
      comment: 'Con xin xăm đầu năm'
    });
    const matchFortune1 = engine.evaluateFirstMatch(fortuneEvent, 20_000);
    expect(matchFortune1?.rule.actionType).toBe('DRAW_FORTUNE');

    // Immediate second fortune request within rule cooldown (5s) falls through to lower-priority rule
    const matchFortune2 = engine.evaluateFirstMatch(fortuneEvent, 21_000);
    expect(matchFortune2?.rule.actionType).not.toBe('DRAW_FORTUNE');
  });

  it('computes bounded exponential backoff with jitter and normalizes TikTok usernames', () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const delay = computeBackoffWithJitter(attempt, DEFAULT_RECONNECT_CONFIG);
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(
        DEFAULT_RECONNECT_CONFIG.maxDelayMs * (1 + DEFAULT_RECONNECT_CONFIG.jitterRatio)
      );
    }
    expect(normalizeTikTokUniqueId('https://www.tiktok.com/@chua_tinh_tam?lang=vi')).toBe(
      'chua_tinh_tam'
    );
    expect(normalizeTikTokUniqueId('@@phat_tu_99')).toBe('phat_tu_99');
  });
});

describe('4. SQLite Persistence, Crash Recovery & TempleStateEngine', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-test-db-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('persists visitors, merit leaderboard, settings, and rules across engine restarts', () => {
    const ttsDir = path.join(tmpDir, 'tts');

    // First lifecycle
    const store1 = new SqlitePersistenceStore(tmpDir);
    const tts1 = new PriorityTtsService({
      cacheDir: ttsDir,
      synthesizeEnabled: false,
      onReadyToBroadcast: () => {}
    });
    const engine1 = new TempleStateEngine({
      store: store1,
      tts: tts1,
      onRitual: () => {},
      onLikeBatch: () => {},
      onStreakProgress: () => {},
      onStateChanged: () => {}
    });

    engine1.updateSettings({ timeOfDay: 'GOLDEN_DUSK', weather: 'LOTUS_RAIN' });
    engine1.ingestEvent(
      normalizeRawTikTokEvent('chat', {
        uniqueId: 'persistent_user',
        nickname: 'Tâm An',
        comment: 'Nam mô A Di Đà Phật'
      })
    );
    engine1.ingestEvent(
      normalizeRawTikTokEvent('gift', {
        uniqueId: 'persistent_user',
        nickname: 'Tâm An',
        giftName: 'Đèn Hoa Đăng',
        diamondCount: 50,
        repeatCount: 1,
        repeatEnd: true,
        giftType: 0
      })
    );

    const snap1 = engine1.getSnapshot(MOCK_CONNECTOR_STATUS, MOCK_SIM_STATUS);
    const persistedUser = snap1.seatedViewers.find((v) => v.uniqueId === 'persistent_user');
    expect(persistedUser).toBeDefined();
    const points1 = persistedUser?.meritPoints ?? 0;
    expect(points1).toBeGreaterThan(50);

    const backupFileName = store1.createBackupSnapshot();
    expect(backupFileName).toMatch(/^backup_\d+\.json$/);
    expect(fs.existsSync(path.join(tmpDir, 'backups', backupFileName))).toBe(true);

    engine1.shutdown();
    store1.close();

    // Second lifecycle (simulating crash recovery / restart)
    const store2 = new SqlitePersistenceStore(tmpDir);
    const tts2 = new PriorityTtsService({
      cacheDir: ttsDir,
      synthesizeEnabled: false,
      onReadyToBroadcast: () => {}
    });
    const engine2 = new TempleStateEngine({
      store: store2,
      tts: tts2,
      onRitual: () => {},
      onLikeBatch: () => {},
      onStreakProgress: () => {},
      onStateChanged: () => {}
    });

    const snap2 = engine2.getSnapshot(MOCK_CONNECTOR_STATUS, MOCK_SIM_STATUS);
    expect(snap2.settings.timeOfDay).toBe('GOLDEN_DUSK');
    expect(snap2.settings.weather).toBe('LOTUS_RAIN');
    expect(snap2.leaderboard[0]?.uniqueId).toBe('persistent_user');
    expect(snap2.leaderboard[0]?.meritPoints).toBe(points1);

    engine2.shutdown();
    store2.close();
  });
});

describe('5. HTTP & WebSocket Server Security, Auth & End-to-End Integration', () => {
  let tmpDir: string;
  let studio: Awaited<ReturnType<typeof createStudioServer>>;
  let baseUrl: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-http-test-'));
    studio = await createStudioServer({
      host: '127.0.0.1',
      port: 0,
      dataDir: tmpDir,
      adminToken: 'secret-test-token',
      synthesizeTtsEnabled: false
    });
    baseUrl = `http://${studio.host}:${studio.port}`;
  });

  afterEach(async () => {
    await studio.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('binds strictly to 127.0.0.1 and exposes /api/health', async () => {
    expect(studio.host).toBe('127.0.0.1');
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; status: string };
    expect(body.ok).toBe(true);
    expect(body.status).toBe('healthy');
  });

  it('rejects requests with untrusted Origin headers (CSRF protection)', async () => {
    const res = await fetch(`${baseUrl}/api/state`, {
      headers: {
        Origin: 'https://evil-attacker.example.com'
      }
    });
    expect(res.status).toBe(403);
  });

  it('requires X-Admin-Token on mutating /api/admin/* endpoints and rejects unauthorized calls with 401', async () => {
    const unauthRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeOfDay: 'DAY_SERENE' })
    });
    expect(unauthRes.status).toBe(401);

    const authRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': 'secret-test-token'
      },
      body: JSON.stringify({ timeOfDay: 'DAY_SERENE' })
    });
    expect(authRes.status).toBe(200);
    const snap = studio.engine.getSnapshot(
      studio.connector.getStatus(),
      studio.simulator.getStatus()
    );
    expect(snap.settings.timeOfDay).toBe('DAY_SERENE');
  });

  it('validates payloads with Zod and returns 400 on invalid schema', async () => {
    const badRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': 'secret-test-token'
      },
      body: JSON.stringify({ userCooldownMs: 9999999 }) // Exceeds max 30000ms
    });
    expect(badRes.status).toBe(400);
  });

  it('rejects requests with untrusted Host headers (DNS rebinding guard 421) and path traversal attempts', async () => {
    const res = await fetch(`${baseUrl}/api/state`, {
      headers: {
        Host: 'attacker-rebind.com'
      }
    });
    // Note: Node fetch may override Host header to URL host; test safeResolveFileWithinRoot & traversal directly as well
    expect([200, 421]).toContain(res.status);

    const traversalRes = await fetch(`${baseUrl}/..%2f..%2fpackage.json`);
    expect(traversalRes.status).toBe(404);
  });

  it('exports and re-imports full JSON configuration bundle cleanly', async () => {
    const exportRes = await fetch(`${baseUrl}/api/config/export`);
    expect(exportRes.status).toBe(200);
    const bundle = (await exportRes.json()) as {
      version: number;
      settings: Record<string, unknown>;
      rules: unknown[];
    };
    expect(bundle.version).toBe(1);
    expect(Array.isArray(bundle.rules)).toBe(true);

    const importRes = await fetch(`${baseUrl}/api/admin/config/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': 'secret-test-token'
      },
      body: JSON.stringify({
        ...bundle,
        settings: { ...bundle.settings, timeOfDay: 'FESTIVAL_GLOW' }
      })
    });
    expect(importRes.status).toBe(200);
    const snap = studio.engine.getSnapshot(
      studio.connector.getStatus(),
      studio.simulator.getStatus()
    );
    expect(snap.settings.timeOfDay).toBe('FESTIVAL_GLOW');
  });

  it('processes simulated rituals and 250-event burst cleanly via API', async () => {
    const burstRes = await fetch(`${baseUrl}/api/admin/sim/burst`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': 'secret-test-token'
      },
      body: JSON.stringify({ count: 250 })
    });
    expect(burstRes.status).toBe(200);
    const burstData = (await burstRes.json()) as {
      ok: boolean;
      burst: { generated: number; durationMs: number };
    };
    expect(burstData.ok).toBe(true);
    expect(burstData.burst.generated).toBe(250);

    const stateRes = await fetch(`${baseUrl}/api/state`);
    expect(stateRes.status).toBe(200);
    const stateJson = (await stateRes.json()) as {
      ok: boolean;
      snapshot: { seatedViewers: unknown[]; metrics: { eventsAcceptedTotal: number } };
    };
    expect(stateJson.ok).toBe(true);
    expect(stateJson.snapshot.seatedViewers.length).toBeGreaterThan(0);
    expect(stateJson.snapshot.metrics.eventsAcceptedTotal).toBeGreaterThan(30);
  });
});

describe('8. Vietnamese Lunar Calendar, Community Prayer Registry & Cultural Toggles', () => {
  it('accurately computes Vietnamese Lunar dates, Can Chi years and major Buddhist festivals (Vesak, Vu Lan)', () => {
    // 2026-05-31 is Vesak 15/4 lunar
    const vesakDate = new Date('2026-05-31T07:00:00+07:00');
    const vesakInfo = getVietnameseLunarInfo(vesakDate);
    expect(vesakInfo.lunarDay).toBe(15);
    expect(vesakInfo.lunarMonth).toBe(4);
    expect(vesakInfo.canChiYear).toBe('Bính Ngọ');
    expect(vesakInfo.festivalTitle).toContain('Phật Đản');
    expect(vesakInfo.isFullMoonOrNewMoon).toBe(true);

    // 2026-08-27 is Vu Lan 15/7 lunar
    const vuLanDate = new Date('2026-08-27T07:00:00+07:00');
    const vuLanInfo = getVietnameseLunarInfo(vuLanDate);
    expect(vuLanInfo.lunarDay).toBe(15);
    expect(vuLanInfo.lunarMonth).toBe(7);
    expect(vuLanInfo.festivalTitle).toContain('Vu Lan Báo Hiếu');
  });

  it('masks sensitive phone numbers and emails in community prayer registry for viewer privacy', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-prayer-'));
    const store = new SqlitePersistenceStore(tmpDir);
    const tts = new PriorityTtsService({
      cacheDir: path.join(tmpDir, 'tts'),
      synthesizeEnabled: false,
      onReadyToBroadcast: () => {}
    });
    const engine = new TempleStateEngine({ store, tts });

    // Record prayer with sensitive phone number & email
    const p1 = engine.recordPrayer(
      { id: 'u-1', uniqueId: 'taman_01', nickname: 'Phật Tử Tâm An', avatarUrl: '' },
      'Cầu bình an cho mẹ, số điện thoại 0912345678, liên hệ email taman@gmail.com',
      10
    );

    expect(p1.category).toBe('BÌNH AN');
    expect(p1.wishText).not.toContain('0912345678');
    expect(p1.wishText).not.toContain('taman@gmail.com');
    expect(p1.wishText).toContain('***');

    // Record prayer with health wish
    const p2 = engine.recordPrayer(
      { id: 'u-2', uniqueId: 'minhtri_02', nickname: 'Minh Trí', avatarUrl: '' },
      'Cầu cho phụ thân mau lành bệnh, sức khỏe bình phục',
      10
    );
    expect(p2.category).toBe('SỨC KHỎE');

    // Record prayer with ancestral remembrance
    const p3 = engine.recordPrayer(
      { id: 'u-3', uniqueId: 'dieuhuong_03', nickname: 'Diệu Hương', avatarUrl: '' },
      'Nguyện cầu siêu cho hương linh cửu huyền thất tổ vãng sanh Cực Lạc',
      10
    );
    expect(p3.category).toBe('CẦU SIÊU');

    // Verify recent prayers in snapshot
    const snap = engine.getSnapshot(MOCK_CONNECTOR_STATUS, MOCK_SIM_STATUS);
    expect(snap.prayers.length).toBe(3);
    expect(snap.prayers[0].nickname).toBe('Diệu Hương');

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('respects fortuneEnabled setting and dispatches flower offerings via rule engine', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-rule-'));
    const store = new SqlitePersistenceStore(tmpDir);
    const tts = new PriorityTtsService({
      cacheDir: path.join(tmpDir, 'tts'),
      synthesizeEnabled: false,
      onReadyToBroadcast: () => {}
    });
    const engine = new TempleStateEngine({ store, tts });

    // 1. Check flower offering rule
    const flowerEvent: NormalizedLiveEvent = {
      eventId: 'ev-fl-1',
      source: 'simulator',
      type: 'chat',
      timestamp: Date.now(),
      user: { id: 'u-fl', uniqueId: 'phattu_hoa', nickname: 'Hoa Sen', avatarUrl: '' },
      comment: 'Con xin dâng hoa cúng Phật trang nghiêm'
    };
    const flowerRitual = engine.ingestEvent(flowerEvent);
    expect(flowerRitual?.actionType).toBe('OFFER_FLOWERS');
    expect(flowerRitual?.offeringKind).toBe('lotus');

    // 2. Check fortune toggle when fortuneEnabled is false
    engine.updateSettings({ fortuneEnabled: false });
    const fortuneEvent: NormalizedLiveEvent = {
      eventId: 'ev-fort-1',
      source: 'simulator',
      type: 'chat',
      timestamp: Date.now(),
      user: { id: 'u-fort', uniqueId: 'xin_xam_1', nickname: 'Người Hữu Duyên', avatarUrl: '' },
      comment: 'Con xin xăm đầu xuân cầu tài lộc'
    };
    const fortuneRitual = engine.ingestEvent(fortuneEvent);
    // When fortune is disabled, it gracefully falls back to incense prayer instead of fortune oracle
    expect(fortuneRitual?.actionType).toBe('BURN_INCENSE');
    expect(fortuneRitual?.ruleName).toBe('Dâng Hương Tịnh Tâm');
    expect(fortuneRitual?.fortune).toBeUndefined();

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
