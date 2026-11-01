import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_SCENE_CONFIG } from '../src/shared/constants.ts';
import type { SceneAssetItem, SceneConfig, ScenePresetItem } from '../src/shared/types.ts';
import { PriorityTtsService } from '../src/server/audio/ttsService.ts';
import { createStudioServer, type StudioServerInstance } from '../src/server/httpServer.ts';
import { SqlitePersistenceStore } from '../src/server/persistence/sqliteStore.ts';
import { TempleStateEngine } from '../src/server/state/templeStateEngine.ts';

const TEST_DATA_DIR = path.resolve(__dirname, '../data-test-scene-editor');
const ADMIN_TOKEN = 'test_scene_token_123';

describe('Professional Scene Editor & Layer Management Suite', () => {
  let store: SqlitePersistenceStore;
  let tts: PriorityTtsService;
  let engine: TempleStateEngine;
  let serverInstance: StudioServerInstance;
  let serverPort: number;

  beforeAll(async () => {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    store = new SqlitePersistenceStore(TEST_DATA_DIR);
    tts = new PriorityTtsService({ cacheDir: TEST_DATA_DIR, synthesizeEnabled: false });
    engine = new TempleStateEngine({ store, tts });

    serverInstance = await createStudioServer({
      port: 0,
      host: '127.0.0.1',
      dataDir: TEST_DATA_DIR,
      adminToken: ADMIN_TOKEN,
      synthesizeTtsEnabled: false
    });
    serverPort = serverInstance.port;
  });

  afterAll(async () => {
    await serverInstance.close();
    store.close();
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  });

  describe('1. SQLite Persistence for Scene Assets, Config & Presets', () => {
    it('seeds built-in presets on initialization', () => {
      const presets = store.loadScenePresets();
      expect(presets.length).toBeGreaterThanOrEqual(4);
      const sacred = presets.find((p) => p.id === 'preset_sacred_hall');
      expect(sacred).toBeDefined();
      expect(sacred?.name).toContain('Chánh Điện Tịnh Tâm');
      expect(sacred?.isBuiltin).toBe(true);
    });

    it('saves, lists, and deletes scene assets', () => {
      const asset: SceneAssetItem = {
        id: 'asset_test_1',
        name: 'Phông Chùa Vàng',
        filename: 'phong_chua_vang.png',
        filepath: path.join(TEST_DATA_DIR, 'phong_chua_vang.png'),
        targetLayer: 'background',
        mediaType: 'image',
        fileSizeBytes: 1024 * 50,
        mimeType: 'image/png',
        width: 1080,
        height: 1920,
        url: '/scene-assets/phong_chua_vang.png',
        createdAt: Date.now()
      };

      store.saveSceneAsset(asset);
      const list = store.listSceneAssets();
      expect(list.some((a) => a.id === 'asset_test_1')).toBe(true);

      const filtered = store.listSceneAssets('background');
      expect(filtered.some((a) => a.id === 'asset_test_1')).toBe(true);

      const filteredOther = store.listSceneAssets('foreground');
      expect(filteredOther.some((a) => a.id === 'asset_test_1')).toBe(false);

      const delOk = store.deleteSceneAsset('asset_test_1');
      expect(delOk).toBe(true);
      expect(store.listSceneAssets().some((a) => a.id === 'asset_test_1')).toBe(false);
    });

    it('saves and loads active scene configuration', () => {
      const customConfig: SceneConfig = {
        ...DEFAULT_SCENE_CONFIG,
        name: 'Chánh Điện Test Custom',
        ambience: 'GOLDEN_DUSK',
        anchors: {
          ...DEFAULT_SCENE_CONFIG.anchors,
          buddhaStatue: { x: 550, y: 530, scale: 1.1, visible: true }
        }
      };

      store.saveActiveSceneConfig(customConfig);
      const loaded = store.loadActiveSceneConfig();
      expect(loaded.name).toBe('Chánh Điện Test Custom');
      expect(loaded.ambience).toBe('GOLDEN_DUSK');
      expect(loaded.anchors.buddhaStatue.x).toBe(550);
      expect(loaded.anchors.buddhaStatue.scale).toBe(1.1);
    });

    it('saves, loads, and deletes custom presets', () => {
      const customPreset: ScenePresetItem = {
        id: 'preset_user_custom',
        name: 'Thiền Đường Trăng Rằm',
        isBuiltin: false,
        config: {
          ...DEFAULT_SCENE_CONFIG,
          name: 'Thiền Đường Trăng Rằm',
          ambience: 'SACRED_NIGHT'
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.saveScenePreset(customPreset);
      const presets = store.loadScenePresets();
      const found = presets.find((p) => p.id === 'preset_user_custom');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Thiền Đường Trăng Rằm');

      const deleted = store.deleteScenePreset('preset_user_custom');
      expect(deleted).toBe(true);
      expect(store.loadScenePresets().some((p) => p.id === 'preset_user_custom')).toBe(false);

      // Cannot delete built-in presets
      const delBuiltin = store.deleteScenePreset('preset_sacred_hall');
      expect(delBuiltin).toBe(false);
    });
  });

  describe('2. TempleStateEngine Scene Validation & Guardrails', () => {
    it('returns default scene config with 8 layers and anchors', () => {
      const cfg = engine.getSceneConfig();
      expect(cfg).toBeDefined();
      expect(cfg.layers.length).toBeGreaterThanOrEqual(8);
      expect(cfg.anchors.buddhaStatue).toBeDefined();
      expect(cfg.anchors.ceremony).toBeDefined();
      expect(cfg.anchors.congregation).toBeDefined();
    });

    it('strictly enforces kneelY >= 960 guardrail so characters never step on altar', () => {
      const updated = engine.updateSceneConfig({
        anchors: {
          ...engine.getSceneConfig().anchors,
          ceremony: {
            spawnX: 540,
            spawnY: 1760,
            kneelX: 540,
            kneelY: 450, // Illegally inside altar area (< 960)
            exitX: 540,
            exitY: 1840,
            visible: true
          }
        }
      });

      // Clamped to 960!
      expect(updated.anchors.ceremony.kneelY).toBe(960);
    });

    it('strictly enforces congregation.yTop >= 1100 guardrail', () => {
      const updated = engine.updateSceneConfig({
        anchors: {
          ...engine.getSceneConfig().anchors,
          congregation: {
            yTop: 800, // Illegally overlapping altar
            yBottom: 1700,
            halfTop: 360,
            halfBottom: 480,
            visible: true
          }
        }
      });

      expect(updated.anchors.congregation.yTop).toBe(1100);
    });

    it('includes sceneConfig in getSnapshot()', () => {
      const snap = engine.getSnapshot(
        { state: 'idle', uniqueId: '', roomId: '', viewerCount: 0, reconnectAttempt: 0, nextRetryInMs: 0, lastFrameAt: 0, lastError: '' },
        { running: false, scenario: 'serene', intervalMs: 1000, eventsGenerated: 0 }
      );
      expect(snap.sceneConfig).toBeDefined();
      expect(snap.sceneConfig?.layers.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('3. HTTP Server Scene Endpoints & Security Checks', () => {
    it('GET /api/state includes sceneConfig', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/state`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.snapshot.sceneConfig).toBeDefined();
      expect(data.snapshot.sceneConfig.layers.length).toBeGreaterThanOrEqual(8);
    });

    it('POST /api/admin/scene/active returns active scene config', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.sceneConfig).toBeDefined();
    });

    it('POST /api/admin/scene/active/update applies and validates changes', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/active/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify({
          sceneConfig: {
            name: 'Chùa Live Đêm Trăng',
            anchors: {
              ceremony: {
                spawnX: 540,
                spawnY: 1760,
                kneelX: 540,
                kneelY: 500, // Should be clamped to 960
                exitX: 540,
                exitY: 1840,
                visible: true
              }
            }
          }
        })
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.sceneConfig.anchors.ceremony.kneelY).toBe(960);
    });

    it('POST /api/admin/scene/upload accepts valid PNG image and saves asset', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          'X-Admin-Token': ADMIN_TOKEN,
          'X-File-Name': encodeURIComponent('test_background.png'),
          'X-Asset-Name': encodeURIComponent('Ảnh Phông Test'),
          'X-Layer-Target': 'background'
        },
        body: pngBuffer
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.asset).toBeDefined();
      expect(data.asset.name).toBe('Ảnh Phông Test');
      expect(data.asset.targetLayer).toBe('background');

      // Verify file served statically via /scene-assets/*
      const staticRes = await fetch(`http://127.0.0.1:${serverPort}${data.asset.url}`);
      expect(staticRes.status).toBe(200);
      expect(staticRes.headers.get('content-type')).toContain('image/png');
    });

    it('POST /api/admin/scene/upload blocks unauthorized requests', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          'X-Admin-Token': 'wrong_token'
        },
        body: Buffer.from('data')
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/admin/scene/upload rejects disallowed file extensions', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-msdownload',
          'X-Admin-Token': ADMIN_TOKEN,
          'X-File-Name': 'malicious_script.exe'
        },
        body: Buffer.from('binary-content')
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('không được hỗ trợ');
    });

    it('rejects path traversal attacks on /scene-assets/*', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/scene-assets/..%2f..%2fpackage.json`);
      // Either 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(res.status);
    });

    it('POST /api/admin/scene/presets lists and applies presets', async () => {
      const listRes = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/presets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify({})
      });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.presets.length).toBeGreaterThanOrEqual(4);

      // Apply golden pagoda preset
      const applyRes = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/presets/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify({ id: 'preset_golden_pagoda' })
      });
      expect(applyRes.status).toBe(200);
      const applyData = await applyRes.json();
      expect(applyData.ok).toBe(true);
      expect(applyData.appliedPresetId).toBe('preset_golden_pagoda');
      expect(applyData.sceneConfig.ambience).toBe('GOLDEN_DUSK');
    });

    it('POST /api/admin/scene/reset resets active scene config to default', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/scene/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.sceneConfig.name).toBe(DEFAULT_SCENE_CONFIG.name);
    });
  });
});
