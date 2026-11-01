import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/noto-serif/700.css';
import type {
  EventActionRule,
  ServerToClientWsMessage,
  TempleStateSnapshot
} from '../../shared/types.ts';

const tokenMeta = document.querySelector('meta[name="temple-admin-token"]');
const adminToken = tokenMeta?.getAttribute('content') || '';

const toastEl = document.getElementById('toastBar')!;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

async function callAdminApi(endpoint: string, payload: Record<string, any> = {}): Promise<any> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// UI Elements
const badgeTikTokEl = document.getElementById('badgeTikTok')!;
const badgeSimEl = document.getElementById('badgeSim')!;
const badgePerfEl = document.getElementById('badgePerf')!;
const previewSeatedCountEl = document.getElementById('previewSeatedCount')!;
const connectorDetailEl = document.getElementById('connectorDetail')!;

const inpTikTokUser = document.getElementById('inpTikTokUser') as HTMLInputElement;
const btnVerifyTikTok = document.getElementById('btnVerifyTikTok') as HTMLButtonElement | null;
const verifyResultEl = document.getElementById('verifyResult');
const inpSimName = document.getElementById('inpSimName') as HTMLInputElement;
const inpSimWish = document.getElementById('inpSimWish') as HTMLInputElement;

const inpSceneTitle = document.getElementById('inpSceneTitle') as HTMLInputElement;
const inpSceneSubtitle = document.getElementById('inpSceneSubtitle') as HTMLInputElement;
const selTimeOfDay = document.getElementById('selTimeOfDay') as HTMLSelectElement;
const selWeather = document.getElementById('selWeather') as HTMLSelectElement;
const selSeatCap = document.getElementById('selSeatCap') as HTMLSelectElement;
const selQuality = document.getElementById('selQuality') as HTMLSelectElement;
const selTargetFps = document.getElementById('selTargetFps') as HTMLSelectElement;
const rngSmoke = document.getElementById('rngSmoke') as HTMLInputElement;
const rngPetal = document.getElementById('rngPetal') as HTMLInputElement;
const lblSmoke = document.getElementById('lblSmoke')!;
const lblPetal = document.getElementById('lblPetal')!;

const chkFortune = document.getElementById('chkFortune') as HTMLInputElement;
const chkFlowerOffering = document.getElementById('chkFlowerOffering') as HTMLInputElement;
const chkSafeZones = document.getElementById('chkSafeZones') as HTMLInputElement;
const chkLunarFestival = document.getElementById('chkLunarFestival') as HTMLInputElement;
const chkIdleSerene = document.getElementById('chkIdleSerene') as HTMLInputElement;
const chkPrayers = document.getElementById('chkPrayers') as HTMLInputElement;

const btnTrigFlower = document.getElementById('btnTrigFlower') as HTMLButtonElement | null;
const btnTrigSerene = document.getElementById('btnTrigSerene') as HTMLButtonElement | null;

const liveEventStream = document.getElementById('liveEventStream')!;
const livePrayerRegistry = document.getElementById('livePrayerRegistry')!;
const btnClearLiveLogs = document.getElementById('btnClearLiveLogs')!;
const btnFilterAll = document.getElementById('btnFilterAll')!;
const btnFilterComment = document.getElementById('btnFilterComment')!;
const btnFilterGift = document.getElementById('btnFilterGift')!;
const btnFilterHeart = document.getElementById('btnFilterHeart')!;

const rngMasterVol = document.getElementById('rngMasterVol') as HTMLInputElement;
const rngMusicVol = document.getElementById('rngMusicVol') as HTMLInputElement;
const rngSfxVol = document.getElementById('rngSfxVol') as HTMLInputElement;
const rngTtsVol = document.getElementById('rngTtsVol') as HTMLInputElement;
const lblMasterVol = document.getElementById('lblMasterVol')!;
const lblMusicVol = document.getElementById('lblMusicVol')!;
const lblSfxVol = document.getElementById('lblSfxVol')!;
const lblTtsVol = document.getElementById('lblTtsVol')!;
const selTtsVoice = document.getElementById('selTtsVoice') as HTMLSelectElement;
const inpMoBpm = document.getElementById('inpMoBpm') as HTMLInputElement;

const rulesTableBody = document.getElementById('rulesTableBody')!;

let latestSnapshot: TempleStateSnapshot | null = null;
let formInitialized = false;

