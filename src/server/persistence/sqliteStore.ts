import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  BUILTIN_SCENE_PRESETS,
  DEFAULT_EVENT_RULES,
  DEFAULT_SCENE_CONFIG,
  DEFAULT_SETTINGS,
  FORTUNE_STICKS_DECK
} from '../../shared/constants.ts';
import type {
  AudioCategory,
  AudioPlaylist,
  AudioTrackItem,
  DispatchedRitual,
  EventActionRule,
  FortuneStick,
  OfferingKind,
  PrayerRegistryItem,
  SceneAssetItem,
  SceneConfig,
  SceneLayerId,
  ScenePresetItem,
  SeatedViewer,
  TempleSettings
} from '../../shared/types.ts';

export interface PersistedTotals {
  meritPoints: number;
  incenseBurned: number;
  woodenFishHits: number;
  bellRings: number;
  lanternsReleased: number;
  fortunesDrawn: number;
  offerings: Record<OfferingKind, number>;
}

const DEFAULT_TOTALS: PersistedTotals = {
  meritPoints: 108,
  incenseBurned: 27,
  woodenFishHits: 108,
  bellRings: 12,
  lanternsReleased: 9,
  fortunesDrawn: 6,
  offerings: {
    lotus: 3,
    lamp: 2,
    fruit: 1,
    dragon: 0
  }
};

export class SqlitePersistenceStore {
  private readonly dbPath: string;
  private readonly backupDir: string;
  private readonly db: DatabaseSync;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.backupDir = path.join(dataDir, 'backups');
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.dbPath = path.join(dataDir, 'temple-studio.sqlite');
    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS viewers (
        id TEXT PRIMARY KEY,
        unique_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        skin TEXT NOT NULL,
        merit_points INTEGER NOT NULL DEFAULT 0,
        incense_count INTEGER NOT NULL DEFAULT 0,
        gifts_count INTEGER NOT NULL DEFAULT 0,
        diamonds_total INTEGER NOT NULL DEFAULT 0,
        last_wish TEXT NOT NULL DEFAULT '',
        joined_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ritual_logs (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        merit_awarded INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prayer_registry (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        wish_text TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'BÌNH AN',
        merit_awarded INTEGER NOT NULL DEFAULT 5,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audio_tracks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        category TEXT NOT NULL,
        duration_sec REAL NOT NULL DEFAULT 0,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
        is_default_for TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audio_playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        track_ids_json TEXT NOT NULL DEFAULT '[]',
        mode TEXT NOT NULL DEFAULT 'loop_all',
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scene_assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        target_layer TEXT NOT NULL,
        media_type TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER NOT NULL DEFAULT 0,
        height INTEGER NOT NULL DEFAULT 0,
        url TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scene_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        config_json TEXT NOT NULL,
        preview_thumbnail TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    try {
      const presetCount = this.db.prepare('SELECT COUNT(*) as c FROM scene_presets').get() as { c: number } | undefined;
      if (!presetCount || presetCount.c === 0) {
        for (const p of BUILTIN_SCENE_PRESETS) {
          this.saveScenePreset(p);
        }
      }
    } catch {
      // ignore
    }
  }

  public loadSettings(): TempleSettings {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('settings') as { value_json: string } | undefined;
    if (!row) {
      this.saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    try {
      const parsed = JSON.parse(row.value_json);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  public saveSettings(settings: TempleSettings): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('settings', JSON.stringify(settings), Date.now());
  }

  public loadRules(): EventActionRule[] {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('rules') as { value_json: string } | undefined;
    if (!row) {
      const defaults = [...DEFAULT_EVENT_RULES];
      this.saveRules(defaults);
      return defaults;
    }
    try {
      const parsed = JSON.parse(row.value_json);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migration check for fortune chat rule conditions to ensure full keywords
        const fortuneRule = parsed.find((r) => r.id === 'rule_fortune_chat');
        const defaultFortuneRule = DEFAULT_EVENT_RULES.find((r) => r.id === 'rule_fortune_chat');
        if (
          fortuneRule &&
          defaultFortuneRule &&
          (!fortuneRule.conditions || fortuneRule.conditions.length < defaultFortuneRule.conditions.length)
        ) {
          fortuneRule.conditions = [...defaultFortuneRule.conditions];
          this.saveRules(parsed);
        }
        return parsed;
      }
      return [...DEFAULT_EVENT_RULES];
    } catch {
      return [...DEFAULT_EVENT_RULES];
    }
  }

  public saveRules(rules: EventActionRule[]): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('rules', JSON.stringify(rules), Date.now());
  }

  public loadFortuneDeck(): FortuneStick[] {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('fortune_deck') as { value_json: string } | undefined;
    if (!row) {
      const defaults = [...FORTUNE_STICKS_DECK];
      this.saveFortuneDeck(defaults);
      return defaults;
    }
    try {
      const parsed = JSON.parse(row.value_json);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If deck in DB has fewer sticks than builtin (e.g. earlier prototype had 18, now 32),
        // merge any new default sticks by number
        if (parsed.length < FORTUNE_STICKS_DECK.length) {
          const existingNums = new Set(parsed.map((p) => p.number));
          for (const stick of FORTUNE_STICKS_DECK) {
            if (!existingNums.has(stick.number)) {
              parsed.push(stick);
            }
          }
          parsed.sort((a: FortuneStick, b: FortuneStick) => a.number - b.number);
          this.saveFortuneDeck(parsed);
        }
        return parsed;
      }
      return [...FORTUNE_STICKS_DECK];
    } catch {
      return [...FORTUNE_STICKS_DECK];
    }
  }

  public saveFortuneDeck(deck: FortuneStick[]): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('fortune_deck', JSON.stringify(deck), Date.now());
  }

