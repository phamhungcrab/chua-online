import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { SqlitePersistenceStore } from '../src/server/persistence/sqliteStore.ts';
import { TempleAudioEngine } from '../src/client/overlay/audio/TempleAudioEngine.ts';
import { DEFAULT_SETTINGS } from '../src/shared/constants.ts';

describe('Bug 1: Reset Session Audio Pipeline & Bug 2: Audio Library Filtering', () => {
  let tmpDir: string;
  let store: SqlitePersistenceStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-test-'));
    store = new SqlitePersistenceStore(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Bug 2: Audio Library Filtering & Track Updates', () => {
    it('correctly filters tracks by category and retrieves all tracks when category is omitted', () => {
      const dummyFile1 = path.join(tmpDir, 'track1.mp3');
      const dummyFile2 = path.join(tmpDir, 'track2.mp3');
      const dummyFile3 = path.join(tmpDir, 'track3.mp3');
      fs.writeFileSync(dummyFile1, Buffer.alloc(1024));
      fs.writeFileSync(dummyFile2, Buffer.alloc(2048));
      fs.writeFileSync(dummyFile3, Buffer.alloc(4096));

      store.saveAudioTrack({
        id: 't1',
        name: 'Nhạc Thiền An Lạc',
        filename: 'track1.mp3',
        filepath: dummyFile1,
        category: 'meditation',
        durationSec: 180,
        fileSizeBytes: 1024,
        mimeType: 'audio/mpeg',
        url: '/audio-uploads/track1.mp3',
        createdAt: 1000
      });

      store.saveAudioTrack({
        id: 't2',
        name: 'Chú Đại Bi',
        filename: 'track2.mp3',
        filepath: dummyFile2,
        category: 'chant',
        durationSec: 360,
        fileSizeBytes: 2048,
        mimeType: 'audio/mpeg',
        url: '/audio-uploads/track2.mp3',
        createdAt: 2000
      });

      store.saveAudioTrack({
        id: 't3',
        name: 'Tiếng Chuông Bát Nhã',
        filename: 'track3.mp3',
        filepath: dummyFile3,
        category: 'bell',
        durationSec: 15,
        fileSizeBytes: 4096,
        mimeType: 'audio/mpeg',
        url: '/audio-uploads/track3.mp3',
        createdAt: 3000
      });

      // 1. List all tracks
      const allTracks = store.listAudioTracks();
      expect(allTracks.length).toBe(3);

      // 2. Filter by meditation
      const meditationTracks = store.listAudioTracks('meditation');
      expect(meditationTracks.length).toBe(1);
      expect(meditationTracks[0].id).toBe('t1');

      // 3. Filter by chant
      const chantTracks = store.listAudioTracks('chant');
      expect(chantTracks.length).toBe(1);
      expect(chantTracks[0].id).toBe('t2');

      // 4. Filter by empty category (e.g. wooden_fish)
      const woodenFishTracks = store.listAudioTracks('wooden_fish');
      expect(woodenFishTracks.length).toBe(0);
    });

    it('allows updating the category of an existing track without affecting other fields', () => {
      const dummyFile = path.join(tmpDir, 'track_edit.mp3');
      fs.writeFileSync(dummyFile, Buffer.alloc(512));

      store.saveAudioTrack({
        id: 't_edit',
        name: 'Bản Nhạc Cần Đổi',
        filename: 'track_edit.mp3',
        filepath: dummyFile,
        category: 'meditation',
        durationSec: 120,
        fileSizeBytes: 512,
        mimeType: 'audio/mpeg',
        url: '/audio-uploads/track_edit.mp3',
        createdAt: 1000
      });

      // Update category to buddha_name
      const updated = store.updateAudioTrack('t_edit', { category: 'buddha_name' });
      expect(updated).not.toBeNull();
      expect(updated?.category).toBe('buddha_name');
      expect(updated?.name).toBe('Bản Nhạc Cần Đổi');

      // Verify category filtering finds it under buddha_name
      const buddhaList = store.listAudioTracks('buddha_name');
      expect(buddhaList.length).toBe(1);
      expect(buddhaList[0].id).toBe('t_edit');

      // And no longer under meditation
      const meditationList = store.listAudioTracks('meditation');
      expect(meditationList.length).toBe(0);
    });

    it('synchronizes real file size from disk if DB recorded 0 size', () => {
      const dummyFile = path.join(tmpDir, 'zero_size.mp3');
      fs.writeFileSync(dummyFile, Buffer.alloc(8192)); // Real size is 8192 bytes

      store.saveAudioTrack({
        id: 't_zero',
        name: 'Tệp Cần Đồng Bộ Kích Thước',
        filename: 'zero_size.mp3',
        filepath: dummyFile,
        category: 'meditation',
        durationSec: 0,
        fileSizeBytes: 0, // Recorded as 0
        mimeType: 'audio/mpeg',
        url: '/audio-uploads/zero_size.mp3',
        createdAt: 1000
      });

      const tracks = store.listAudioTracks('meditation');
      expect(tracks.length).toBe(1);
      expect(tracks[0].fileSizeBytes).toBe(8192); // Synced from disk!
    });
  });

  describe('Bug 1: Reset Session Audio Pipeline Distinction & Non-Locking Behavior', () => {
    it('resetSession does not permanently mute or lock audio engine', () => {
      const engine = new TempleAudioEngine();
      engine.applySettings(DEFAULT_SETTINGS);
      engine.setAudioLeader(true);

      // Verify initial state
      expect(engine.getIsMuted()).toBe(false);

      // Queue an item
      engine.enqueueTts({
        id: 'tts_1',
        text: 'Nam Mô A Di Đà Phật',
        audioUrl: '/audio/test.mp3',
        voice: 'vi-VN-HoaiMyNeural',
        priority: 1,
        traceId: 'tr_1'
      });

      // Call resetSession
      engine.resetSession();

      // Ensure engine is unmuted and ready
      expect(engine.getIsMuted()).toBe(false);
      expect(engine.getIsAudioLeader()).toBe(true);

      // Calling enqueueTts after reset must work and not throw
      expect(() => {
        engine.enqueueTts({
          id: 'tts_2',
          text: 'Phật tử xin quẻ xăm thành công',
          audioUrl: '/audio/test2.mp3',
          voice: 'vi-VN-NamMinhNeural',
          priority: 2,
          traceId: 'tr_2'
        });
      }).not.toThrow();
    });

    it('clearly distinguishes Reset Session vs Stop Current Audio vs Emergency Mute', () => {
      const engine = new TempleAudioEngine();
      engine.applySettings(DEFAULT_SETTINGS);
      engine.setAudioLeader(true);

      // 1. Emergency Mute
      engine.setMuted(true);
      expect(engine.getIsMuted()).toBe(true);

      // 2. Reset Session explicitly restores unmuted operational state
      engine.resetSession();
      expect(engine.getIsMuted()).toBe(false);

      // 3. Stop current audio stops playing audio but leaves engine alive
      engine.stopCurrentAudio();
      expect(engine.getIsMuted()).toBe(false);
    });
  });
});