function renderSnapshot(snap: TempleStateSnapshot): void {
  latestSnapshot = snap;

  badgeTikTokEl.textContent = `TikTok: ${snap.connector.state.toUpperCase()}${snap.connector.uniqueId ? ' (@' + snap.connector.uniqueId + ')' : ''}`;
  badgeSimEl.textContent = `Simulator: ${snap.simulator.running ? snap.simulator.scenario.toUpperCase() : 'TẮT'}`;
  previewSeatedCountEl.textContent = `${snap.seatedViewers.length}/${snap.seatCapacity} vị`;
  connectorDetailEl.textContent = snap.connector.lastError || (snap.connector.roomId ? `Room: ${snap.connector.roomId}` : 'Sẵn sàng');

  const perf = snap.clientPerf[0];
  if (perf) {
    badgePerfEl.textContent = `Overlay: ${perf.fps} FPS (${perf.frameTimeMs}ms)`;
    document.getElementById('mClientFps')!.textContent = String(perf.fps);
    document.getElementById('mFrameTime')!.textContent = `${perf.frameTimeMs} ms`;
  }

  document.getElementById('mAccepted')!.textContent = String(snap.metrics.eventsAcceptedTotal);
  document.getElementById('mDedupe')!.textContent = String(snap.metrics.eventsDeduplicatedTotal);
  document.getElementById('mRateLimited')!.textContent = String(snap.metrics.eventsRateLimitedTotal);
  document.getElementById('mModerated')!.textContent = String(snap.metrics.eventsModeratedTotal);
  document.getElementById('mTtsQueue')!.textContent = String(snap.metrics.ttsQueueDepth);
  document.getElementById('mTtsProcessed')!.textContent = String(snap.metrics.ttsProcessedTotal);

  if (!formInitialized) {
    formInitialized = true;
    inpSceneTitle.value = snap.settings.title;
    inpSceneSubtitle.value = snap.settings.subtitle;
    selTimeOfDay.value = snap.settings.timeOfDay;
    selWeather.value = snap.settings.weather;
    selSeatCap.value = snap.settings.seatCapacityMode;
    selQuality.value = snap.settings.qualityPreset;
    selTargetFps.value = String(snap.settings.targetFps);
    rngSmoke.value = String(snap.settings.smokeDensity);
    rngPetal.value = String(snap.settings.petalDensity);
    lblSmoke.textContent = snap.settings.smokeDensity.toFixed(1);
    lblPetal.textContent = snap.settings.petalDensity.toFixed(1);

    chkFortune.checked = Boolean(snap.settings.fortuneEnabled);
    chkFlowerOffering.checked = Boolean(snap.settings.flowerOfferingEnabled);
    chkSafeZones.checked = Boolean(snap.settings.showSafeZones);
    chkLunarFestival.checked = Boolean(snap.settings.lunarFestivalAuto);
    chkIdleSerene.checked = Boolean(snap.settings.idleSereneChimes);
    chkPrayers.checked = Boolean(snap.settings.collectivePrayersEnabled);

    const s = snap.settings;
    const faderMaster = document.getElementById('faderMaster') as HTMLInputElement | null;
    const faderBgm = document.getElementById('faderBgm') as HTMLInputElement | null;
    const faderBell = document.getElementById('faderBell') as HTMLInputElement | null;
    const faderMo = document.getElementById('faderMo') as HTMLInputElement | null;
    const faderCeremony = document.getElementById('faderCeremony') as HTMLInputElement | null;
    const faderTts = document.getElementById('faderTts') as HTMLInputElement | null;

    if (faderMaster) {
      faderMaster.value = String(s.audioMasterVolume);
      const el = document.getElementById('valMixMaster');
      if (el) el.textContent = `${Math.round(s.audioMasterVolume * 100)}%`;
    }
    if (faderBgm) {
      faderBgm.value = String(s.audioMusicVolume);
      const el = document.getElementById('valMixBgm');
      if (el) el.textContent = `${Math.round(s.audioMusicVolume * 100)}%`;
    }
    if (faderBell) {
      faderBell.value = String(s.audioBellVolume ?? 0.9);
      const el = document.getElementById('valMixBell');
      if (el) el.textContent = `${Math.round((s.audioBellVolume ?? 0.9) * 100)}%`;
    }
    if (faderMo) {
      faderMo.value = String(s.audioWoodenFishVolume ?? 0.85);
      const el = document.getElementById('valMixMo');
      if (el) el.textContent = `${Math.round((s.audioWoodenFishVolume ?? 0.85) * 100)}%`;
    }
    if (faderCeremony) {
      faderCeremony.value = String(s.audioCeremonyVolume ?? 0.95);
      const el = document.getElementById('valMixCeremony');
      if (el) el.textContent = `${Math.round((s.audioCeremonyVolume ?? 0.95) * 100)}%`;
    }
    if (faderTts) {
      faderTts.value = String(s.audioTtsVolume);
      const el = document.getElementById('valMixTts');
      if (el) el.textContent = `${Math.round(s.audioTtsVolume * 100)}%`;
    }

    const selVoice = document.getElementById('selTtsVoice') as HTMLSelectElement | null;
    if (selVoice) selVoice.value = s.ttsVoice;

    const rngRate = document.getElementById('rngTtsRate') as HTMLInputElement | null;
    if (rngRate) {
      rngRate.value = String(s.ttsRatePercent ?? -12);
      const el = document.getElementById('lblTtsRate');
      if (el) el.textContent = `${s.ttsRatePercent}% (Trang nghiêm)`;
    }

    const rngPitch = document.getElementById('rngTtsPitch') as HTMLInputElement | null;
    if (rngPitch) {
      rngPitch.value = String(s.ttsPitchHz ?? -6);
      const el = document.getElementById('lblTtsPitch');
      if (el) el.textContent = `${s.ttsPitchHz}Hz (Ấm trầm)`;
    }

    const inpDiamonds = document.getElementById('inpTtsMinDiamonds') as HTMLInputElement | null;
    if (inpDiamonds) inpDiamonds.value = String(s.ttsMinGiftDiamonds ?? 1);

    const chkFreeComments = document.getElementById('chkReadFreeComments') as HTMLInputElement | null;
    if (chkFreeComments) chkFreeComments.checked = Boolean(s.ttsReadFreeComments);

    const chkReadPrayers = document.getElementById('chkReadPrayers') as HTMLInputElement | null;
    if (chkReadPrayers) chkReadPrayers.checked = Boolean(s.ttsReadPrayers);

    const chkReadFortunes = document.getElementById('chkReadFortunes') as HTMLInputElement | null;
    if (chkReadFortunes) chkReadFortunes.checked = Boolean(s.ttsReadFortunes);

    const chkModStrict = document.getElementById('chkModerationStrict') as HTMLInputElement | null;
    if (chkModStrict) chkModStrict.checked = Boolean(s.moderationEnabled);

    const chkDucking = document.getElementById('chkAudioDucking') as HTMLInputElement | null;
    if (chkDucking) chkDucking.checked = Boolean(s.audioDuckingEnabled ?? true);

    const rngDucking = document.getElementById('rngDuckingPercent') as HTMLInputElement | null;
    if (rngDucking) {
      rngDucking.value = String(s.audioDuckingPercent ?? 70);
      const el = document.getElementById('lblDuckingPercent');
      if (el) el.textContent = `${s.audioDuckingPercent ?? 70}%`;
    }

    const chkChant = document.getElementById('chkAutoChant') as HTMLInputElement | null;
    if (chkChant) chkChant.checked = Boolean(s.autoChantEnabled);

    const inpChantInterval = document.getElementById('inpAutoChantInterval') as HTMLInputElement | null;
    if (inpChantInterval) inpChantInterval.value = String(s.autoChantIntervalMin ?? 4);

    const chkMoRhythm = document.getElementById('chkWoodenFishRhythm') as HTMLInputElement | null;
    if (chkMoRhythm) chkMoRhythm.checked = Boolean(s.woodenFishRhythmEnabled);

    const inpBpm = document.getElementById('inpMoBpm') as HTMLInputElement | null;
    if (inpBpm) {
      inpBpm.value = String(s.woodenFishBpm ?? 52);
      const el = document.getElementById('lblMoBpm');
      if (el) el.textContent = `${s.woodenFishBpm ?? 52} BPM`;
    }

    const btnMasterTts = document.getElementById('btnToggleMasterTts');
    if (btnMasterTts) {
      btnMasterTts.textContent = s.ttsEnabled ? '🎙️ Giọng Đọc: ĐANG BẬT' : '🔇 ĐÃ TẮT GIỌNG ĐỌC';
      btnMasterTts.className = s.ttsEnabled ? 'gold' : '';
    }
  }

  if (snap.prayers && snap.prayers.length > 0) {
    livePrayerRegistry.replaceChildren();
    for (const p of snap.prayers.slice(0, 30)) {
      const row = document.createElement('div');
      row.style.borderBottom = '1px solid rgba(229,184,91,0.15)';
      row.style.paddingBottom = '4px';
      const timeStr = new Date(p.createdAt).toLocaleTimeString('vi-VN');
      row.innerHTML = `<span style="color:var(--gold-bright); font-weight:600;">[${p.category}]</span> <b style="color:var(--text);">${p.nickname}</b> <span style="color:var(--muted); font-size:11px;">(${timeStr})</span>: <span style="font-style:italic;">"${p.wishText}"</span>`;
      livePrayerRegistry.appendChild(row);
    }
  }

  renderRulesTable(snap.rules);
}