  public loadTotals(): PersistedTotals {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('totals') as { value_json: string } | undefined;
    if (!row) {
      this.saveTotals(DEFAULT_TOTALS);
      return JSON.parse(JSON.stringify(DEFAULT_TOTALS));
    }
    try {
      const parsed = JSON.parse(row.value_json);
      return {
        ...DEFAULT_TOTALS,
        ...parsed,
        offerings: { ...DEFAULT_TOTALS.offerings, ...(parsed.offerings || {}) }
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_TOTALS));
    }
  }

  public saveTotals(totals: PersistedTotals): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('totals', JSON.stringify(totals), Date.now());
  }

  public upsertViewer(v: SeatedViewer): void {
    this.db
      .prepare(
        `INSERT INTO viewers (
          id, unique_id, nickname, avatar_url, skin, merit_points, incense_count,
          gifts_count, diamonds_total, last_wish, joined_at, last_active_at, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          unique_id = excluded.unique_id,
          nickname = excluded.nickname,
          avatar_url = excluded.avatar_url,
          skin = excluded.skin,
          merit_points = excluded.merit_points,
          incense_count = excluded.incense_count,
          gifts_count = excluded.gifts_count,
          diamonds_total = excluded.diamonds_total,
          last_wish = excluded.last_wish,
          last_active_at = excluded.last_active_at,
          is_demo = excluded.is_demo`
      )
      .run(
        v.id,
        v.uniqueId,
        v.nickname,
        v.avatarUrl,
        v.skin,
        v.meritPoints,
        v.incenseCount,
        v.giftsCount,
        v.diamondsTotal,
        v.lastWish,
        v.joinedAt,
        v.lastActiveAt,
        v.isDemo ? 1 : 0
      );
  }

  public loadTopViewers(limit = 64): SeatedViewer[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM viewers WHERE is_demo = 0 ORDER BY merit_points DESC, last_active_at DESC LIMIT ?`
      )
      .all(limit) as Array<Record<string, any>>;

    return rows.map((r, idx) => ({
      id: String(r.id),
      uniqueId: String(r.unique_id),
      nickname: String(r.nickname),
      avatarUrl: String(r.avatar_url),
      skin: r.skin,
      seatIndex: idx,
      isVip: idx < 6 && Number(r.merit_points) > 0,
      vipRank: idx < 6 && Number(r.merit_points) > 0 ? idx + 1 : 0,
      meritPoints: Number(r.merit_points),
      incenseCount: Number(r.incense_count),
      giftsCount: Number(r.gifts_count),
      diamondsTotal: Number(r.diamonds_total),
      lastWish: String(r.last_wish),
      joinedAt: Number(r.joined_at),
      lastActiveAt: Number(r.last_active_at),
      isDemo: Boolean(r.is_demo)
    }));
  }

  public logRitual(ritual: DispatchedRitual): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO ritual_logs (id, action_type, user_id, nickname, merit_awarded, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ritual.id,
        ritual.actionType,
        ritual.user.id,
        ritual.user.nickname,
        ritual.meritAwarded,
        JSON.stringify(ritual),
        ritual.timestamp
      );

    // Keep table bounded to last 500 records
    this.db.exec(`
      DELETE FROM ritual_logs WHERE id NOT IN (
        SELECT id FROM ritual_logs ORDER BY created_at DESC LIMIT 500
      );
    `);
  }

  public logPrayer(prayer: PrayerRegistryItem): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO prayer_registry (id, user_id, nickname, wish_text, category, merit_awarded, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        prayer.id,
        prayer.userId,
        prayer.nickname,
        prayer.wishText,
        prayer.category,
        prayer.meritAwarded,
        prayer.createdAt
      );

    // Keep bounded to last 500 prayers
    this.db.exec(`
      DELETE FROM prayer_registry WHERE id NOT IN (
        SELECT id FROM prayer_registry ORDER BY created_at DESC LIMIT 500
      );
    `);
  }

  public loadRecentPrayers(limit = 40): PrayerRegistryItem[] {
    const rows = this.db
      .prepare(
        'SELECT id, user_id, nickname, wish_text, category, merit_awarded, created_at FROM prayer_registry ORDER BY created_at DESC LIMIT ?'
      )
      .all(limit) as Array<{
        id: string;
        user_id: string;
        nickname: string;
        wish_text: string;
        category: string;
        merit_awarded: number;
        created_at: number;
      }>;

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      nickname: r.nickname,
      wishText: r.wish_text,
      category: (r.category as any) || 'BÌNH AN',
      meritAwarded: Number(r.merit_awarded),
      createdAt: Number(r.created_at)
    }));
  }

  public resetSessionData(): PersistedTotals {
    this.db.exec(`DELETE FROM viewers; DELETE FROM ritual_logs; DELETE FROM prayer_registry;`);
    const fresh: PersistedTotals = {
      meritPoints: 0,
      incenseBurned: 9,
      woodenFishHits: 0,
      bellRings: 0,
      lanternsReleased: 0,
      fortunesDrawn: 0,
      offerings: { lotus: 1, lamp: 1, fruit: 1, dragon: 0 }
    };
    this.saveTotals(fresh);
    return fresh;
  }

  public createBackupSnapshot(): string {
    const bundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.loadSettings(),
      rules: this.loadRules(),
      totals: this.loadTotals()
    };
    const fileName = `backup_${Date.now()}.json`;
    const fullPath = path.join(this.backupDir, fileName);
    fs.writeFileSync(fullPath, JSON.stringify(bundle, null, 2), 'utf8');

    // Keep last 15 backups
    const files = fs.readdirSync(this.backupDir).sort();
    while (files.length > 15) {
      const old = files.shift();
      if (old) {
        try {
          fs.unlinkSync(path.join(this.backupDir, old));
        } catch {
          // ignore
        }
      }
    }
    return fileName;
  }

  public saveAudioTrack(track: AudioTrackItem): void {
    const stmt = this.db.prepare(`
      INSERT INTO audio_tracks (
        id, name, filename, filepath, category, duration_sec, file_size_bytes, mime_type, is_default_for, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        duration_sec = excluded.duration_sec,
        is_default_for = excluded.is_default_for
    `);
    stmt.run(
      track.id,
      track.name,
      track.filename,
      track.filepath,
      track.category,
      track.durationSec,
      track.fileSizeBytes,
      track.mimeType,
      track.isDefaultFor ?? null,
      track.createdAt
    );
  }

  public listAudioTracks(category?: AudioCategory): AudioTrackItem[] {
    const query = category
      ? 'SELECT * FROM audio_tracks WHERE category = ? ORDER BY created_at DESC'
      : 'SELECT * FROM audio_tracks ORDER BY created_at DESC';
    const rows = (
      category ? this.db.prepare(query).all(category) : this.db.prepare(query).all()
    ) as Array<{
      id: string;
      name: string;
      filename: string;
      filepath: string;
      category: AudioCategory;
      duration_sec: number;
      file_size_bytes: number;
      mime_type: string;
      is_default_for: string | null;
      created_at: number;
    }>;

    return rows.map((r) => {
      let sizeBytes = r.file_size_bytes;
      if ((!sizeBytes || sizeBytes <= 0) && r.filepath && fs.existsSync(r.filepath)) {
        try {
          const stat = fs.statSync(r.filepath);
          if (stat.size > 0) {
            sizeBytes = stat.size;
            this.db.prepare('UPDATE audio_tracks SET file_size_bytes = ? WHERE id = ?').run(sizeBytes, r.id);
          }
        } catch {
          // ignore
        }
      }
      return {
        id: r.id,
        name: r.name,
        filename: r.filename,
        filepath: r.filepath,
        category: r.category,
        durationSec: r.duration_sec,
        fileSizeBytes: sizeBytes,
        mimeType: r.mime_type,
        isDefaultFor: r.is_default_for,
        createdAt: r.created_at,
        url: `/audio-uploads/${encodeURIComponent(r.filename)}`
      };
    });
  }

  public getAudioTrack(id: string): AudioTrackItem | null {
    const row = this.db.prepare('SELECT * FROM audio_tracks WHERE id = ?').get(id) as
      | {
          id: string;
          name: string;
          filename: string;
          filepath: string;
          category: AudioCategory;
          duration_sec: number;
          file_size_bytes: number;
          mime_type: string;
          is_default_for: string | null;
          created_at: number;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      filename: row.filename,
      filepath: row.filepath,
      category: row.category,
      durationSec: row.duration_sec,
      fileSizeBytes: row.file_size_bytes,
      mimeType: row.mime_type,
      isDefaultFor: row.is_default_for,
      createdAt: row.created_at,
      url: `/audio-uploads/${encodeURIComponent(row.filename)}`
    };
  }

  public updateAudioTrack(
    id: string,
    patch: { name?: string; category?: AudioCategory; isDefaultFor?: string | null }
  ): AudioTrackItem | null {
    const existing = this.getAudioTrack(id);
    if (!existing) return null;
    const name = patch.name !== undefined ? patch.name : existing.name;
    const category = patch.category !== undefined ? patch.category : existing.category;
    const isDefaultFor = patch.isDefaultFor !== undefined ? patch.isDefaultFor : (existing.isDefaultFor ?? null);

    // If setting default for a channel, clear default from other tracks
    if (isDefaultFor) {
      this.db
        .prepare('UPDATE audio_tracks SET is_default_for = NULL WHERE is_default_for = ?')
        .run(isDefaultFor);
    }

    this.db
      .prepare('UPDATE audio_tracks SET name = ?, category = ?, is_default_for = ? WHERE id = ?')
      .run(name, category, isDefaultFor, id);

    return this.getAudioTrack(id);
  }

  public deleteAudioTrack(id: string): boolean {
    const track = this.getAudioTrack(id);
    if (!track) return false;
    this.db.prepare('DELETE FROM audio_tracks WHERE id = ?').run(id);
    if (fs.existsSync(track.filepath)) {
      try {
        fs.unlinkSync(track.filepath);
      } catch {
        // ignore
      }
    }
    return true;
  }

  public savePlaylist(playlist: AudioPlaylist): void {
    const stmt = this.db.prepare(`
      INSERT INTO audio_playlists (id, name, track_ids_json, mode, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        track_ids_json = excluded.track_ids_json,
        mode = excluded.mode,
        is_active = excluded.is_active
    `);
    stmt.run(
      playlist.id,
      playlist.name,
      JSON.stringify(playlist.trackIds),
      playlist.mode,
      playlist.isActive ? 1 : 0,
      playlist.createdAt
    );
  }

  public listPlaylists(): AudioPlaylist[] {
    const rows = this.db
      .prepare('SELECT * FROM audio_playlists ORDER BY created_at DESC')
      .all() as Array<{
      id: string;
      name: string;
      track_ids_json: string;
      mode: 'sequence' | 'loop_all' | 'loop_one' | 'shuffle';
      is_active: number;
      created_at: number;
    }>;

    return rows.map((r) => {
      let trackIds: string[] = [];
      try {
        trackIds = JSON.parse(r.track_ids_json);
      } catch {
        trackIds = [];
      }
      return {
        id: r.id,
        name: r.name,
        trackIds,
        mode: r.mode,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at
      };
    });
  }

  public deletePlaylist(id: string): boolean {
    const res = this.db.prepare('DELETE FROM audio_playlists WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // ======================================================================
  // SCENE & BACKGROUND ASSET / PRESET MANAGEMENT
  // ======================================================================

  public saveSceneAsset(asset: SceneAssetItem): void {
    this.db
      .prepare(`
        INSERT INTO scene_assets (
          id, name, filename, filepath, target_layer, media_type,
          file_size_bytes, mime_type, width, height, url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          target_layer = excluded.target_layer,
          width = excluded.width,
          height = excluded.height
      `)
      .run(
        asset.id,
        asset.name,
        asset.filename,
        asset.filepath,
        asset.targetLayer,
        asset.mediaType,
        asset.fileSizeBytes,
        asset.mimeType,
        asset.width ?? 0,
        asset.height ?? 0,
        asset.url,
        asset.createdAt
      );
  }

  public listSceneAssets(targetLayer?: SceneLayerId): SceneAssetItem[] {
    let rows: any[];
    if (targetLayer) {
      rows = this.db
        .prepare('SELECT * FROM scene_assets WHERE target_layer = ? ORDER BY created_at DESC')
        .all(targetLayer);
    } else {
      rows = this.db.prepare('SELECT * FROM scene_assets ORDER BY created_at DESC').all();
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      filename: r.filename,
      filepath: r.filepath,
      targetLayer: r.target_layer as SceneLayerId,
      mediaType: r.media_type as 'image' | 'video',
      fileSizeBytes: r.file_size_bytes,
      mimeType: r.mime_type,
      width: r.width,
      height: r.height,
      url: r.url,
      createdAt: r.created_at
    }));
  }

  public getSceneAsset(id: string): SceneAssetItem | undefined {
    const r = this.db.prepare('SELECT * FROM scene_assets WHERE id = ?').get(id) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      name: r.name,
      filename: r.filename,
      filepath: r.filepath,
      targetLayer: r.target_layer as SceneLayerId,
      mediaType: r.media_type as 'image' | 'video',
      fileSizeBytes: r.file_size_bytes,
      mimeType: r.mime_type,
      width: r.width,
      height: r.height,
      url: r.url,
      createdAt: r.created_at
    };
  }

  public deleteSceneAsset(id: string): boolean {
    const asset = this.getSceneAsset(id);
    if (!asset) return false;
    try {
      if (fs.existsSync(asset.filepath)) {
        fs.unlinkSync(asset.filepath);
      }
    } catch {
      // ignore
    }
    const info = this.db.prepare('DELETE FROM scene_assets WHERE id = ?').run(id);
    return info.changes > 0;
  }

  public loadActiveSceneConfig(): SceneConfig {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('active_scene_config') as { value_json: string } | undefined;
    if (!row) {
      this.saveActiveSceneConfig(DEFAULT_SCENE_CONFIG);
      return { ...DEFAULT_SCENE_CONFIG };
    }
    try {
      const parsed = JSON.parse(row.value_json);
      return { ...DEFAULT_SCENE_CONFIG, ...parsed };
    } catch {
      return { ...DEFAULT_SCENE_CONFIG };
    }
  }

  public saveActiveSceneConfig(config: SceneConfig): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('active_scene_config', JSON.stringify(config), Date.now());
  }

  public loadScenePresets(): ScenePresetItem[] {
    const rows = this.db
      .prepare('SELECT * FROM scene_presets ORDER BY is_builtin DESC, created_at ASC')
      .all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      isBuiltin: Boolean(r.is_builtin),
      config: JSON.parse(r.config_json),
      thumbnailUrl: r.preview_thumbnail || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  public saveScenePreset(preset: ScenePresetItem): void {
    this.db
      .prepare(`
        INSERT INTO scene_presets (id, name, is_builtin, config_json, preview_thumbnail, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          config_json = excluded.config_json,
          preview_thumbnail = excluded.preview_thumbnail,
          updated_at = excluded.updated_at
      `)
      .run(
        preset.id,
        preset.name,
        preset.isBuiltin ? 1 : 0,
        JSON.stringify(preset.config),
        preset.thumbnailUrl || null,
        preset.createdAt,
        preset.updatedAt || Date.now()
      );
  }

  public deleteScenePreset(id: string): boolean {
    const info = this.db.prepare('DELETE FROM scene_presets WHERE id = ? AND is_builtin = 0').run(id);
    return info.changes > 0;
  }

  public getKv<T>(key: string, defaultValue?: T): T | null {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get(key) as { value_json: string } | undefined;
    if (!row) return defaultValue !== undefined ? defaultValue : null;
    try {
      return JSON.parse(row.value_json) as T;
    } catch {
      return defaultValue !== undefined ? defaultValue : null;
    }
  }

  public setKv(key: string, value: any): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run(key, JSON.stringify(value), Date.now());
  }

  public createConsistentSqliteBackup(targetFilePath: string): void {
    const dir = path.dirname(targetFilePath);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(targetFilePath)) {
      try {
        fs.unlinkSync(targetFilePath);
      } catch {
        // ignore
      }
    }
    const safePath = targetFilePath.replace(/'/g, "''");
    this.db.exec(`VACUUM INTO '${safePath}'`);
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}
