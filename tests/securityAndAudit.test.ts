import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { escapeHtml } from '../src/shared/escapeHtml.ts';
import { LiveEventDebugger } from '../src/server/engine/liveEventDebugger.ts';
import { createStudioServer } from '../src/server/httpServer.ts';
import { SqlitePersistenceStore } from '../src/server/persistence/sqliteStore.ts';
import { validateAndInspectAudioBuffer } from '../src/server/utils/audioValidator.ts';
import type { NormalizedLiveEvent } from '../src/shared/types.ts';

describe('Security, Auth, Reset Consistency & Audio Validation Suite', () => {
  let tmpDir: string;
  let studio: Awaited<ReturnType<typeof createStudioServer>>;
  let baseUrl: string;
  const adminToken = 'test-audit-token-1234567890';

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-security-audit-'));
    studio = await createStudioServer({
      host: '127.0.0.1',
      port: 0,
      dataDir: tmpDir,
      adminToken,
      synthesizeTtsEnabled: false
    });
    baseUrl = `http://${studio.host}:${studio.port}`;
  });

  afterEach(async () => {
    await studio.close();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('1. Admin Security, Auth & Endpoint Protection', () => {
    it('reports initial auth status and protects diagnostic / config export endpoints from unauthorized access', async () => {
      // 1. Initial auth status
      const statusRes = await fetch(`${baseUrl}/api/auth/status`);
      expect(statusRes.status).toBe(200);
      const statusJson = await statusRes.json();
      expect(statusJson.ok).toBe(true);
      expect(statusJson.authenticated).toBe(false);

      // 2. Unauthenticated GET /api/config/export -> 401
      const unauthConfigRes = await fetch(`${baseUrl}/api/config/export`);
      expect(unauthConfigRes.status).toBe(401);

      // 3. Unauthenticated GET /api/admin/diagnostics/export -> 401
      const unauthDiagRes = await fetch(`${baseUrl}/api/admin/diagnostics/export`);
      expect(unauthDiagRes.status).toBe(401);

      const unauthDiagRes2 = await fetch(`${baseUrl}/api/diagnostics/export`);
      expect(unauthDiagRes2.status).toBe(401);

      // 4. Authenticated GET /api/admin/diagnostics/export -> 200 with dynamic version (not hardcoded 1.0.0)
      const authDiagRes = await fetch(`${baseUrl}/api/admin/diagnostics/export`, {
        headers: { 'X-Admin-Token': adminToken }
      });
      expect(authDiagRes.status).toBe(200);
      const diagJson = await authDiagRes.json();
      expect(diagJson.version).toBe('1.0.2');
      expect(diagJson.gitCommit).toBeDefined();
      expect(diagJson.snapshot).toBeDefined();
    });

    it('enforces rate limiting on /api/auth/login after 5 consecutive failed attempts', async () => {
      // Setup a password first
      const setupRes = await fetch(`${baseUrl}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'CorrectPassword2026' })
      });
      expect(setupRes.status).toBe(200);

      // 5 consecutive wrong passwords
      for (let i = 1; i <= 4; i++) {
        const failRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'WrongPassword' })
        });
        expect(failRes.status).toBe(401);
      }

      // 5th attempt locks out
      const fifthRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'WrongPassword' })
      });
      expect(fifthRes.status).toBe(401);

      // 6th attempt should be blocked with 429 Too Many Requests
      const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'CorrectPassword2026' })
      });
      expect(blockedRes.status).toBe(429);
      const blockedJson = await blockedRes.json();
      expect(blockedJson.error).toContain('Quá nhiều lần đăng nhập sai');
    });

    it('does not expose persistent admin token in /admin.html when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/admin.html`);
      expect(res.status).toBe(200);
      const html = await res.text();
      // Must NOT contain the secret adminToken in meta tag for unauthenticated visitors
      expect(html).not.toContain(adminToken);
      expect(html).toContain('meta name="temple-admin-token" content=""');
    });

    it('ensures /api/state does not leak passwords, salts, hashes or secret tokens', async () => {
      const res = await fetch(`${baseUrl}/api/state`);
      expect(res.status).toBe(200);
      const rawText = await res.text();
      expect(rawText).not.toContain(adminToken);
      expect(rawText).not.toContain('admin_auth_hash');
      expect(rawText).not.toContain('admin_auth_salt');
    });
  });

  describe('2. XSS & Injection Mitigation', () => {
    it('properly escapes all HTML special characters in escapeHtml()', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
      expect(escapeHtml("Hello 'World' & <Friends>")).toBe(
        'Hello &#39;World&#39; &amp; &lt;Friends&gt;'
      );
      expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
        '&lt;img src=x onerror=alert(1)&gt;'
      );
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(12345)).toBe('12345');
    });
  });

  describe('3. Reset Consistency (/api/admin/session/reset & /api/admin/system/reset)', () => {
    it('requires exact uppercase "RESET" confirmation on /api/admin/session/reset and /api/admin/system/reset', async () => {
      // Rejects without RESET on /api/admin/session/reset
      const badSessionReset = await fetch(`${baseUrl}/api/admin/session/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify({ confirmation: 'reset' }) // lowercase
      });
      expect(badSessionReset.status).toBe(400);

      // Rejects without RESET on /api/admin/system/reset
      const badSystemReset = await fetch(`${baseUrl}/api/admin/system/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify({ scope: 'session', confirmation: 'yes' })
      });
      expect(badSystemReset.status).toBe(400);

      // Succeeds with uppercase RESET on /api/admin/session/reset
      const goodSessionReset = await fetch(`${baseUrl}/api/admin/session/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify({ confirmation: 'RESET' })
      });
      expect(goodSessionReset.status).toBe(200);
      const resJson = await goodSessionReset.json();
      expect(resJson.ok).toBe(true);
      expect(resJson.scope).toBe('session');
      expect(resJson.snapshot.totals.incenseBurned).toBeGreaterThanOrEqual(0);
      expect(resJson.snapshot.seatedViewers.length).toBe(8); // Seeding 8 demo congregants
    });
  });

  describe('4. Audio File Signature Validation & Duration Parsing', () => {
    it('detects valid WAV headers and parses duration accurately', () => {
      const buffer = Buffer.alloc(1024);
      buffer.write('RIFF', 0, 4, 'ascii');
      buffer.writeUInt32LE(1024 - 8, 4);
      buffer.write('WAVE', 8, 4, 'ascii');
      buffer.write('fmt ', 12, 4, 'ascii');
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20); // PCM
      buffer.writeUInt16LE(1, 22); // mono
      buffer.writeUInt32LE(44100, 24); // sample rate
      buffer.writeUInt32LE(44100 * 2, 28); // byte rate (88200 bytes/sec)
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write('data', 36, 4, 'ascii');
      buffer.writeUInt32LE(88200 * 5, 40); // 5 seconds of audio

      const res = validateAndInspectAudioBuffer(buffer, 'bell.wav');
      expect(res.valid).toBe(true);
      expect(res.ext).toBe('.wav');
      expect(res.mimeType).toBe('audio/wav');
      expect(res.durationSec).toBe(5);
    });

    it('detects valid MP3 with ID3 header and estimates duration', () => {
      const buffer = Buffer.alloc(32000); // ~2 seconds at 128kbps
      buffer.write('ID3', 0, 3, 'ascii');
      buffer[3] = 0x03; // version 2.3
      buffer[4] = 0x00;
      buffer[5] = 0x00; // flags
      buffer.writeUInt32BE(0x10, 6); // tag size

      const res = validateAndInspectAudioBuffer(buffer, 'meditation.mp3');
      expect(res.valid).toBe(true);
      expect(res.ext).toBe('.mp3');
      expect(res.mimeType).toBe('audio/mpeg');
      expect(res.durationSec).toBeGreaterThanOrEqual(1);
    });

    it('rejects fake/corrupted files and empty buffers with clear error', () => {
      // Non-audio bytes disguised as audio
      const textBuffer = Buffer.alloc(512, 0x58);
      const res1 = validateAndInspectAudioBuffer(textBuffer, 'fake.mp3');
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('chữ ký');

      // Empty buffer
      const emptyBuffer = Buffer.alloc(0);
      const res2 = validateAndInspectAudioBuffer(emptyBuffer, 'empty.wav');
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('quá nhỏ hoặc rỗng');
    });
  });

  describe('5. Live Event Debugger Trace Stages', () => {
    it('correctly tracks and updates stages: RECEIVED -> ACCEPTED -> QUEUED -> SYNTHESIZED -> PLAYING -> COMPLETED / FAILED / CANCELLED', () => {
      const dbg = new LiveEventDebugger(50);
      const mockEvent: NormalizedLiveEvent = {
        eventId: 'evt_1001',
        source: 'tiktok',
        type: 'chat',
        user: { id: 'user_1', nickname: 'Thiện Tâm', uniqueId: 'thientam', avatarUrl: '' },
        comment: 'Nam mô A Di Đà Phật',
        timestamp: Date.now()
      };

      const trace = dbg.trackReceived(mockEvent);
      expect(trace.stage).toBe('RECEIVED');

      dbg.markAccepted(trace.traceId, 'Hợp lệ');
      expect(dbg.getTrace(trace.traceId)?.stage).toBe('ACCEPTED');

      dbg.markQueued(trace.traceId, 'vi-VN-HoaiMyNeural', 'Nam mô A Di Đà Phật', 1);
      expect(dbg.getTrace(trace.traceId)?.stage).toBe('QUEUED');

      dbg.markSynthesized(trace.traceId, '/tts-cache/test.mp3');
      expect(dbg.getTrace(trace.traceId)?.stage).toBe('SYNTHESIZED');

      dbg.markPlaying(trace.traceId, 'client_obs_1');
      expect(dbg.getTrace(trace.traceId)?.stage).toBe('PLAYING');

      // Test COMPLETED
      dbg.markCompleted(trace.traceId);
      expect(dbg.getTrace(trace.traceId)?.stage).toBe('COMPLETED');

      // Test FAILED
      const trace2 = dbg.trackReceived({ ...mockEvent, eventId: 'evt_1002' });
      dbg.markFailed(trace2.traceId, 'Lỗi kết nối âm thanh');
      expect(dbg.getTrace(trace2.traceId)?.stage).toBe('FAILED');
      expect(dbg.getTrace(trace2.traceId)?.reason).toBe('Lỗi kết nối âm thanh');

      // Test CANCELLED
      const trace3 = dbg.trackReceived({ ...mockEvent, eventId: 'evt_1003' });
      dbg.markCancelled(trace3.traceId, 'Hủy do Reset phiên');
      expect(dbg.getTrace(trace3.traceId)?.stage).toBe('CANCELLED');
      expect(dbg.getTrace(trace3.traceId)?.reason).toBe('Hủy do Reset phiên');
    });
  });
});