function renderRulesTable(rules: EventActionRule[]): void {
  rulesTableBody.replaceChildren();
  for (const r of rules) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.style.fontWeight = '600';
    tdName.textContent = r.name;

    const tdCond = document.createElement('td');
    tdCond.textContent = r.conditions.map((c) => `${c.field} ${c.op} "${c.value}"`).join(` ${r.matchMode.toUpperCase()} `);

    const tdAct = document.createElement('td');
    tdAct.textContent = r.actionType;

    const tdPrio = document.createElement('td');
    tdPrio.textContent = String(r.priority);

    const tdCd = document.createElement('td');
    tdCd.textContent = `${r.cooldownSec}s`;

    const tdToggle = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = r.enabled ? 'Đang BẬT' : 'Đang TẮT';
    if (r.enabled) btn.classList.add('gold');
    btn.onclick = async () => {
      try {
        const res = await callAdminApi('/api/admin/rules/upsert', {
          ...r,
          enabled: !r.enabled
        });
        renderSnapshot(res.snapshot);
        showToast(`Đã ${!r.enabled ? 'bật' : 'tắt'} luật: ${r.name}`);
      } catch (e: any) {
        showToast(`Lỗi: ${e.message}`);
      }
    };
    tdToggle.appendChild(btn);

    tr.append(tdName, tdCond, tdAct, tdPrio, tdCd, tdToggle);
    rulesTableBody.appendChild(tr);
  }
}

// Event Listeners
document.getElementById('btnCopyObsUrl')!.onclick = () => {
  const url = `${window.location.origin}/overlay?obs=1`;
  void navigator.clipboard?.writeText(url);
  showToast(`Đã copy: ${url}`);
};

document.getElementById('btnCopyTransparentUrl')!.onclick = () => {
  const url = `${window.location.origin}/overlay?obs=1&transparent=1`;
  void navigator.clipboard?.writeText(url);
  showToast(`Đã copy: ${url}`);
};

document.getElementById('btnConnectTikTok')!.onclick = async () => {
  try {
    showToast('Đang kết nối TikTok LIVE...');
    const res = await callAdminApi('/api/admin/tiktok/connect', {
      uniqueId: inpTikTokUser.value
    });
    renderSnapshot(res.snapshot);
    showToast(`Trạng thái TikTok: ${res.connector.state}`);
  } catch (e: any) {
    showToast(`Lỗi: ${e.message}`);
  }
};

document.getElementById('btnDisconnectTikTok')!.onclick = async () => {
  try {
    const res = await callAdminApi('/api/admin/tiktok/disconnect');
    renderSnapshot(res.snapshot);
    showToast('Đã ngắt kết nối TikTok LIVE');
  } catch (e: any) {
    showToast(`Lỗi: ${e.message}`);
  }
};

document.querySelectorAll<HTMLButtonElement>('[data-sim-mode]').forEach((btn) => {
  btn.onclick = async () => {
    const scenario = btn.getAttribute('data-sim-mode');
    const res = await callAdminApi('/api/admin/sim/auto', {
      enabled: true,
      scenario
    });
    renderSnapshot(res.snapshot);
    showToast(`Đã bật Simulator (${scenario})`);
  };
});

document.getElementById('btnStopSim')!.onclick = async () => {
  const res = await callAdminApi('/api/admin/sim/auto', { enabled: false });
  renderSnapshot(res.snapshot);
  showToast('Đã dừng Simulator');
};

document.querySelectorAll<HTMLButtonElement>('[data-fill]').forEach((btn) => {
  btn.onclick = async () => {
    const count = Number(btn.getAttribute('data-fill'));
    const res = await callAdminApi('/api/admin/congregation/fill', { count });
    renderSnapshot(res.snapshot);
    showToast(`Đã đổ ${count} Phật tử mẫu vào Chánh Điện`);
  };
});

document.getElementById('btnClearCongregation')!.onclick = async () => {
  const res = await callAdminApi('/api/admin/congregation/clear');
  renderSnapshot(res.snapshot);
  showToast('Đã làm trống Phật tử mẫu');
};

document.getElementById('btnBurst250')!.onclick = async () => {
  const res = await callAdminApi('/api/admin/sim/burst', { count: 250 });
  renderSnapshot(res.snapshot);
  showToast(`Đã xử lý Burst ${res.burst.generated} sự kiện trong ${res.burst.durationMs}ms`);
};

