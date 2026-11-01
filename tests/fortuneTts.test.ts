import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EVENT_RULES, DEFAULT_SETTINGS, FORTUNE_STICKS_DECK } from '../src/shared/constants.ts';
import type { NormalizedLiveEvent } from '../src/shared/types.ts';
import { PriorityTtsService } from '../src/server/audio/ttsService.ts';
import { SqlitePersistenceStore } from '../src/server/persistence/sqliteStore.ts';
import { DynamicRuleEngine } from '../src/server/router/ruleEngine.ts';
import { TempleStateEngine } from '../src/server/state/templeStateEngine.ts';

describe('Fortune ("Xin Xăm / Xin Quẻ") Pipeline & Vietnamese TTS Verification', () => {
  it('matches all 10+ variations of cultural fortune stick keywords regardless of casing or accents', () => {
    const engine = new DynamicRuleEngine(DEFAULT_EVENT_RULES);

    const testComments = [
      'xin xăm',
      'xin quẻ',
      'Xin Xăm',
      'xin xam',
      'XIN QUE',
      'rút quẻ',
      'rut que',
      'rút xăm',
      'rut xam',
      'gieo quẻ',
      'gieo que',
      'bốc quẻ',
      'boc que',
      'bốc xăm',
      'thầy ơi cho con xin quẻ đầu xuân'
    ];

    for (let i = 0; i < testComments.length; i++) {
      const comment = testComments[i];
      const ev: NormalizedLiveEvent = {
        eventId: `ev_${i}`,
        type: 'chat',
        timestamp: 100_000 + i * 20_000,
        source: 'tiktok',
        user: { id: `user_${i}`, uniqueId: `uid_${i}`, nickname: `Đạo Hữu ${i}`, avatarUrl: '' },
        comment
      };

      const match = engine.evaluateFirstMatch(ev, ev.timestamp);
      expect(match, `Comment "${comment}" must match a rule`).not.toBeNull();
      expect(match?.rule.actionType, `Comment "${comment}" must match DRAW_FORTUNE`).toBe('DRAW_FORTUNE');
    }
  });

  it('ingests "xin quẻ" and enqueues exactly 1 Vietnamese TTS request with fortune summary', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-fortune-test-'));
    const store = new SqlitePersistenceStore(tmpDir);

    const queuedTts: any[] = [];
    const tts = new PriorityTtsService({
      cacheDir: path.join(tmpDir, 'tts'),
      synthesizeEnabled: false
    });
    tts.enqueue = (item: any) => {
      queuedTts.push(item);
      return true;
    };

    const engine = new TempleStateEngine({
      store,
      tts
    });

    // Ensure settings have TTS and fortune reading enabled
    engine.updateSettings({
      ttsEnabled: true,
      ttsReadFortunes: true,
      fortuneEnabled: true,
      fortuneReadMode: 'summary',
      ttsVoice: 'vi-VN-HoaiMyNeural'
    });

    const event: NormalizedLiveEvent = {
      eventId: 'evt_fortune_1',
      type: 'chat',
      timestamp: Date.now(),
      source: 'tiktok',
      user: { id: 'u_fortune_1', uniqueId: 'tam_an', nickname: 'Tâm An', avatarUrl: '' },
      comment: 'Con xin quẻ đầu năm cầu bình an'
    };

    const ritual = engine.ingestEvent(event);

    expect(ritual).not.toBeNull();
    expect(ritual?.actionType).toBe('DRAW_FORTUNE');
    expect(ritual?.fortune).toBeDefined();
    expect(ritual?.fortune?.number).toBeGreaterThan(0);
    expect(ritual?.fortune?.title).toBeTruthy();

    // Verify exactly 1 TTS payload queued
    expect(queuedTts.length).toBe(1);
    const item = queuedTts[0];
    expect(item.userId).toBe('u_fortune_1');
    expect(item.priority).toBe(85);
    expect(item.voice).toBe('vi-VN-HoaiMyNeural');
    expect(item.text).toContain('Phật tử');
    expect(item.text).toContain('Tâm An');
    // Verify Vietnamese text, zero English
    expect(item.text).not.toContain('undefined');
    expect(item.text).not.toContain('null');

    // Verify fortune execution record was stored
    const records = engine.getRecentFortuneExecutions();
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].status).toBe('ENQUEUED');
    expect(records[0].user.nickname).toBe('Tâm An');
    expect(records[0].fortune.number).toBe(ritual?.fortune?.number);

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('suppresses TTS when ttsReadFortunes is false but still dispatches visual fortune ritual', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-fortune-mute-'));
    const store = new SqlitePersistenceStore(tmpDir);

    const queuedTts: any[] = [];
    const tts = new PriorityTtsService({
      cacheDir: path.join(tmpDir, 'tts'),
      synthesizeEnabled: false
    });
    tts.enqueue = (item: any) => {
      queuedTts.push(item);
      return true;
    };

    const engine = new TempleStateEngine({
      store,
      tts
    });

    // Toggle reading OFF
    engine.updateSettings({
      ttsEnabled: true,
      ttsReadFortunes: false,
      fortuneEnabled: true
    });

    const event: NormalizedLiveEvent = {
      eventId: 'evt_mute_1',
      type: 'chat',
      timestamp: Date.now(),
      source: 'tiktok',
      user: { id: 'u_mute_1', uniqueId: 'tinh_tam', nickname: 'Tịnh Tâm', avatarUrl: '' },
      comment: 'xin xăm'
    };

    const ritual = engine.ingestEvent(event);
    expect(ritual?.actionType).toBe('DRAW_FORTUNE');
    expect(ritual?.fortune).toBeDefined();

    // Zero TTS queued
    expect(queuedTts.length).toBe(0);

    // Record has status SKIPPED with reason
    const records = engine.getRecentFortuneExecutions();
    expect(records[0].status).toBe('SKIPPED');
    expect(records[0].reason).toContain('Đã tắt tùy chọn Đọc Tóm Tắt Quẻ Xăm');

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('enforces per-user cooldown so User A cannot spam but User B can draw immediately', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-fortune-cooldown-'));
    const store = new SqlitePersistenceStore(tmpDir);

    const queuedTts: any[] = [];
    const tts = new PriorityTtsService({
      cacheDir: path.join(tmpDir, 'tts'),
      synthesizeEnabled: false
    });
    tts.enqueue = (item: any) => {
      queuedTts.push(item);
      return true;
    };

    const engine = new TempleStateEngine({
      store,
      tts
    });

    engine.updateSettings({
      ttsEnabled: true,
      ttsReadFortunes: true,
      fortuneEnabled: true,
      fortuneUserCooldownSec: 15,
      userCooldownMs: 0 // allow chat throughput for test
    });

    const baseTime = 100_000;

    // 1. User A draws at t = 100,000
    const ritualA1 = engine.ingestEvent({
      eventId: 'ev_a1',
      type: 'chat',
      timestamp: baseTime,
      source: 'tiktok',
      user: { id: 'user_A', uniqueId: 'user_a', nickname: 'Người Dùng A', avatarUrl: '' },
      comment: 'xin quẻ'
    });
    expect(ritualA1?.actionType).toBe('DRAW_FORTUNE');
    expect(queuedTts.length).toBe(1);

    // 2. User A asks again 3 seconds later (within 15s cooldown) -> Throttled
    const ritualA2 = engine.ingestEvent({
      eventId: 'ev_a2',
      type: 'chat',
      timestamp: baseTime + 3000,
      source: 'tiktok',
      user: { id: 'user_A', uniqueId: 'user_a', nickname: 'Người Dùng A', avatarUrl: '' },
      comment: 'xin quẻ tiếp'
    });
    // Fallback to incense prayer, fortune NOT drawn
    expect(ritualA2?.actionType).not.toBe('DRAW_FORTUNE');
    expect(queuedTts.length).toBe(1); // no new fortune TTS

    // 3. User B asks at t = 100,000 + 4000 -> Allowed immediately!
    const ritualB = engine.ingestEvent({
      eventId: 'ev_b1',
      type: 'chat',
      timestamp: baseTime + 4000,
      source: 'tiktok',
      user: { id: 'user_B', uniqueId: 'user_b', nickname: 'Người Dùng B', avatarUrl: '' },
      comment: 'xin xăm đầu năm'
    });
    expect(ritualB?.actionType).toBe('DRAW_FORTUNE');
    expect(queuedTts.length).toBe(2);
    expect(queuedTts[1].userId).toBe('user_B');

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('formats TTS spoken text correctly across summary, full, and poem_meaning modes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-fortune-modes-'));
    const store = new SqlitePersistenceStore(tmpDir);

    const queuedTts: any[] = [];
    const tts = new PriorityTtsService({
      cacheDir: path.join(tmpDir, 'tts'),
      synthesizeEnabled: false
    });
    tts.enqueue = (item: any) => {
      queuedTts.push(item);
      return true;
    };

    const engine = new TempleStateEngine({
      store,
      tts
    });

    // Test mode 'full'
    engine.updateSettings({
      ttsEnabled: true,
      ttsReadFortunes: true,
      fortuneEnabled: true,
      fortuneReadMode: 'full'
    });
    const ritualFull = engine.triggerManualFortuneTest({ mode: 'full', fortuneId: 1 });
    expect(ritualFull.actionType).toBe('DRAW_FORTUNE');
    const fullTts = queuedTts.pop();
    expect(fullTts.text).toContain('xin được quẻ số 1');
    expect(fullTts.text).toContain('Bài thơ:');
    expect(fullTts.text).toContain('Ý nghĩa văn hóa:');

    // Test mode 'poem_meaning'
    engine.updateSettings({ fortuneReadMode: 'poem_meaning' });
    const ritualPoem = engine.triggerManualFortuneTest({ mode: 'poem_meaning', fortuneId: 6 });
    expect(ritualPoem.actionType).toBe('DRAW_FORTUNE');
    const poemTts = queuedTts.pop();
    expect(poemTts.text).toContain('Quẻ số 6');
    expect(poemTts.text).toContain('Lời thơ:');
    expect(poemTts.text).toContain('Lời khuyên văn hóa:');

    // Test mode 'summary'
    engine.updateSettings({ fortuneReadMode: 'summary' });
    const ritualSummary = engine.triggerManualFortuneTest({ mode: 'summary', fortuneId: 8 });
    expect(ritualSummary.actionType).toBe('DRAW_FORTUNE');
    const sumTts = queuedTts.pop();
    expect(sumTts.text).toContain('bốc được');

    // Test replay of last fortune
    const replayed = engine.replayLastFortune();
    expect(replayed).not.toBeNull();
    expect(queuedTts.length).toBe(1);
    expect(queuedTts[0].priority).toBe(90);

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('manages 32 fortune sticks deck in SQLite persistence store', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-fortune-deck-'));
    const store = new SqlitePersistenceStore(tmpDir);

    const deck = store.loadFortuneDeck();
    expect(deck.length).toBeGreaterThanOrEqual(32);

    // Verify first stick has required cultural fields
    const stick1 = deck.find((s) => s.number === 1);
    expect(stick1).toBeDefined();
    expect(stick1?.title).toContain('Nhật Xuất');
    expect(stick1?.poem).toBeTruthy();
    expect(stick1?.meaning).toBeTruthy();
    expect(stick1?.ttsSummary).toBeTruthy();

    // Verify custom stick edit persistence
    deck[0].meaning = 'Lời bình văn hóa đã được cập nhật kiểm thử.';
    store.saveFortuneDeck(deck);

    const reloadedDeck = store.loadFortuneDeck();
    expect(reloadedDeck[0].meaning).toBe('Lời bình văn hóa đã được cập nhật kiểm thử.');

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