document.getElementById('btnBurst1000')!.onclick = async () => {
  const res = await callAdminApi('/api/admin/sim/burst', { count: 1000 });
  renderSnapshot(res.snapshot);
  showToast(`Đã xử lý Burst ${res.burst.generated} sự kiện trong ${res.burst.durationMs}ms`);
};

async function triggerSimEvent(payload: Record<string, any>, label: string): Promise<void> {
  try {
    const res = await callAdminApi('/api/admin/sim/event', {
      uniqueId: `sim_${Date.now() % 10000}`,
      nickname: inpSimName.value || 'Diệu Hạnh',
      ...payload
    });
    renderSnapshot(res.snapshot);
    showToast(`Đã phát: ${label}`);
  } catch (e: any) {
    showToast(`Lỗi: ${e.message}`);
  }
}

document.getElementById('btnTrigIncense')!.onclick = () =>
  void triggerSimEvent({ type: 'chat', comment: `Thắp hương: ${inpSimWish.value}` }, 'Dâng Tâm Hương');

document.getElementById('btnTrigLantern')!.onclick = () =>
  void triggerSimEvent({ type: 'chat', comment: `Cầu nguyện: ${inpSimWish.value}` }, 'Thả Đèn Hoa Đăng');

document.getElementById('btnTrigFortune')!.onclick = () =>
  void triggerSimEvent({ type: 'chat', comment: 'Con xin xăm đầu xuân cầu bình an' }, 'Xin Xăm Đầu Xuân');

document.getElementById('btnTrigLike')!.onclick = () =>
  void triggerSimEvent({ type: 'like', likeCount: 5 }, 'Thả Tim Gõ Mõ');

document.getElementById('btnTrigFollow')!.onclick = () =>
  void triggerSimEvent({ type: 'follow' }, 'Follow Thỉnh Chuông');

document.getElementById('btnTrigGiftSmall')!.onclick = () =>
  void triggerSimEvent(
    { type: 'gift', giftName: 'Đèn Lưu Ly Trí Tuệ', diamondCount: 15, repeatCount: 1, repeatEnd: true },
    'Dâng Đèn Lưu Ly'
  );

document.getElementById('btnTrigGiftGrand')!.onclick = () =>
  void triggerSimEvent(
    { type: 'gift', giftName: 'Đại Lễ Kim Liên Hào Quang', diamondCount: 299, repeatCount: 1, repeatEnd: true },
    'Đại Lễ Kim Liên Hào Quang'
  );

document.getElementById('btnTrigChant')!.onclick = async () => {
  const res = await callAdminApi('/api/admin/ritual/chant');
  renderSnapshot(res.snapshot);
  showToast('Đã khởi lễ Tụng Kinh & Thỉnh Chuông');
};

document.querySelectorAll<HTMLButtonElement>('[data-skin-cmd]').forEach((btn) => {
  btn.onclick = () => {
    const cmd = btn.getAttribute('data-skin-cmd') || 'nữ';
    void triggerSimEvent({ type: 'chat', comment: cmd }, `Đổi trang phục (${cmd})`);
  };
});

rngSmoke.oninput = () => {
  lblSmoke.textContent = Number(rngSmoke.value).toFixed(1);
};
rngPetal.oninput = () => {
  lblPetal.textContent = Number(rngPetal.value).toFixed(1);
};

document.getElementById('btnSaveSceneSettings')!.onclick = async () => {
  try {
    const res = await callAdminApi('/api/admin/settings', {
      title: inpSceneTitle.value,
      subtitle: inpSceneSubtitle.value,
      timeOfDay: selTimeOfDay.value,
      weather: selWeather.value,
      seatCapacityMode: selSeatCap.value,
      qualityPreset: selQuality.value,
      targetFps: Number(selTargetFps.value),
      smokeDensity: Number(rngSmoke.value),
      petalDensity: Number(rngPetal.value),
      fortuneEnabled: chkFortune.checked,
      flowerOfferingEnabled: chkFlowerOffering.checked,
      showSafeZones: chkSafeZones.checked,
      lunarFestivalAuto: chkLunarFestival.checked,
      idleSereneChimes: chkIdleSerene.checked,
      collectivePrayersEnabled: chkPrayers.checked
    });
    renderSnapshot(res.snapshot);
    showToast('Đã lưu và đồng bộ cấu hình Chánh Điện');
  } catch (e: any) {
    showToast(`Lỗi: ${e.message}`);
  }
};

// ======================================================================
// AUDIO & RITUAL CONTROL CENTER LOGIC
// ======================================================================

// 1. Navigation Tabs
document.querySelectorAll<HTMLButtonElement>('.audio-tab-btn[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.audio-tab-btn[data-tab]').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.audio-tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    if (tabId) {
      document.getElementById(tabId)?.classList.add('active');
    }
  });
});

// 2. Audio Track Management & Rendering
let currentCategoryFilter = 'all';

async function loadAudioTracks(): Promise<void> {
  try {
    const res = await callAdminApi('/api/admin/audio/tracks', {
      category: currentCategoryFilter === 'all' ? undefined : currentCategoryFilter
    });
    renderAudioTracks(res.tracks || []);
  } catch {
    // ignore
  }
}

function renderAudioTracks(tracks: any[]): void {
  const container = document.getElementById('audioTrackListContainer');
  const badge = document.getElementById('audioTrackCountBadge');
  if (badge) badge.textContent = `${tracks.length} tệp âm thanh`;
  if (!container) return;

  if (tracks.length === 0) {
    container.innerHTML =
      '<div style="color:var(--muted); font-size:13px; text-align:center; padding:18px;">Chưa có tệp âm thanh nào trong mục này. Hãy kéo thả tệp MP3/WAV/OGG ở trên.</div>';
    return;
  }

  container.replaceChildren();
  for (const tr of tracks) {
    const card = document.createElement('div');
    card.className = 'audio-track-card';
    const dateStr = new Date(tr.createdAt).toLocaleDateString('vi-VN');
    const sizeMb = (tr.fileSizeBytes / (1024 * 1024)).toFixed(1);

    const catNames: Record<string, string> = {
      meditation: 'Nhạc Thiền (BGM)',
      chant: 'Tụng Kinh',
      buddha_name: 'Niệm Phật',
      bell: 'Tiếng Chuông',
      wooden_fish: 'Tiếng Mõ',
      prayer: 'Lời Cầu Nguyện',
      greeting: 'Lời Chào',
      festival: 'Lễ Hội',
      sfx: 'Hiệu Ứng'
    };
    const catDisplay = catNames[tr.category] || tr.category;

    card.innerHTML = `
      <div class="audio-track-info">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="audio-category-pill">${catDisplay}</span>
          <span class="audio-track-title">${tr.name}</span>
        </div>
        <div class="audio-track-meta">
          <span>📁 ${tr.filename}</span>
          <span>⚖️ ${sizeMb} MB</span>
          <span>📅 ${dateStr}</span>
        </div>
        <audio controls src="${tr.url}" preload="none" style="width:100%; height:32px; margin-top:4px;"></audio>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
        <select class="sel-track-default" data-track-id="${tr.id}" style="font-size:12px; padding:4px 6px;">
          <option value="" ${!tr.isDefaultFor ? 'selected' : ''}>-- Không gán mặc định --</option>
          <option value="bgm" ${tr.isDefaultFor === 'bgm' ? 'selected' : ''}>🎵 Làm Nhạc Nền (BGM)</option>
          <option value="bell" ${tr.isDefaultFor === 'bell' ? 'selected' : ''}>🔔 Tiếng Chuông Lớn</option>
          <option value="wooden_fish" ${tr.isDefaultFor === 'wooden_fish' ? 'selected' : ''}>🪵 Tiếng Mõ Gỗ</option>
          <option value="ceremony" ${tr.isDefaultFor === 'ceremony' ? 'selected' : ''}>🪷 Nghi Lễ & Hoa Đăng</option>
        </select>
        <button type="button" class="btn-delete-track" data-track-id="${tr.id}" style="color:var(--danger); border-color:var(--danger); font-size:11px; padding:3px 8px;">🗑️ Xóa tệp</button>
      </div>
    `;
    container.appendChild(card);
  }

  container.querySelectorAll<HTMLSelectElement>('.sel-track-default').forEach((sel) => {
    sel.onchange = async () => {
      const trackId = sel.getAttribute('data-track-id');
      const isDefaultFor = sel.value || null;
      try {
        await callAdminApi('/api/admin/audio/tracks/update', { id: trackId, isDefaultFor });
        showToast('Đã cập nhật gán âm thanh mặc định');
        void loadAudioTracks();
      } catch (e: any) {
        showToast(`Lỗi: ${e.message}`);
      }
    };
  });

  container.querySelectorAll<HTMLButtonElement>('.btn-delete-track').forEach((btn) => {
    btn.onclick = async () => {
      const trackId = btn.getAttribute('data-track-id');
      if (!confirm('Bạn có chắc muốn xóa tệp âm thanh này khỏi thư viện?')) return;
      try {
        await callAdminApi('/api/admin/audio/tracks/delete', { id: trackId });
        showToast('Đã xóa tệp âm thanh thành công');
        void loadAudioTracks();
      } catch (e: any) {
        showToast(`Lỗi: ${e.message}`);
      }
    };
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-cat-filter]').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('[data-cat-filter]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategoryFilter = btn.getAttribute('data-cat-filter') || 'all';
    void loadAudioTracks();
  };
});

// 3. Audio File Upload
const dropzone = document.getElementById('audioDropzone');
const inpFileInput = document.getElementById('inpAudioFileInput') as HTMLInputElement | null;
const btnSelectFile = document.getElementById('btnSelectAudioFile');
const btnSubmitUpload = document.getElementById('btnSubmitAudioUpload');
const inpUploadName = document.getElementById('inpUploadAudioName') as HTMLInputElement | null;
const selUploadCat = document.getElementById('selUploadAudioCategory') as HTMLSelectElement | null;
const uploadStatusText = document.getElementById('uploadStatusText');

let selectedUploadFile: File | null = null;

if (btnSelectFile && inpFileInput) {
  btnSelectFile.onclick = () => inpFileInput.click();
  inpFileInput.onchange = () => {
    if (inpFileInput.files && inpFileInput.files[0]) {
      selectedUploadFile = inpFileInput.files[0];
      if (inpUploadName && !inpUploadName.value) {
        inpUploadName.value = selectedUploadFile.name.replace(/\.[^/.]+$/, '');
      }
      if (uploadStatusText) {
        uploadStatusText.textContent = `Đã chọn: ${selectedUploadFile.name} (${(selectedUploadFile.size / (1024 * 1024)).toFixed(1)} MB)`;
        uploadStatusText.style.color = 'var(--gold-bright)';
      }
    }
  };
}

if (dropzone) {
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      selectedUploadFile = e.dataTransfer.files[0];
      if (inpUploadName && !inpUploadName.value) {
        inpUploadName.value = selectedUploadFile.name.replace(/\.[^/.]+$/, '');
      }
      if (uploadStatusText) {
        uploadStatusText.textContent = `Đã chọn: ${selectedUploadFile.name} (${(selectedUploadFile.size / (1024 * 1024)).toFixed(1)} MB)`;
        uploadStatusText.style.color = 'var(--gold-bright)';
      }
    }
  });
}

if (btnSubmitUpload) {
  btnSubmitUpload.onclick = async () => {
    if (!selectedUploadFile) {
      showToast('Vui lòng chọn một tệp âm thanh (MP3, WAV, OGG, M4A)');
      return;
    }
    if (uploadStatusText) uploadStatusText.textContent = 'Đang tải tệp lên máy chủ...';
    try {
      const res = await fetch('/api/admin/audio/upload', {
        method: 'POST',
        headers: {
          'X-Admin-Token': adminToken,
          'X-Audio-Name': encodeURIComponent((inpUploadName?.value || selectedUploadFile.name).trim()),
          'X-Audio-Category': selUploadCat?.value || 'meditation',
          'X-File-Name': encodeURIComponent(selectedUploadFile.name),
          'Content-Type': selectedUploadFile.type || 'audio/mpeg'
        },
        body: selectedUploadFile
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Lỗi tải lên');

      showToast(`Đã tải lên tệp: ${data.track?.name || 'Thành công'}`);
      if (uploadStatusText) {
        uploadStatusText.textContent = '✓ Tải lên hoàn tất và đã lưu vào thư viện dữ liệu!';
        uploadStatusText.style.color = 'var(--jade)';
      }
      selectedUploadFile = null;
      if (inpUploadName) inpUploadName.value = '';
      void loadAudioTracks();
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
      if (uploadStatusText) {
        uploadStatusText.textContent = `Lỗi tải lên: ${e.message}`;
        uploadStatusText.style.color = 'var(--danger)';
      }
    }
  };
}

// 4. Master TTS Toggle & Preview Sandbox
const btnToggleMasterTts = document.getElementById('btnToggleMasterTts');
if (btnToggleMasterTts) {
  btnToggleMasterTts.onclick = async () => {
    if (!latestSnapshot) return;
    const nextState = !latestSnapshot.settings.ttsEnabled;
    try {
      const res = await callAdminApi('/api/admin/settings', { ttsEnabled: nextState });
      renderSnapshot(res.snapshot);
      btnToggleMasterTts.textContent = nextState ? '🎙️ Giọng Đọc: ĐANG BẬT' : '🔇 ĐÃ TẮT GIỌNG ĐỌC';
      btnToggleMasterTts.className = nextState ? 'gold' : '';
      showToast(nextState ? 'Đã bật giọng đọc TTS' : 'Đã tắt hoàn toàn giọng đọc TTS');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

const btnTestTtsPreview = document.getElementById('btnTestTtsPreview');
const txtTtsPreview = document.getElementById('txtTtsPreview') as HTMLInputElement | null;
const audioTtsPlayer = document.getElementById('audioTtsPlayer') as HTMLAudioElement | null;
if (btnTestTtsPreview) {
  btnTestTtsPreview.onclick = async () => {
    try {
      btnTestTtsPreview.textContent = '⏳ Đang tổng hợp...';
      const text = txtTtsPreview?.value || 'Nam mô A Di Đà Phật';
      const selVoice = (document.getElementById('selTtsVoice') as HTMLSelectElement).value;
      const rate = Number((document.getElementById('rngTtsRate') as HTMLInputElement).value);
      const pitch = Number((document.getElementById('rngTtsPitch') as HTMLInputElement).value);
      const res = await callAdminApi('/api/admin/audio/preview-tts', {
        text,
        voice: selVoice,
        ratePercent: rate,
        pitchHz: pitch
      });
      btnTestTtsPreview.textContent = '🔊 Nghe Thử';
      if (res.audioUrl && audioTtsPlayer) {
        audioTtsPlayer.style.display = 'block';
        audioTtsPlayer.src = res.audioUrl;
        await audioTtsPlayer.play();
        showToast('Đang phát thử nghiệm giọng đọc');
      } else {
        showToast('Không tạo được file âm thanh thử nghiệm');
      }
    } catch (e: any) {
      btnTestTtsPreview.textContent = '🔊 Nghe Thử';
      showToast(`Lỗi TTS: ${e.message}`);
    }
  };
}

const rngTtsRateEl = document.getElementById('rngTtsRate') as HTMLInputElement | null;
if (rngTtsRateEl) {
  rngTtsRateEl.oninput = () => {
    const el = document.getElementById('lblTtsRate');
    if (el) el.textContent = `${rngTtsRateEl.value}% (Trang nghiêm)`;
  };
}

const rngTtsPitchEl = document.getElementById('rngTtsPitch') as HTMLInputElement | null;
if (rngTtsPitchEl) {
  rngTtsPitchEl.oninput = () => {
    const el = document.getElementById('lblTtsPitch');
    if (el) el.textContent = `${rngTtsPitchEl.value}Hz (Ấm trầm)`;
  };
}

const btnSaveVoiceSettings = document.getElementById('btnSaveVoiceSettings');
if (btnSaveVoiceSettings) {
  btnSaveVoiceSettings.onclick = async () => {
    try {
      const res = await callAdminApi('/api/admin/settings', {
        ttsVoice: (document.getElementById('selTtsVoice') as HTMLSelectElement).value,
        ttsRatePercent: Number((document.getElementById('rngTtsRate') as HTMLInputElement).value),
        ttsPitchHz: Number((document.getElementById('rngTtsPitch') as HTMLInputElement).value),
        ttsMinGiftDiamonds: Number((document.getElementById('inpTtsMinDiamonds') as HTMLInputElement).value),
        ttsReadFreeComments: (document.getElementById('chkReadFreeComments') as HTMLInputElement).checked,
        ttsReadPrayers: (document.getElementById('chkReadPrayers') as HTMLInputElement).checked,
        ttsReadFortunes: (document.getElementById('chkReadFortunes') as HTMLInputElement).checked,
        moderationEnabled: (document.getElementById('chkModerationStrict') as HTMLInputElement).checked
      });
      renderSnapshot(res.snapshot);
      showToast('Đã lưu cấu hình Giọng đọc & Kiểm duyệt');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

// 5. Visual Audio Mixer Faders & Ducking
const faderMaster = document.getElementById('faderMaster') as HTMLInputElement | null;
const faderBgm = document.getElementById('faderBgm') as HTMLInputElement | null;
const faderBell = document.getElementById('faderBell') as HTMLInputElement | null;
const faderMo = document.getElementById('faderMo') as HTMLInputElement | null;
const faderCeremony = document.getElementById('faderCeremony') as HTMLInputElement | null;
const faderTts = document.getElementById('faderTts') as HTMLInputElement | null;

const valMixMaster = document.getElementById('valMixMaster');
const valMixBgm = document.getElementById('valMixBgm');
const valMixBell = document.getElementById('valMixBell');
const valMixMo = document.getElementById('valMixMo');
const valMixCeremony = document.getElementById('valMixCeremony');
const valMixTts = document.getElementById('valMixTts');

function bindFader(fader: HTMLInputElement | null, valEl: HTMLElement | null) {
  if (!fader || !valEl) return;
  fader.oninput = () => {
    valEl.textContent = `${Math.round(Number(fader.value) * 100)}%`;
  };
}
bindFader(faderMaster, valMixMaster);
bindFader(faderBgm, valMixBgm);
bindFader(faderBell, valMixBell);
bindFader(faderMo, valMixMo);
bindFader(faderCeremony, valMixCeremony);
bindFader(faderTts, valMixTts);

document.querySelectorAll<HTMLButtonElement>('.btn-mute-channel').forEach((btn) => {
  btn.onclick = () => {
    const isMuted = btn.classList.toggle('muted');
    btn.textContent = isMuted ? 'Bật lại' : 'Tắt Mute';
    const channel = btn.getAttribute('data-channel');
    if (channel === 'master' && faderMaster) {
      faderMaster.value = isMuted ? '0' : '0.9';
      if (valMixMaster) valMixMaster.textContent = isMuted ? '0%' : '90%';
    } else if (channel === 'bgm' && faderBgm) {
      faderBgm.value = isMuted ? '0' : '0.55';
      if (valMixBgm) valMixBgm.textContent = isMuted ? '0%' : '55%';
    } else if (channel === 'bell' && faderBell) {
      faderBell.value = isMuted ? '0' : '0.9';
      if (valMixBell) valMixBell.textContent = isMuted ? '0%' : '90%';
    } else if (channel === 'mo' && faderMo) {
      faderMo.value = isMuted ? '0' : '0.85';
      if (valMixMo) valMixMo.textContent = isMuted ? '0%' : '85%';
    } else if (channel === 'ceremony' && faderCeremony) {
      faderCeremony.value = isMuted ? '0' : '0.95';
      if (valMixCeremony) valMixCeremony.textContent = isMuted ? '0%' : '95%';
    } else if (channel === 'tts' && faderTts) {
      faderTts.value = isMuted ? '0' : '0.95';
      if (valMixTts) valMixTts.textContent = isMuted ? '0%' : '95%';
    }
  };
});

const rngDuckingPercentEl = document.getElementById('rngDuckingPercent') as HTMLInputElement | null;
if (rngDuckingPercentEl) {
  rngDuckingPercentEl.oninput = () => {
    const el = document.getElementById('lblDuckingPercent');
    if (el) el.textContent = `${rngDuckingPercentEl.value}%`;
  };
}

const btnSaveMixerSettings = document.getElementById('btnSaveMixerSettings');
if (btnSaveMixerSettings) {
  btnSaveMixerSettings.onclick = async () => {
    try {
      const res = await callAdminApi('/api/admin/settings', {
        audioMasterVolume: faderMaster ? Number(faderMaster.value) : 0.9,
        audioMusicVolume: faderBgm ? Number(faderBgm.value) : 0.55,
        audioBellVolume: faderBell ? Number(faderBell.value) : 0.9,
        audioWoodenFishVolume: faderMo ? Number(faderMo.value) : 0.85,
        audioCeremonyVolume: faderCeremony ? Number(faderCeremony.value) : 0.95,
        audioTtsVolume: faderTts ? Number(faderTts.value) : 0.95,
        audioDuckingEnabled: (document.getElementById('chkAudioDucking') as HTMLInputElement).checked,
        audioDuckingPercent: Number((document.getElementById('rngDuckingPercent') as HTMLInputElement).value)
      });
      renderSnapshot(res.snapshot);
      showToast('Đã lưu cấu hình Bàn Trộn Âm Thanh & Ducking');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

const btnMuteAllAudio = document.getElementById('btnMuteAllAudio');
let preMuteMaster = '0.9';
if (btnMuteAllAudio) {
  btnMuteAllAudio.onclick = async () => {
    if (!faderMaster) return;
    const isMuted = faderMaster.value === '0';
    const targetVal = isMuted ? preMuteMaster : '0';
    if (!isMuted) preMuteMaster = faderMaster.value;
    faderMaster.value = targetVal;
    if (valMixMaster) valMixMaster.textContent = `${Math.round(Number(targetVal) * 100)}%`;
    btnMuteAllAudio.textContent = isMuted ? '🔇 Mute Tất Cả' : '🔊 Bật Âm Lại';
    btnMuteAllAudio.classList.toggle('gold', isMuted);
    try {
      const res = await callAdminApi('/api/admin/settings', {
        audioMasterVolume: Number(targetVal)
      });
      renderSnapshot(res.snapshot);
      showToast(isMuted ? 'Đã bật lại âm thanh Master' : 'Đã MUTE toàn bộ âm thanh Chánh Điện');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

// 6. Scheduler Save
const inpMoBpmEl = document.getElementById('inpMoBpm') as HTMLInputElement | null;
if (inpMoBpmEl) {
  inpMoBpmEl.oninput = () => {
    const el = document.getElementById('lblMoBpm');
    if (el) el.textContent = `${inpMoBpmEl.value} BPM`;
  };
}

const btnSaveSchedulerSettings = document.getElementById('btnSaveSchedulerSettings');
if (btnSaveSchedulerSettings) {
  btnSaveSchedulerSettings.onclick = async () => {
    try {
      const res = await callAdminApi('/api/admin/settings', {
        autoChantEnabled: (document.getElementById('chkAutoChant') as HTMLInputElement).checked,
        autoChantIntervalMin: Number((document.getElementById('inpAutoChantInterval') as HTMLInputElement).value),
        woodenFishRhythmEnabled: (document.getElementById('chkWoodenFishRhythm') as HTMLInputElement).checked,
        woodenFishBpm: Number((document.getElementById('inpMoBpm') as HTMLInputElement).value),
        idleSereneChimes: (document.getElementById('chkIdleSereneChimes') as HTMLInputElement).checked
      });
      renderSnapshot(res.snapshot);
      showToast('Đã lưu lịch trình tự động tụng kinh & chuông mõ');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

document.getElementById('btnResetSession')!.onclick = async () => {
  const res = await callAdminApi('/api/admin/session/reset');
  renderSnapshot(res.snapshot);
  showToast('Đã sao lưu và đặt lại phiên LIVE');
};

document.getElementById('btnExportConfig')!.onclick = () => {
  window.open('/api/config/export', '_blank');
};

if (btnVerifyTikTok) {
  btnVerifyTikTok.onclick = async () => {
    try {
      if (verifyResultEl) verifyResultEl.textContent = 'Đang kiểm tra phòng LIVE...';
      const res = await callAdminApi('/api/admin/tiktok/verify', { uniqueId: inpTikTokUser.value });
      if (verifyResultEl) {
        if (res.verified) {
          verifyResultEl.style.color = 'var(--gold-bright)';
          verifyResultEl.textContent = `✓ Kênh @${res.uniqueId} đang LIVE! Room ID: ${res.roomId}`;
        } else {
          verifyResultEl.style.color = 'var(--danger)';
          verifyResultEl.textContent = `✗ Kênh @${res.uniqueId} không online: ${res.message}`;
        }
      }
    } catch (e: any) {
      if (verifyResultEl) {
        verifyResultEl.style.color = 'var(--danger)';
        verifyResultEl.textContent = `Lỗi: ${e.message}`;
      }
    }
  };
}

if (btnTrigFlower) {
  btnTrigFlower.onclick = async () => {
    const res = await callAdminApi('/api/admin/ritual/flowers', {
      nickname: inpSimName.value || 'Diệu Hạnh',
      wishText: inpSimWish.value || 'Cung kính dâng hoa cúng Phật'
    });
    renderSnapshot(res.snapshot);
    showToast('Đã khởi lễ Dâng Hoa Sen Tươi');
  };
}

if (btnTrigSerene) {
  btnTrigSerene.onclick = async () => {
    const res = await callAdminApi('/api/admin/ritual/serene');
    renderSnapshot(res.snapshot);
    showToast('Đã thỉnh Chuông Mõ Thanh Tịnh');
  };
}

// Live Event Stream Filter & Appender
type EventFilterCategory = 'all' | 'comment' | 'gift' | 'heart';
let currentFilter: EventFilterCategory = 'all';

function setFilter(cat: EventFilterCategory, activeBtn: HTMLElement): void {
  currentFilter = cat;
  [btnFilterAll, btnFilterComment, btnFilterGift, btnFilterHeart].forEach((b) => b.classList.remove('gold'));
  activeBtn.classList.add('gold');
  filterLogs();
}

btnFilterAll.onclick = () => setFilter('all', btnFilterAll);
btnFilterComment.onclick = () => setFilter('comment', btnFilterComment);
btnFilterGift.onclick = () => setFilter('gift', btnFilterGift);
btnFilterHeart.onclick = () => setFilter('heart', btnFilterHeart);

btnClearLiveLogs.onclick = () => {
  liveEventStream.replaceChildren();
  const empty = document.createElement('div');
  empty.style.color = 'var(--muted)';
  empty.style.fontStyle = 'italic';
  empty.textContent = 'Đã xóa log sự kiện...';
  liveEventStream.appendChild(empty);
};

function appendLiveLog(cat: EventFilterCategory, badge: string, content: string): void {
  const item = document.createElement('div');
  item.className = 'live-log-item';
  item.setAttribute('data-cat', cat);
  item.style.padding = '4px 6px';
  item.style.borderRadius = '6px';
  item.style.background = 'rgba(255,255,255,0.04)';
  item.style.display = currentFilter === 'all' || currentFilter === cat ? 'block' : 'none';

  const timeStr = new Date().toLocaleTimeString('vi-VN');
  item.innerHTML = `<span style="color:var(--muted); font-size:11px;">[${timeStr}]</span> <span style="color:var(--gold-bright); font-weight:600;">${badge}</span> ${content}`;

  if (liveEventStream.children.length > 50) {
    liveEventStream.removeChild(liveEventStream.children[0]);
  }
  liveEventStream.appendChild(item);
  liveEventStream.scrollTop = liveEventStream.scrollHeight;
}

function filterLogs(): void {
  const items = liveEventStream.querySelectorAll<HTMLElement>('.live-log-item');
  items.forEach((item) => {
    const cat = item.getAttribute('data-cat');
    item.style.display = currentFilter === 'all' || currentFilter === cat ? 'block' : 'none';
  });
}

// Connect Admin WebSocket for real-time state updates
function connectAdminWs(): void {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(
    `${proto}//${window.location.host}/ws?role=admin&token=${encodeURIComponent(adminToken)}`
  );
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as ServerToClientWsMessage;
      if (msg.type === 'snapshot') {
        renderSnapshot(msg.snapshot);
      } else if (msg.type === 'ritual') {
        const r = msg.ritual;
        const cat =
          r.actionType === 'OFFER_GIFT' || r.actionType === 'GRAND_CEREMONY' || r.actionType === 'OFFER_FLOWERS'
            ? 'gift'
            : r.actionType === 'STRIKE_WOODEN_FISH'
              ? 'heart'
              : 'comment';
        const badge = r.giftName ? `🎁 [${r.giftName}]` : `✦ [${r.ruleName}]`;
        appendLiveLog(cat, badge, `<b>${r.user.nickname}</b>: ${r.wishText || ''} (+${r.meritAwarded} Tinh Tấn)`);
      } else if (msg.type === 'prayer') {
        const p = msg.prayer;
        appendLiveLog('comment', `📜 [Sổ Nguyện: ${p.category}]`, `<b>${p.nickname}</b>: “${p.wishText}”`);
        const row = document.createElement('div');
        row.style.borderBottom = '1px solid rgba(229,184,91,0.15)';
        row.style.paddingBottom = '4px';
        const timeStr = new Date(p.createdAt).toLocaleTimeString('vi-VN');
        row.innerHTML = `<span style="color:var(--gold-bright); font-weight:600;">[${p.category}]</span> <b style="color:var(--text);">${p.nickname}</b> <span style="color:var(--muted); font-size:11px;">(${timeStr})</span>: <span style="font-style:italic;">"${p.wishText}"</span>`;
        livePrayerRegistry.prepend(row);
      } else if (msg.type === 'likeBatch') {
        appendLiveLog('heart', '❤️ [Thả Tim]', `Nhận batch <b>${msg.count}</b> tim -> Gõ Mõ`);
      }
    } catch {
      // ignore
    }
  };
  ws.onclose = () => {
    setTimeout(connectAdminWs, 2500);
  };
}

connectAdminWs();
void loadAudioTracks();
