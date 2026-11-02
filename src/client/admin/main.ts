import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/noto-serif/700.css';
import { DEFAULT_SCENE_CONFIG } from '../../shared/constants.ts';
import type {
  EventActionRule,
  EventTraceItem,
  FortuneExecutionRecord,
  FortuneStick,
  SceneAssetItem,
  SceneConfig,
  SceneLayerConfig,
  SceneLayerId,
  ScenePresetItem,
  ServerToClientWsMessage,
  TempleSettings,
  TempleStateSnapshot
} from '../../shared/types.ts';
import { escapeHtml } from '../../shared/escapeHtml.ts';

const tokenMeta = document.querySelector('meta[name="temple-admin-token"]');
let currentAdminToken =
  sessionStorage.getItem('temple_admin_token') ||
  tokenMeta?.getAttribute('content') ||
  '';

export function setAdminToken(tok: string): void {
  currentAdminToken = tok;
  if (tok) {
    sessionStorage.setItem('temple_admin_token', tok);
  } else {
    sessionStorage.removeItem('temple_admin_token');
  }
}

const toastEl = document.getElementById('toastBar')!;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

const modalAdminLogin = document.getElementById('modalAdminLogin');
const inputAdminLoginPassword = document.getElementById('inputAdminLoginPassword') as HTMLInputElement | null;
const btnAdminLoginSubmit = document.getElementById('btnAdminLoginSubmit') as HTMLButtonElement | null;
const loginAlertBox = document.getElementById('loginAlertBox');
const btnLogoutAdmin = document.getElementById('btnLogoutAdmin');

function openLoginModal(msg?: string): void {
  if (!modalAdminLogin) return;
  if (loginAlertBox) {
    if (msg) {
      loginAlertBox.textContent = msg;
      loginAlertBox.style.display = 'block';
    } else {
      loginAlertBox.style.display = 'none';
    }
  }
  if (inputAdminLoginPassword) {
    inputAdminLoginPassword.value = '';
  }
  modalAdminLogin.style.display = 'flex';
  setTimeout(() => inputAdminLoginPassword?.focus(), 100);
}

function closeLoginModal(): void {
  if (modalAdminLogin) modalAdminLogin.style.display = 'none';
}

async function callAdminApi(endpoint: string, payload: Record<string, any> = {}): Promise<any> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': currentAdminToken
    },
    body: JSON.stringify(payload)
  });
  if (res.status === 401) {
    openLoginModal('Phiên làm việc đã hết hạn hoặc chưa xác thực. Vui lòng đăng nhập lại.');
    throw new Error('Unauthorized: Vui lòng đăng nhập lại.');
  }
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

function populateFormFromSettings(s: TempleSettings): void {
  inpSceneTitle.value = s.title || '';
  inpSceneSubtitle.value = s.subtitle || '';
  selTimeOfDay.value = s.timeOfDay || 'day';
  selWeather.value = s.weather || 'clear';
  selSeatCap.value = s.seatCapacityMode || '48';
  selQuality.value = s.qualityPreset || 'high';
  selTargetFps.value = String(s.targetFps || 60);
  rngSmoke.value = String(s.smokeDensity ?? 1.0);
  rngPetal.value = String(s.petalDensity ?? 1.0);
  lblSmoke.textContent = (s.smokeDensity ?? 1.0).toFixed(1);
  lblPetal.textContent = (s.petalDensity ?? 1.0).toFixed(1);

  chkFortune.checked = Boolean(s.fortuneEnabled);
  chkFlowerOffering.checked = Boolean(s.flowerOfferingEnabled);
  chkSafeZones.checked = Boolean(s.showSafeZones);
  chkLunarFestival.checked = Boolean(s.lunarFestivalAuto);
  chkIdleSerene.checked = Boolean(s.idleSereneChimes);
  chkPrayers.checked = Boolean(s.collectivePrayersEnabled);

  const faderMaster = document.getElementById('faderMaster') as HTMLInputElement | null;
  const faderBgm = document.getElementById('faderBgm') as HTMLInputElement | null;
  const faderBell = document.getElementById('faderBell') as HTMLInputElement | null;
  const faderMo = document.getElementById('faderMo') as HTMLInputElement | null;
  const faderCeremony = document.getElementById('faderCeremony') as HTMLInputElement | null;
  const faderTts = document.getElementById('faderTts') as HTMLInputElement | null;

  if (faderMaster) {
    faderMaster.value = String(s.audioMasterVolume ?? 0.9);
    const el = document.getElementById('valMixMaster');
    if (el) el.textContent = `${Math.round((s.audioMasterVolume ?? 0.9) * 100)}%`;
  }
  if (faderBgm) {
    faderBgm.value = String(s.audioMusicVolume ?? 0.55);
    const el = document.getElementById('valMixBgm');
    if (el) el.textContent = `${Math.round((s.audioMusicVolume ?? 0.55) * 100)}%`;
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
    faderTts.value = String(s.audioTtsVolume ?? 0.95);
    const el = document.getElementById('valMixTts');
    if (el) el.textContent = `${Math.round((s.audioTtsVolume ?? 0.95) * 100)}%`;
  }

  const selVoice = document.getElementById('selTtsVoice') as HTMLSelectElement | null;
  if (selVoice) selVoice.value = s.ttsVoice || 'vi-VN-HoaiMyNeural';

  const rngRate = document.getElementById('rngTtsRate') as HTMLInputElement | null;
  if (rngRate) {
    rngRate.value = String(s.ttsRatePercent ?? -12);
    const el = document.getElementById('lblTtsRate');
    if (el) el.textContent = `${s.ttsRatePercent ?? -12}% (Trang nghiêm)`;
  }

  const rngPitch = document.getElementById('rngTtsPitch') as HTMLInputElement | null;
  if (rngPitch) {
    rngPitch.value = String(s.ttsPitchHz ?? -6);
    const el = document.getElementById('lblTtsPitch');
    if (el) el.textContent = `${s.ttsPitchHz ?? -6}Hz (Ấm trầm)`;
  }

  const inpDiamonds = document.getElementById('inpTtsMinDiamonds') as HTMLInputElement | null;
  if (inpDiamonds) inpDiamonds.value = String(s.ttsMinGiftDiamonds ?? 1);

  const chkFreeComments = document.getElementById('chkReadFreeComments') as HTMLInputElement | null;
  if (chkFreeComments) chkFreeComments.checked = Boolean(s.ttsReadFreeComments);

  const chkReadPrayers = document.getElementById('chkReadPrayers') as HTMLInputElement | null;
  if (chkReadPrayers) chkReadPrayers.checked = Boolean(s.ttsReadPrayers);

  const chkReadFortunes = document.getElementById('chkReadFortunes') as HTMLInputElement | null;
  if (chkReadFortunes) chkReadFortunes.checked = Boolean(s.ttsReadFortunes);

  const chkFortuneOracleEnabled = document.getElementById('chkFortuneOracleEnabled') as HTMLInputElement | null;
  if (chkFortuneOracleEnabled) chkFortuneOracleEnabled.checked = Boolean(s.fortuneEnabled);

  const chkReadFortunesSync = document.getElementById('chkReadFortunesSync') as HTMLInputElement | null;
  if (chkReadFortunesSync) chkReadFortunesSync.checked = Boolean(s.ttsReadFortunes);

  const selFortuneReadMode = document.getElementById('selFortuneReadMode') as HTMLSelectElement | null;
  if (selFortuneReadMode && s.fortuneReadMode) selFortuneReadMode.value = s.fortuneReadMode;

  const txtFortuneCooldownSec = document.getElementById('txtFortuneCooldownSec') as HTMLInputElement | null;
  if (txtFortuneCooldownSec) txtFortuneCooldownSec.value = String(s.fortuneUserCooldownSec ?? 15);

  const selFortuneVoice = document.getElementById('selFortuneVoice') as HTMLSelectElement | null;
  if (selFortuneVoice) selFortuneVoice.value = s.fortuneVoice || 'default';

  const rngFortuneRate = document.getElementById('rngFortuneRate') as HTMLInputElement | null;
  if (rngFortuneRate) {
    rngFortuneRate.value = String(s.fortuneRatePercent ?? -10);
    const lbl = document.getElementById('lblFortuneRate');
    if (lbl) lbl.textContent = `${s.fortuneRatePercent ?? -10}%`;
  }

  const rngFortuneVolume = document.getElementById('rngFortuneVolume') as HTMLInputElement | null;
  if (rngFortuneVolume) {
    rngFortuneVolume.value = String(s.fortuneVolume ?? 0.95);
    const lbl = document.getElementById('lblFortuneVolume');
    if (lbl) lbl.textContent = `${Math.round((s.fortuneVolume ?? 0.95) * 100)}%`;
  }

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

function renderSnapshot(snap: TempleStateSnapshot, forceFormUpdate = false): void {
  latestSnapshot = snap;

  if (snap.sceneConfig && (!sceneEditorInitialized || forceFormUpdate)) {
    activeSceneConfig = JSON.parse(JSON.stringify(snap.sceneConfig));
    sceneEditorInitialized = true;
    updateSceneEditorUI();
    renderSceneEditorCanvas();
    renderLayerStackTable();
  }

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

  const elAudioLeader = document.getElementById('mAudioLeader');
  if (elAudioLeader) {
    elAudioLeader.textContent = snap.audioLeaderClientId ? `Leader: ${snap.audioLeaderClientId}` : '(Chờ Overlay kết nối)';
  }

  const elFreeComments = document.getElementById('mFreeCommentsStatus');
  if (elFreeComments) {
    const isFree = Boolean(snap.settings.ttsReadFreeComments);
    elFreeComments.textContent = isFree ? 'BẬT' : 'TẮT';
    elFreeComments.style.color = isFree ? 'var(--jade)' : 'var(--danger)';
  }

  const elGitCommit = document.getElementById('mGitCommit');
  if (elGitCommit && snap.gitCommit) {
    elGitCommit.textContent = snap.gitCommit;
  }

  if (snap.eventTraces && snap.eventTraces.length > 0) {
    const tbody = document.getElementById('debuggerTableBody');
    if (tbody && tbody.querySelector('td[colspan="7"]')) {
      for (const trace of [...snap.eventTraces].reverse()) {
        upsertDebuggerRow(trace);
      }
    }
  }

  if (!formInitialized || forceFormUpdate) {
    formInitialized = true;
    populateFormFromSettings(snap.settings);
  }

  if (snap.recentFortuneExecutions) {
    renderFortuneExecutions(snap.recentFortuneExecutions);
  }
  if (snap.fortuneDeckCount !== undefined) {
    const lblCount = document.getElementById('lblFortuneDeckCount');
    if (lblCount) lblCount.textContent = `(${snap.fortuneDeckCount} quẻ)`;
  }

  if (snap.prayers && snap.prayers.length > 0) {
    livePrayerRegistry.replaceChildren();
    for (const p of snap.prayers.slice(0, 30)) {
      const row = document.createElement('div');
      row.style.borderBottom = '1px solid rgba(229,184,91,0.15)';
      row.style.paddingBottom = '4px';
      const timeStr = new Date(p.createdAt).toLocaleTimeString('vi-VN');
      row.innerHTML = `<span style="color:var(--gold-bright); font-weight:600;">[${escapeHtml(p.category)}]</span> <b style="color:var(--text);">${escapeHtml(p.nickname)}</b> <span style="color:var(--muted); font-size:11px;">(${escapeHtml(timeStr)})</span>: <span style="font-style:italic;">"${escapeHtml(p.wishText)}"</span>`;
      livePrayerRegistry.appendChild(row);
    }
  } else {
    livePrayerRegistry.innerHTML = '<div style="color:var(--muted); font-size:12px; padding:8px 0; text-align:center;">(Chưa có lời nguyện nào trong phiên này)</div>';
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
const SAVED_AUDIO_FILTER_KEY = 'temple_audio_cat_filter';
let currentCategoryFilter = localStorage.getItem(SAVED_AUDIO_FILTER_KEY) || 'all';

const AUDIO_CAT_DISPLAY_NAMES: Record<string, string> = {
  all: 'Tất Cả',
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

function formatAudioFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function syncCategoryFilterButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-cat-filter]').forEach((b) => {
    const cat = b.getAttribute('data-cat-filter') || 'all';
    if (cat === currentCategoryFilter) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

async function loadAudioTracks(): Promise<void> {
  try {
    syncCategoryFilterButtons();
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
  const filterDisplay = AUDIO_CAT_DISPLAY_NAMES[currentCategoryFilter] || currentCategoryFilter;
  if (badge) badge.textContent = `${tracks.length} tệp (${filterDisplay})`;
  if (!container) return;

  if (tracks.length === 0) {
    container.innerHTML = `
      <div style="background:rgba(255,255,255,0.03); border:1px dashed rgba(229,184,91,0.25); border-radius:8px; padding:22px 16px; text-align:center;">
        <div style="font-size:24px; margin-bottom:6px;">🎵</div>
        <div style="color:var(--gold-bright); font-size:13px; font-weight:600; margin-bottom:4px;">Chưa có tệp âm thanh nào trong danh mục "${filterDisplay}"</div>
        <div style="color:var(--muted); font-size:12px;">Bạn có thể kéo thả tệp mới ở trên và chọn mục "${filterDisplay}", hoặc chọn danh mục khác ở thanh lọc.</div>
      </div>
    `;
    return;
  }

  container.replaceChildren();
  for (const tr of tracks) {
    const card = document.createElement('div');
    card.className = 'audio-track-card';
    const dateStr = new Date(tr.createdAt).toLocaleDateString('vi-VN');
    const sizeStr = formatAudioFileSize(tr.fileSizeBytes);
    const catDisplay = AUDIO_CAT_DISPLAY_NAMES[tr.category] || tr.category;
    const isSmallSample = tr.fileSizeBytes > 0 && tr.fileSizeBytes < 1024;

    card.innerHTML = `
      <div class="audio-track-info" style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="audio-category-pill">${escapeHtml(catDisplay)}</span>
          <span class="audio-track-title">${escapeHtml(tr.name)}</span>
          ${isSmallSample ? '<span title="Tệp rất nhỏ (<1KB) - Có thể là tệp mẫu hoặc thử nghiệm" style="color:#f59e0b; font-size:11px; font-weight:600;">⚠️ Tệp mẫu nhỏ</span>' : ''}
        </div>
        <div class="audio-track-meta">
          <span>📁 ${escapeHtml(tr.filename)}</span>
          <span>⚖️ ${escapeHtml(sizeStr)}</span>
          <span id="dur_${escapeHtml(tr.id)}">⏱️ ${tr.durationSec > 0 ? `${Math.floor(tr.durationSec / 60)}:${Math.floor(tr.durationSec % 60).toString().padStart(2, '0')}` : '--:--'}</span>
          <span>📅 ${escapeHtml(dateStr)}</span>
        </div>
        <audio controls src="${escapeHtml(tr.url)}" preload="metadata" style="width:100%; height:32px; margin-top:4px;"></audio>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; min-width:210px;">
        <div style="display:flex; align-items:center; gap:6px; width:100%; justify-content:flex-end;">
          <span style="font-size:11px; color:var(--muted);">Mục:</span>
          <select class="sel-track-category" data-track-id="${escapeHtml(tr.id)}" style="font-size:12px; padding:3px 6px; border-radius:4px; background:rgba(0,0,0,0.4); color:var(--text); border:1px solid rgba(229,184,91,0.25);">
            <option value="meditation" ${tr.category === 'meditation' ? 'selected' : ''}>Nhạc Thiền (BGM)</option>
            <option value="chant" ${tr.category === 'chant' ? 'selected' : ''}>Tụng Kinh</option>
            <option value="buddha_name" ${tr.category === 'buddha_name' ? 'selected' : ''}>Niệm Phật</option>
            <option value="bell" ${tr.category === 'bell' ? 'selected' : ''}>Tiếng Chuông</option>
            <option value="wooden_fish" ${tr.category === 'wooden_fish' ? 'selected' : ''}>Tiếng Mõ</option>
            <option value="prayer" ${tr.category === 'prayer' ? 'selected' : ''}>Lời Cầu Nguyện</option>
            <option value="greeting" ${tr.category === 'greeting' ? 'selected' : ''}>Lời Chào</option>
            <option value="festival" ${tr.category === 'festival' ? 'selected' : ''}>Lễ Hội</option>
            <option value="sfx" ${tr.category === 'sfx' ? 'selected' : ''}>Hiệu Ứng</option>
          </select>
        </div>
        <select class="sel-track-default" data-track-id="${escapeHtml(tr.id)}" style="font-size:12px; padding:4px 6px; width:100%;">
          <option value="" ${!tr.isDefaultFor ? 'selected' : ''}>-- Không gán mặc định --</option>
          <option value="bgm" ${tr.isDefaultFor === 'bgm' ? 'selected' : ''}>🎵 Làm Nhạc Nền (BGM)</option>
          <option value="bell" ${tr.isDefaultFor === 'bell' ? 'selected' : ''}>🔔 Tiếng Chuông Lớn</option>
          <option value="wooden_fish" ${tr.isDefaultFor === 'wooden_fish' ? 'selected' : ''}>🪵 Tiếng Mõ Gỗ</option>
          <option value="ceremony" ${tr.isDefaultFor === 'ceremony' ? 'selected' : ''}>🪷 Nghi Lễ & Hoa Đăng</option>
        </select>
        <button type="button" class="btn-delete-track" data-track-id="${escapeHtml(tr.id)}" style="color:var(--danger); border-color:var(--danger); font-size:11px; padding:3px 8px;">🗑️ Xóa tệp</button>
      </div>
    `;

    const audioEl = card.querySelector('audio');
    const durSpan = card.querySelector(`#dur_${tr.id}`);
    if (audioEl && durSpan) {
      audioEl.addEventListener('loadedmetadata', () => {
        if (isFinite(audioEl.duration) && audioEl.duration > 0) {
          const m = Math.floor(audioEl.duration / 60);
          const s = Math.floor(audioEl.duration % 60).toString().padStart(2, '0');
          durSpan.textContent = `⏱️ ${m}:${s}`;
        } else {
          durSpan.textContent = '⏱️ 0:00';
        }
      });
    }

    container.appendChild(card);
  }

  container.querySelectorAll<HTMLSelectElement>('.sel-track-category').forEach((sel) => {
    sel.onchange = async () => {
      const trackId = sel.getAttribute('data-track-id');
      const newCategory = sel.value;
      try {
        await callAdminApi('/api/admin/audio/tracks/update', { id: trackId, category: newCategory });
        showToast(`Đã chuyển tệp sang danh mục "${AUDIO_CAT_DISPLAY_NAMES[newCategory] || newCategory}"`);
        void loadAudioTracks();
      } catch (e: any) {
        showToast(`Lỗi: ${e.message}`);
      }
    };
  });

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
    currentCategoryFilter = btn.getAttribute('data-cat-filter') || 'all';
    localStorage.setItem(SAVED_AUDIO_FILTER_KEY, currentCategoryFilter);
    syncCategoryFilterButtons();
    void loadAudioTracks();
  };
});
syncCategoryFilterButtons();

// Playlists Management
const btnCreatePlaylist = document.getElementById('btnCreatePlaylist');
const inpNewPlaylistName = document.getElementById('inpNewPlaylistName') as HTMLInputElement | null;
const selPlaylistMode = document.getElementById('selPlaylistMode') as HTMLSelectElement | null;
const playlistContainer = document.getElementById('playlistListContainer');

async function loadPlaylists(): Promise<void> {
  try {
    const res = await callAdminApi('/api/admin/audio/playlists');
    renderPlaylists(res.playlists || []);
  } catch {
    // ignore
  }
}

function renderPlaylists(playlists: any[]): void {
  if (!playlistContainer) return;
  if (playlists.length === 0) {
    playlistContainer.innerHTML =
      '<div style="color:var(--muted); font-size:12px;">Chưa có playlist tùy chỉnh. Nhạc thiền ngũ cung tự động mặc định đang phát.</div>';
    return;
  }
  playlistContainer.replaceChildren();
  for (const pl of playlists) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '6px 10px';
    row.style.borderRadius = '6px';
    row.style.background = 'rgba(255,255,255,0.04)';
    row.style.border = '1px solid rgba(229,184,91,0.15)';
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="color:var(--gold-bright); font-weight:600;">🎶 ${pl.name}</span>
        <span style="font-size:11px; color:var(--muted); font-family:monospace;">[${pl.mode}]</span>
      </div>
      <button type="button" class="btn-del-pl" data-pl-id="${pl.id}" style="color:var(--danger); border-color:var(--danger); font-size:11px; padding:2px 6px;">🗑️ Xóa</button>
    `;
    playlistContainer.appendChild(row);
  }
  playlistContainer.querySelectorAll<HTMLButtonElement>('.btn-del-pl').forEach((btn) => {
    btn.onclick = async () => {
      const plId = btn.getAttribute('data-pl-id');
      try {
        await callAdminApi('/api/admin/audio/playlists/delete', { id: plId });
        showToast('Đã xóa playlist thành công');
        void loadPlaylists();
      } catch (e: any) {
        showToast(`Lỗi: ${e.message}`);
      }
    };
  });
}

if (btnCreatePlaylist) {
  btnCreatePlaylist.onclick = async () => {
    const name = inpNewPlaylistName?.value.trim();
    if (!name) {
      showToast('Vui lòng nhập tên danh sách phát');
      return;
    }
    const mode = (selPlaylistMode?.value || 'loop_all') as any;
    try {
      await callAdminApi('/api/admin/audio/playlists', {
        playlist: {
          id: `pl_${Date.now()}`,
          name,
          trackIds: [],
          mode,
          isActive: true,
          createdAt: Date.now()
        }
      });
      showToast(`Đã tạo danh sách phát: ${name}`);
      if (inpNewPlaylistName) inpNewPlaylistName.value = '';
      void loadPlaylists();
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

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
          'X-Admin-Token': currentAdminToken,
          'X-Audio-Name': encodeURIComponent((inpUploadName?.value || selectedUploadFile.name).trim()),
          'X-Audio-Category': selUploadCat?.value || 'meditation',
          'X-File-Name': encodeURIComponent(selectedUploadFile.name),
          'Content-Type': selectedUploadFile.type || 'audio/mpeg'
        },
        body: selectedUploadFile
      });
      if (res.status === 401) {
        openLoginModal('Vui lòng đăng nhập lại để tải lên tệp âm thanh.');
        throw new Error('Chưa xác thực Admin');
      }
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

const btnResetSession = document.getElementById('btnResetSession');
if (btnResetSession) {
  btnResetSession.onclick = () => {
    openResetModal('session');
  };
}

document.getElementById('btnExportConfig')!.onclick = () => {
  window.open(`/api/config/export?token=${encodeURIComponent(currentAdminToken)}`, '_blank');
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
    `${proto}//${window.location.host}/ws?role=admin&token=${encodeURIComponent(currentAdminToken)}`
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
        const badge = r.giftName ? `🎁 [${escapeHtml(r.giftName)}]` : `✦ [${escapeHtml(r.ruleName)}]`;
        appendLiveLog(cat, badge, `<b>${escapeHtml(r.user.nickname)}</b>: ${escapeHtml(r.wishText || '')} (+${r.meritAwarded} Tinh Tấn)`);
      } else if (msg.type === 'prayer') {
        const p = msg.prayer;
        appendLiveLog('comment', `📜 [Sổ Nguyện: ${escapeHtml(p.category)}]`, `<b>${escapeHtml(p.nickname)}</b>: “${escapeHtml(p.wishText)}”`);
        const row = document.createElement('div');
        row.style.borderBottom = '1px solid rgba(229,184,91,0.15)';
        row.style.paddingBottom = '4px';
        const timeStr = new Date(p.createdAt).toLocaleTimeString('vi-VN');
        row.innerHTML = `<span style="color:var(--gold-bright); font-weight:600;">[${escapeHtml(p.category)}]</span> <b style="color:var(--text);">${escapeHtml(p.nickname)}</b> <span style="color:var(--muted); font-size:11px;">(${escapeHtml(timeStr)})</span>: <span style="font-style:italic;">"${escapeHtml(p.wishText)}"</span>`;
        livePrayerRegistry.prepend(row);
      } else if (msg.type === 'likeBatch') {
        appendLiveLog('heart', '❤️ [Thả Tim]', `Nhận batch <b>${msg.count}</b> tim -> Gõ Mõ`);
      } else if (msg.type === 'eventTrace') {
        upsertDebuggerRow(msg.trace);
      } else if (msg.type === 'eventTraceBatch') {
        for (const t of msg.traces) upsertDebuggerRow(t);
      } else if (msg.type === 'audioLeaderUpdate') {
        const elAudioLeader = document.getElementById('mAudioLeader');
        if (elAudioLeader) {
          elAudioLeader.textContent = msg.leaderClientId ? `Leader: ${msg.leaderClientId}` : '(Chờ Overlay kết nối)';
        }
      } else if (msg.type === 'sceneConfigUpdate') {
        activeSceneConfig = JSON.parse(JSON.stringify(msg.sceneConfig));
        updateSceneEditorUI();
        renderSceneEditorCanvas();
      } else if (msg.type === 'fortuneExecutionUpdate') {
        upsertFortuneExecution(msg.record);
      }
    } catch {
      // ignore
    }
  };
  ws.onclose = () => {
    setTimeout(connectAdminWs, 2500);
  };
}

// ======================================================================
// LIVE EVENT DEBUGGER & PIPELINE TRACING
// ======================================================================
function upsertDebuggerRow(trace: EventTraceItem): void {
  const tbody = document.getElementById('debuggerTableBody');
  if (!tbody) return;

  // Clear initial placeholder row
  const placeholder = tbody.querySelector('td[colspan="7"]');
  if (placeholder) {
    tbody.replaceChildren();
  }

  const existingRow = document.getElementById(`trace-${trace.traceId}`);
  const timeStr = new Date(trace.updatedAt).toLocaleTimeString('vi-VN');

  const stageBadgeStyle: Record<string, { bg: string; color: string; label: string }> = {
    RECEIVED: { bg: 'rgba(255,255,255,0.08)', color: 'var(--muted)', label: '📥 Nhận vào' },
    ACCEPTED: { bg: 'rgba(30,144,255,0.2)', color: '#63b3ed', label: '🔍 Hợp lệ' },
    QUEUED: { bg: 'rgba(237,137,54,0.2)', color: '#f6ad55', label: '⏳ Hàng đợi' },
    SYNTHESIZED: { bg: 'rgba(159,122,234,0.2)', color: '#b794f4', label: '🎙️ Đã tạo Audio' },
    PLAYING: { bg: 'rgba(229,184,91,0.25)', color: 'var(--gold-bright)', label: '🔊 Đang phát' },
    COMPLETED: { bg: 'rgba(72,187,120,0.2)', color: 'var(--jade)', label: '✅ Hoàn thành' },
    FAILED: { bg: 'rgba(229,62,62,0.25)', color: 'var(--danger)', label: '❌ Lỗi âm thanh' },
    CANCELLED: { bg: 'rgba(128,128,128,0.25)', color: '#aaa', label: '⏹️ Đã hủy' },
    DROPPED: { bg: 'rgba(229,62,62,0.25)', color: 'var(--danger)', label: '🚫 Chặn / Bỏ' }
  };
  const b = stageBadgeStyle[trace.stage] || { bg: 'rgba(255,255,255,0.08)', color: 'var(--muted)', label: trace.stage };

  let detailContent = '';
  if (trace.stage === 'DROPPED' || trace.stage === 'FAILED' || trace.stage === 'CANCELLED') {
    detailContent = `<span style="color:var(--danger); font-weight:600;">Lý do: ${escapeHtml(trace.reason || 'Bị lọc / Lỗi')}</span>`;
  } else if (trace.ttsText) {
    const voiceTag = trace.ttsVoice
      ? `<span style="font-size:10px; color:var(--gold-bright); border:1px solid rgba(229,184,91,0.3); padding:1px 4px; border-radius:4px; margin-right:4px;">${escapeHtml(trace.ttsVoice)}</span>`
      : '';
    detailContent = `${voiceTag}<span style="font-style:italic;">"${escapeHtml(trace.ttsText)}"</span>`;
  } else if (trace.reason) {
    detailContent = `<span style="color:var(--muted);">${escapeHtml(trace.reason)}</span>`;
  } else {
    detailContent = `<span style="color:var(--muted);">Đang xử lý pipeline</span>`;
  }

  const safeNick = escapeHtml(trace.user.nickname || trace.user.uniqueId || 'Ẩn danh');
  const safeContent = escapeHtml(trace.rawContent);
  const rowHtml = `
    <td style="color:var(--muted); font-family:monospace;">${escapeHtml(timeStr)}</td>
    <td><b style="color:var(--text);">${safeNick}</b></td>
    <td><span style="font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.06);">${escapeHtml(trace.type)}</span></td>
    <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${safeContent}">${safeContent}</td>
    <td><span style="font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px; background:${b.bg}; color:${b.color};">${b.label}</span></td>
    <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${safeContent}">${detailContent}</td>
    <td style="color:var(--muted); font-family:monospace;">${trace.latencyMs !== undefined ? `${trace.latencyMs}ms` : '-'}</td>
  `;

  if (existingRow) {
    existingRow.innerHTML = rowHtml;
  } else {
    const tr = document.createElement('tr');
    tr.id = `trace-${trace.traceId}`;
    tr.innerHTML = rowHtml;
    tbody.prepend(tr);

    while (tbody.children.length > 80) {
      tbody.removeChild(tbody.lastChild!);
    }
  }
}

// Live Event Debugger Controls
const btnSendMockComment = document.getElementById('btnSendMockComment') as HTMLButtonElement | null;
const inpMockNickname = document.getElementById('inpMockNickname') as HTMLInputElement | null;
const inpMockComment = document.getElementById('inpMockComment') as HTMLInputElement | null;

if (btnSendMockComment) {
  btnSendMockComment.onclick = async () => {
    const nickname = inpMockNickname?.value.trim() || 'Diệu Tâm';
    const comment = inpMockComment?.value.trim() || 'Nam mô A Di Đà Phật, chúc đạo tràng an lạc';
    try {
      btnSendMockComment.disabled = true;
      btnSendMockComment.textContent = 'Đang gửi...';
      const res = await callAdminApi('/api/admin/events/mock-chat', { nickname, comment });
      showToast(`Đã đưa bình luận "${nickname}" vào pipeline (Trace ID: ${res.traceId})`);
    } catch (e: any) {
      showToast(`Lỗi gửi mock comment: ${e.message}`);
    } finally {
      btnSendMockComment.disabled = false;
      btnSendMockComment.textContent = 'Gửi Bình Luận Qua Pipeline';
    }
  };
}

const btnExportDiagnostics = document.getElementById('btnExportDiagnostics');
if (btnExportDiagnostics) {
  btnExportDiagnostics.onclick = () => {
    window.open(`/api/admin/diagnostics/export?token=${encodeURIComponent(currentAdminToken)}`, '_blank');
  };
}

const btnClearDebuggerTable = document.getElementById('btnClearDebuggerTable');
if (btnClearDebuggerTable) {
  btnClearDebuggerTable.onclick = () => {
    const tbody = document.getElementById('debuggerTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:16px;">Đã làm sạch bảng theo dõi trace.</td></tr>`;
    }
  };
}

// Audio Engine Live Controls
const btnStopCurrentSpeech = document.getElementById('btnStopCurrentSpeech');
if (btnStopCurrentSpeech) {
  btnStopCurrentSpeech.onclick = async () => {
    try {
      await callAdminApi('/api/admin/audio/stop');
      showToast('Đã phát lệnh dừng ngay âm thanh / TTS đang đọc');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

const btnClearTtsQueue = document.getElementById('btnClearTtsQueue');
if (btnClearTtsQueue) {
  btnClearTtsQueue.onclick = async () => {
    try {
      const res = await callAdminApi('/api/admin/audio/clear-queue');
      showToast(`Đã làm sạch hàng đợi TTS (${res.clearedCount ?? 0} câu đã hủy)`);
      if (res.snapshot) renderSnapshot(res.snapshot);
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

const btnRestartAudioEngine = document.getElementById('btnRestartAudioEngine');
if (btnRestartAudioEngine) {
  btnRestartAudioEngine.onclick = async () => {
    try {
      await callAdminApi('/api/admin/audio/restart-engine');
      showToast('Đã phát tín hiệu khởi động lại audio engine trên Overlay');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  };
}

// ======================================================================
// SAFE SYSTEM RESET & RECOVERY CENTER
// ======================================================================
let activeResetScope: 'session' | 'config' | 'factory' | 'scene' = 'session';
const modalResetConfirmation = document.getElementById('modalResetConfirmation');
const modalResetTitle = document.getElementById('modalResetTitle');
const modalResetDesc = document.getElementById('modalResetDesc');
const modalResetScopeBadge = document.getElementById('modalResetScopeBadge');
const inpResetConfirmation = document.getElementById('inpResetConfirmation') as HTMLInputElement | null;
const btnConfirmResetAction = document.getElementById('btnConfirmResetAction') as HTMLButtonElement | null;
const btnCancelResetAction = document.getElementById('btnCancelResetAction') as HTMLButtonElement | null;

function openResetModal(scope: 'session' | 'config' | 'factory' | 'scene'): void {
  if (!modalResetConfirmation || !modalResetTitle || !modalResetDesc || !inpResetConfirmation || !btnConfirmResetAction) return;
  activeResetScope = scope;
  inpResetConfirmation.value = '';
  btnConfirmResetAction.disabled = true;

  if (scope === 'session') {
    modalResetTitle.textContent = '🔄 Xác Nhận Đặt Lại Phiên Live (Session)';
    modalResetDesc.textContent =
      'Dừng ngay âm thanh đang phát, làm sạch hàng đợi TTS, xóa danh sách bồ đoàn tạm thời và bộ đếm tim/quà. Cấu hình và tệp âm thanh tải lên vẫn được bảo toàn an toàn.';
    if (modalResetScopeBadge) modalResetScopeBadge.textContent = 'Phạm vi: PHIÊN LIVE (SESSION)';
  } else if (scope === 'config') {
    modalResetTitle.textContent = '⚙️ Xác Nhận Khôi Phục Cấu Hình Chuẩn (Config)';
    modalResetDesc.textContent =
      'Đưa toàn bộ thiết lập Chánh Điện, bộ trộn âm thanh và 12 Luật Nghi Thức về mặc định gốc. Bản sao lưu cấu hình cũ sẽ tự động được tạo tại data/backups/.';
    if (modalResetScopeBadge) modalResetScopeBadge.textContent = 'Phạm vi: CẤU HÌNH (CONFIG)';
  } else if (scope === 'scene') {
    modalResetTitle.textContent = '🪷 Xác Nhận Khôi Phục Cảnh & Tọa Độ Về Mặc Định (Scene)';
    modalResetDesc.textContent =
      'Đặt lại toàn bộ 8 Layer đồ họa và tọa độ pháp khí (Tượng Phật, Lư Hương, Mõ, Chuông, Điểm Lạy, Bồ Đoàn) về cấu hình Chánh Điện ban đầu. Tự động tạo bản sao lưu snapshot tại data/backups/.';
    if (modalResetScopeBadge) modalResetScopeBadge.textContent = 'Phạm vi: CẢNH CHÙA (SCENE)';
  } else if (scope === 'factory') {
    modalResetTitle.textContent = '⚠️ Xác Nhận Khôi Phục Gốc Toàn Diện (Factory)';
    modalResetDesc.textContent =
      'Tạo bản sao lưu toàn vẹn SQLite, sau đó khôi phục toàn bộ database, cài đặt, cảnh Chùa và phiên phát về trạng thái sạch gốc của Chùa Online. Hãy chắc chắn trước khi tiếp tục.';
    if (modalResetScopeBadge) modalResetScopeBadge.textContent = 'Phạm vi: CÀI ĐẶT GỐC (FACTORY)';
  }

  modalResetConfirmation.classList.add('active');
  inpResetConfirmation.focus();
}

document.getElementById('btnTriggerResetSession')?.addEventListener('click', () => openResetModal('session'));
document.getElementById('btnTriggerResetConfig')?.addEventListener('click', () => openResetModal('config'));
document.getElementById('btnTriggerResetFactory')?.addEventListener('click', () => openResetModal('factory'));

if (inpResetConfirmation && btnConfirmResetAction) {
  inpResetConfirmation.addEventListener('input', () => {
    btnConfirmResetAction.disabled = inpResetConfirmation.value.trim() !== 'RESET';
  });

  inpResetConfirmation.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inpResetConfirmation.value.trim() === 'RESET') {
      e.preventDefault();
      btnConfirmResetAction.click();
    }
  });
}

if (btnCancelResetAction && modalResetConfirmation && inpResetConfirmation) {
  btnCancelResetAction.addEventListener('click', () => {
    modalResetConfirmation.classList.remove('active');
    inpResetConfirmation.value = '';
  });
}

if (modalResetConfirmation) {
  modalResetConfirmation.addEventListener('click', (e) => {
    if (e.target === modalResetConfirmation) {
      modalResetConfirmation.classList.remove('active');
      if (inpResetConfirmation) inpResetConfirmation.value = '';
    }
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalResetConfirmation?.classList.contains('active')) {
    modalResetConfirmation.classList.remove('active');
    if (inpResetConfirmation) inpResetConfirmation.value = '';
  }
});

if (btnConfirmResetAction && inpResetConfirmation && modalResetConfirmation) {
  btnConfirmResetAction.addEventListener('click', async () => {
    if (inpResetConfirmation.value.trim() !== 'RESET') return;
    try {
      btnConfirmResetAction.disabled = true;
      btnConfirmResetAction.textContent = 'Đang thực hiện...';
      const res = await callAdminApi('/api/admin/system/reset', {
        scope: activeResetScope,
        confirmToken: 'RESET'
      });
      showToast(res.message || 'Đã hoàn tất thao tác đặt lại');
      modalResetConfirmation.classList.remove('active');
      inpResetConfirmation.value = '';

      if (res.sceneConfig) {
        pushSceneUndo();
        activeSceneConfig = JSON.parse(JSON.stringify(res.sceneConfig));
        updateSceneEditorUI();
        renderSceneEditorCanvas();
        renderLayerStackTable();
      }

      if (res.snapshot) {
        renderSnapshot(res.snapshot, true);
      }
      void loadAudioTracks();
      void loadScenePresets();
    } catch (err: any) {
      showToast(`Lỗi đặt lại: ${err.message}`);
    } finally {
      btnConfirmResetAction.textContent = 'Xác Nhận Thực Hiện';
      btnConfirmResetAction.disabled = inpResetConfirmation.value.trim() !== 'RESET';
    }
  });
}

// ======================================================================
// 3B. PROFESSIONAL SCENE STUDIO & 9:16 VISUAL EDITOR
// ======================================================================
let activeSceneConfig: SceneConfig = JSON.parse(JSON.stringify(DEFAULT_SCENE_CONFIG));
let sceneUndoStack: SceneConfig[] = [];
let sceneRedoStack: SceneConfig[] = [];
let selectedAnchorKey:
  | 'buddhaStatue'
  | 'incenseBurner'
  | 'woodenFish'
  | 'templeBell'
  | 'ceremony'
  | 'congregation' = 'buddhaStatue';
let sceneAssetsList: SceneAssetItem[] = [];
let scenePresetsList: ScenePresetItem[] = [];
let isDraggingAnchor = false;
let sceneEditorInitialized = false;

function pushSceneUndo(): void {
  sceneUndoStack.push(JSON.parse(JSON.stringify(activeSceneConfig)));
  if (sceneUndoStack.length > 40) sceneUndoStack.shift();
  sceneRedoStack = [];
}

const editorCanvas = document.getElementById('sceneEditorCanvas') as HTMLCanvasElement | null;
const editorCtx = editorCanvas?.getContext('2d');
const editorTooltip = document.getElementById('editorAnchorTooltip');

const rngAnchorX = document.getElementById('rngAnchorX') as HTMLInputElement | null;
const numAnchorX = document.getElementById('numAnchorX') as HTMLInputElement | null;
const rngAnchorY = document.getElementById('rngAnchorY') as HTMLInputElement | null;
const numAnchorY = document.getElementById('numAnchorY') as HTMLInputElement | null;
const rngAnchorScale = document.getElementById('rngAnchorScale') as HTMLInputElement | null;
const lblAnchorScale = document.getElementById('lblAnchorScale');
const chkAnchorVisible = document.getElementById('chkAnchorVisible') as HTMLInputElement | null;
const selectedAnchorName = document.getElementById('selectedAnchorName');
const selectedAnchorCoords = document.getElementById('selectedAnchorCoords');

function selectAnchor(
  key: 'buddhaStatue' | 'incenseBurner' | 'woodenFish' | 'templeBell' | 'ceremony' | 'congregation'
): void {
  selectedAnchorKey = key;
  document.querySelectorAll('#anchorChipsContainer [data-anchor]').forEach((btn) => {
    const isThis = btn.getAttribute('data-anchor') === key;
    btn.classList.toggle('active-anchor-chip', isThis);
    btn.classList.toggle('gold', isThis);
  });

  const anchors = activeSceneConfig.anchors;
  let nameStr = '';
  let curX = 540;
  let curY = 520;
  let curScale = 1.0;
  let isVis = true;

  switch (key) {
    case 'buddhaStatue':
      nameStr = '🪷 Tượng Phật A Di Đà & Hào Quang';
      curX = anchors.buddhaStatue?.x ?? 540;
      curY = anchors.buddhaStatue?.y ?? 520;
      curScale = anchors.buddhaStatue?.scale ?? 1.0;
      isVis = anchors.buddhaStatue?.visible !== false;
      break;
    case 'incenseBurner':
      nameStr = '🔥 Lư Hương Đồng & Khói Trầm';
      curX = anchors.incenseBurner?.x ?? 540;
      curY = anchors.incenseBurner?.y ?? 845;
      curScale = anchors.incenseBurner?.scale ?? 1.0;
      isVis = anchors.incenseBurner?.visible !== false;
      break;
    case 'woodenFish':
      nameStr = '🪵 Mõ Gỗ Tụng Kinh';
      curX = anchors.woodenFish?.x ?? 210;
      curY = anchors.woodenFish?.y ?? 855;
      curScale = anchors.woodenFish?.scale ?? 1.0;
      isVis = anchors.woodenFish?.visible !== false;
      break;
    case 'templeBell':
      nameStr = '🔔 Đại Hồng Chung';
      curX = anchors.templeBell?.x ?? 870;
      curY = anchors.templeBell?.y ?? 795;
      curScale = anchors.templeBell?.scale ?? 1.0;
      isVis = anchors.templeBell?.visible !== false;
      break;
    case 'ceremony':
      nameStr = '🙏 Điểm Lạy Tam Bái (An Toàn Altar)';
      curX = anchors.ceremony?.kneelX ?? 540;
      curY = anchors.ceremony?.kneelY ?? 1060;
      curScale = 1.0;
      isVis = anchors.ceremony?.visible !== false;
      break;
    case 'congregation':
      nameStr = '👥 Vùng Bồ Đoàn Đạo Tràng';
      curX = 540;
      curY = anchors.congregation?.yTop ?? 1248;
      curScale = 1.0;
      isVis = anchors.congregation?.visible !== false;
      break;
  }

  if (selectedAnchorName) selectedAnchorName.textContent = nameStr;
  if (selectedAnchorCoords) selectedAnchorCoords.textContent = `(${Math.round(curX)}, ${Math.round(curY)})`;

  if (rngAnchorX) rngAnchorX.value = String(Math.round(curX));
  if (numAnchorX) numAnchorX.value = String(Math.round(curX));
  if (rngAnchorY) rngAnchorY.value = String(Math.round(curY));
  if (numAnchorY) numAnchorY.value = String(Math.round(curY));
  if (rngAnchorScale) rngAnchorScale.value = String(curScale);
  if (lblAnchorScale) lblAnchorScale.textContent = `${Math.round(curScale * 100)}%`;
  if (chkAnchorVisible) chkAnchorVisible.checked = isVis;

  renderSceneEditorCanvas();
}

function updateSelectedAnchorCoords(x: number, y: number, scale?: number, visible?: boolean): void {
  const anchors = activeSceneConfig.anchors;
  switch (selectedAnchorKey) {
    case 'buddhaStatue':
      anchors.buddhaStatue.x = Math.max(200, Math.min(880, Math.round(x)));
      anchors.buddhaStatue.y = Math.max(200, Math.min(700, Math.round(y)));
      if (scale !== undefined) anchors.buddhaStatue.scale = scale;
      if (visible !== undefined) anchors.buddhaStatue.visible = visible;
      break;
    case 'incenseBurner':
      anchors.incenseBurner.x = Math.max(200, Math.min(880, Math.round(x)));
      anchors.incenseBurner.y = Math.max(600, Math.min(1000, Math.round(y)));
      if (scale !== undefined) anchors.incenseBurner.scale = scale;
      if (visible !== undefined) anchors.incenseBurner.visible = visible;
      break;
    case 'woodenFish':
      anchors.woodenFish.x = Math.max(50, Math.min(450, Math.round(x)));
      anchors.woodenFish.y = Math.max(650, Math.min(1200, Math.round(y)));
      if (scale !== undefined) anchors.woodenFish.scale = scale;
      if (visible !== undefined) anchors.woodenFish.visible = visible;
      break;
    case 'templeBell':
      anchors.templeBell.x = Math.max(630, Math.min(1030, Math.round(x)));
      anchors.templeBell.y = Math.max(600, Math.min(1200, Math.round(y)));
      if (scale !== undefined) anchors.templeBell.scale = scale;
      if (visible !== undefined) anchors.templeBell.visible = visible;
      break;
    case 'ceremony':
      anchors.ceremony.kneelX = Math.max(300, Math.min(780, Math.round(x)));
      anchors.ceremony.kneelY = Math.max(960, Math.min(1400, Math.round(y)));
      if (visible !== undefined) anchors.ceremony.visible = visible;
      break;
    case 'congregation':
      anchors.congregation.yTop = Math.max(1100, Math.min(1600, Math.round(y)));
      if (visible !== undefined) anchors.congregation.visible = visible;
      break;
  }

  if (selectedAnchorCoords) {
    selectedAnchorCoords.textContent = `(${Math.round(x)}, ${Math.round(y)})`;
  }
  renderSceneEditorCanvas();
}

function renderSceneEditorCanvas(): void {
  if (!editorCanvas || !editorCtx) return;
  const ctx = editorCtx;
  const anchors = activeSceneConfig.anchors;

  ctx.clearRect(0, 0, 1080, 1920);

  // 1. Dark Hall Gradient Background
  const grad = ctx.createLinearGradient(0, 0, 0, 1920);
  grad.addColorStop(0, '#1a0804');
  grad.addColorStop(0.4, '#120503');
  grad.addColorStop(1, '#080201');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Subtle Coordinate Grid (every 120px)
  ctx.strokeStyle = 'rgba(229, 184, 91, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1080; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1920);
    ctx.stroke();
  }
  for (let y = 0; y <= 1920; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1080, y);
    ctx.stroke();
  }

  // 3. Central Red Carpet Aisle Guide
  ctx.fillStyle = 'rgba(140, 32, 20, 0.22)';
  ctx.beginPath();
  ctx.moveTo(540 - 130, 960);
  ctx.lineTo(540 + 130, 960);
  ctx.lineTo(540 + 190, 1920);
  ctx.lineTo(540 - 190, 1920);
  ctx.closePath();
  ctx.fill();

  // 4. Altar Forbidden Guardrail Zone (Y: 250..940)
  ctx.fillStyle = 'rgba(140, 32, 20, 0.18)';
  ctx.fillRect(140, 250, 800, 690);
  ctx.strokeStyle = 'rgba(255, 85, 85, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(140, 250, 800, 690);
  ctx.setLineDash([]);

  ctx.fillStyle = '#ff7777';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⛔ VÙNG BAN THỜ BẢO VỆ (GIỚI HẠN AN TOÀN · MIN Y: 960)', 540, 285);

  // 5. Congregation Seating Trapezoid
  const cong = anchors.congregation;
  if (cong && cong.visible !== false) {
    const yT = cong.yTop;
    const yB = cong.yBottom;
    const hT = cong.halfTop;
    const hB = cong.halfBottom;

    ctx.strokeStyle = 'rgba(77, 182, 172, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(540 - hT, yT);
    ctx.lineTo(540 + hT, yT);
    ctx.lineTo(540 + hB, yB);
    ctx.lineTo(540 - hB, yB);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(77, 182, 172, 0.35)';
    for (let r = 0; r < 5; r++) {
      const t = r / 4;
      const cy = yT + (yB - yT) * t;
      const ch = hT + (hB - hT) * t;
      for (const side of [-1, 1]) {
        for (let c = 0; c < 3; c++) {
          const cx = 540 + side * (ch * (0.35 + c * 0.28));
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 6. Central Ceremony Walk & Kneel Path
  const cer = anchors.ceremony;
  if (cer && cer.visible !== false) {
    ctx.strokeStyle = 'rgba(255, 228, 148, 0.85)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(cer.spawnX, cer.spawnY);
    ctx.lineTo(cer.kneelX, cer.kneelY);
    ctx.lineTo(cer.exitX, cer.exitY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Spawn Point
    ctx.fillStyle = '#ffe494';
    ctx.beginPath();
    ctx.arc(cer.spawnX, cer.spawnY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('VÀO', cer.spawnX, cer.spawnY + 5);

    // Exit Point
    ctx.fillStyle = '#e57373';
    ctx.beginPath();
    ctx.arc(cer.exitX, cer.exitY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('RA', cer.exitX, cer.exitY + 5);
  }

  // 7. Anchors Rendering Helper
  function drawAnchorBadge(
    key: typeof selectedAnchorKey,
    x: number,
    y: number,
    icon: string,
    label: string,
    radius = 48
  ): void {
    const isSelected = selectedAnchorKey === key;
    ctx.save();
    ctx.translate(x, y);

    if (isSelected) {
      ctx.strokeStyle = '#ffe494';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 228, 148, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isSelected ? 'rgba(140, 32, 20, 0.95)' : 'rgba(32, 13, 7, 0.85)';
    ctx.strokeStyle = isSelected ? '#ffd700' : 'rgba(229, 184, 91, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, -4);

    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = isSelected ? '#ffd700' : '#f8ecd6';
    ctx.fillText(label, 0, radius + 24);

    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`(${Math.round(x)}, ${Math.round(y)})`, 0, radius + 44);

    ctx.restore();
  }

  if (anchors.buddhaStatue && anchors.buddhaStatue.visible !== false) {
    drawAnchorBadge(
      'buddhaStatue',
      anchors.buddhaStatue.x,
      anchors.buddhaStatue.y,
      '🪷',
      'Phật A Di Đà',
      56
    );
  }

  if (anchors.incenseBurner && anchors.incenseBurner.visible !== false) {
    drawAnchorBadge(
      'incenseBurner',
      anchors.incenseBurner.x,
      anchors.incenseBurner.y,
      '🔥',
      'Lư Hương Đồng',
      46
    );
  }

  if (anchors.woodenFish && anchors.woodenFish.visible !== false) {
    drawAnchorBadge(
      'woodenFish',
      anchors.woodenFish.x,
      anchors.woodenFish.y,
      '🪵',
      'Mõ Gỗ',
      42
    );
  }

  if (anchors.templeBell && anchors.templeBell.visible !== false) {
    drawAnchorBadge(
      'templeBell',
      anchors.templeBell.x,
      anchors.templeBell.y,
      '🔔',
      'Đại Hồng Chung',
      42
    );
  }

  if (anchors.ceremony && anchors.ceremony.visible !== false) {
    drawAnchorBadge(
      'ceremony',
      anchors.ceremony.kneelX,
      anchors.ceremony.kneelY,
      '🙏',
      'Lạy Tam Bái (Min Y: 960)',
      50
    );
  }

  // Header Banner
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, 1080, 72);
  ctx.fillStyle = '#ffe494';
  ctx.font = 'bold 26px "Noto Serif", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHÁNH ĐIỆN TỊNH TÂM · KHUNG THIẾT KẾ 9:16', 540, 46);
}

let selectedLayerId: SceneLayerId = 'background';

function updateSceneEditorUI(): void {
  const anchors = activeSceneConfig.anchors;

  // Sync Buddha Statue manual inputs
  if (anchors.buddhaStatue) {
    const bx = document.getElementById('inpManualBuddhaX') as HTMLInputElement | null;
    const by = document.getElementById('inpManualBuddhaY') as HTMLInputElement | null;
    const bs = document.getElementById('inpManualBuddhaScale') as HTMLInputElement | null;
    const bv = document.getElementById('chkManualBuddhaVis') as HTMLInputElement | null;
    if (bx) bx.value = String(anchors.buddhaStatue.x);
    if (by) by.value = String(anchors.buddhaStatue.y);
    if (bs) bs.value = String(anchors.buddhaStatue.scale ?? 1.0);
    if (bv) bv.checked = anchors.buddhaStatue.visible !== false;
  }

  // Sync Incense Burner manual inputs
  if (anchors.incenseBurner) {
    const ix = document.getElementById('inpManualIncenseX') as HTMLInputElement | null;
    const iy = document.getElementById('inpManualIncenseY') as HTMLInputElement | null;
    const is = document.getElementById('inpManualIncenseScale') as HTMLInputElement | null;
    const iv = document.getElementById('chkManualIncenseVis') as HTMLInputElement | null;
    if (ix) ix.value = String(anchors.incenseBurner.x);
    if (iy) iy.value = String(anchors.incenseBurner.y);
    if (is) is.value = String(anchors.incenseBurner.scale ?? 1.0);
    if (iv) iv.checked = anchors.incenseBurner.visible !== false;
  }

  // Sync Wooden Fish manual inputs
  if (anchors.woodenFish) {
    const fx = document.getElementById('inpManualFishX') as HTMLInputElement | null;
    const fy = document.getElementById('inpManualFishY') as HTMLInputElement | null;
    const fs = document.getElementById('inpManualFishScale') as HTMLInputElement | null;
    const fv = document.getElementById('chkManualFishVis') as HTMLInputElement | null;
    if (fx) fx.value = String(anchors.woodenFish.x);
    if (fy) fy.value = String(anchors.woodenFish.y);
    if (fs) fs.value = String(anchors.woodenFish.scale ?? 1.0);
    if (fv) fv.checked = anchors.woodenFish.visible !== false;
  }

  // Sync Temple Bell manual inputs
  if (anchors.templeBell) {
    const lx = document.getElementById('inpManualBellX') as HTMLInputElement | null;
    const ly = document.getElementById('inpManualBellY') as HTMLInputElement | null;
    const ls = document.getElementById('inpManualBellScale') as HTMLInputElement | null;
    const lv = document.getElementById('chkManualBellVis') as HTMLInputElement | null;
    if (lx) lx.value = String(anchors.templeBell.x);
    if (ly) ly.value = String(anchors.templeBell.y);
    if (ls) ls.value = String(anchors.templeBell.scale ?? 1.0);
    if (lv) lv.checked = anchors.templeBell.visible !== false;
  }

  // Sync Ceremony Walk & Kneel inputs
  const cer = anchors.ceremony;
  if (cer) {
    const spX = document.getElementById('inpCeremonySpawnX') as HTMLInputElement | null;
    const spY = document.getElementById('inpCeremonySpawnY') as HTMLInputElement | null;
    const knX = document.getElementById('inpCeremonyKneelX') as HTMLInputElement | null;
    const knY = document.getElementById('inpCeremonyKneelY') as HTMLInputElement | null;
    const exX = document.getElementById('inpCeremonyExitX') as HTMLInputElement | null;
    const exY = document.getElementById('inpCeremonyExitY') as HTMLInputElement | null;
    const cv = document.getElementById('chkCeremonyVis') as HTMLInputElement | null;
    if (spX) spX.value = String(cer.spawnX);
    if (spY) spY.value = String(cer.spawnY);
    if (knX) knX.value = String(cer.kneelX);
    if (knY) knY.value = String(cer.kneelY);
    if (exX) exX.value = String(cer.exitX);
    if (exY) exY.value = String(cer.exitY);
    if (cv) cv.checked = cer.visible !== false;
  }

  // Sync Congregation Trapezoid inputs
  const cong = anchors.congregation;
  if (cong) {
    const yT = document.getElementById('inpCongYTop') as HTMLInputElement | null;
    const hT = document.getElementById('inpCongHalfTop') as HTMLInputElement | null;
    const yB = document.getElementById('inpCongYBottom') as HTMLInputElement | null;
    const hB = document.getElementById('inpCongHalfBottom') as HTMLInputElement | null;
    const gv = document.getElementById('chkCongregationVis') as HTMLInputElement | null;
    if (yT) yT.value = String(cong.yTop);
    if (hT) hT.value = String(cong.halfTop);
    if (yB) yB.value = String(cong.yBottom);
    if (hB) hB.value = String(cong.halfBottom);
    if (gv) gv.checked = cong.visible !== false;
  }

  selectAnchor(selectedAnchorKey);
  renderLayerStackTable();
}

function selectLayer(layerId: SceneLayerId): void {
  selectedLayerId = layerId;
  const rows = document.querySelectorAll('#layerTableBody tr');
  const layers = activeSceneConfig.layers || [];
  const idx = layers.findIndex((l) => l.id === layerId);
  rows.forEach((r, i) => {
    r.classList.toggle('selected-layer-row', i === idx);
  });
  syncSelectedLayerPropsCard();
}

function syncSelectedLayerPropsCard(): void {
  const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
  if (!layer) return;

  const layerNames: Record<string, string> = {
    background: '1. Phông Nền Chánh Điện (Background)',
    architecture: '2. Cột Kèo & Mái Chùa (Architecture)',
    altar: '3. Ban Thờ, Tượng & Pháp Khí (Altar)',
    floor: '4. Sàn Lễ Bái & Bồ Đoàn (Floor)',
    characters: '5. Tăng Đoàn & Phật Tử (Characters)',
    ceremony: '6. Nghi Lễ Tam Bái & Dâng Lễ (Ceremony)',
    foreground: '7. Hồ Sen Tiền Cảnh & Hoa Đăng (Foreground)',
    particles: '8. Khói Trầm & Cánh Hoa (Particles)',
    hud: '9. Khung Thông Tin SafeZone (HUD)'
  };

  const lblName = document.getElementById('lblSelectedLayerName');
  const lblBadge = document.getElementById('lblSelectedLayerBadge');
  const inpX = document.getElementById('inpDetailLayerX') as HTMLInputElement | null;
  const inpY = document.getElementById('inpDetailLayerY') as HTMLInputElement | null;
  const selScaleMode = document.getElementById('selDetailLayerScaleMode') as HTMLSelectElement | null;
  const rngScaleX = document.getElementById('rngDetailLayerScaleX') as HTMLInputElement | null;
  const lblScaleX = document.getElementById('lblDetailLayerScaleX');
  const rngScaleY = document.getElementById('rngDetailLayerScaleY') as HTMLInputElement | null;
  const lblScaleY = document.getElementById('lblDetailLayerScaleY');
  const rngOpacity = document.getElementById('rngDetailLayerOpacity') as HTMLInputElement | null;
  const lblOpacity = document.getElementById('lblDetailLayerOpacity');
  const selBlend = document.getElementById('selDetailLayerBlendMode') as HTMLSelectElement | null;
  const selAsset = document.getElementById('selDetailLayerAsset') as HTMLSelectElement | null;
  const chkVis = document.getElementById('chkDetailLayerVisible') as HTMLInputElement | null;
  const chkLock = document.getElementById('chkDetailLayerLocked') as HTMLInputElement | null;
  const chkHide = document.getElementById('chkDetailLayerHideProc') as HTMLInputElement | null;

  if (lblName) lblName.textContent = layerNames[layer.id] || layer.name || layer.id;
  if (lblBadge) lblBadge.textContent = `ID: ${layer.id} (Thứ tự: ${layer.order ?? '?'})`;

  if (inpX) inpX.value = String(layer.x ?? 0);
  if (inpY) inpY.value = String(layer.y ?? 0);
  if (selScaleMode) selScaleMode.value = layer.scaleMode || 'cover';
  if (rngScaleX) rngScaleX.value = String(layer.scaleX ?? 1.0);
  if (lblScaleX) lblScaleX.textContent = `${Math.round((layer.scaleX ?? 1.0) * 100)}%`;
  if (rngScaleY) rngScaleY.value = String(layer.scaleY ?? 1.0);
  if (lblScaleY) lblScaleY.textContent = `${Math.round((layer.scaleY ?? 1.0) * 100)}%`;
  if (rngOpacity) rngOpacity.value = String(layer.opacity ?? 1.0);
  if (lblOpacity) lblOpacity.textContent = `${Math.round((layer.opacity ?? 1.0) * 100)}%`;
  if (selBlend) selBlend.value = layer.blendMode || 'normal';
  if (chkVis) chkVis.checked = layer.visible !== false;
  if (chkLock) chkLock.checked = Boolean(layer.locked);
  if (chkHide) chkHide.checked = Boolean(layer.hideProcedural);

  if (selAsset) {
    selAsset.replaceChildren();
    const optDef = document.createElement('option');
    optDef.value = '';
    optDef.textContent = '(Không gán · Đồ họa mặc định)';
    selAsset.appendChild(optDef);
    for (const a of sceneAssetsList) {
      const opt = document.createElement('option');
      opt.value = a.url;
      opt.textContent = `${a.name} (${a.mediaType})`;
      if (layer.assetUrl === a.url) opt.selected = true;
      selAsset.appendChild(opt);
    }
  }
}

function moveLayerOrder(fromIdx: number, toIdx: number): void {
  const layers = activeSceneConfig.layers;
  if (!layers || fromIdx < 0 || toIdx < 0 || fromIdx >= layers.length || toIdx >= layers.length) return;
  pushSceneUndo();
  const moved = layers.splice(fromIdx, 1)[0];
  layers.splice(toIdx, 0, moved);
  layers.forEach((l, i) => { l.order = i + 1; });
  renderLayerStackTable();
  renderSceneEditorCanvas();
  showToast(`Đã đổi vị trí layer [${moved.name || moved.id}]`);
}

function renderLayerStackTable(): void {
  const tbody = document.getElementById('layerTableBody');
  if (!tbody) return;
  tbody.replaceChildren();

  const layerNames: Record<string, string> = {
    background: '1. Phông Nền Chánh Điện (Background)',
    architecture: '2. Cột Kèo & Mái Chùa (Architecture)',
    altar: '3. Ban Thờ, Tượng & Pháp Khí (Altar)',
    floor: '4. Sàn Lễ Bái & Bồ Đoàn (Floor)',
    characters: '5. Tăng Đoàn & Phật Tử (Characters)',
    ceremony: '6. Nghi Lễ Tam Bái & Dâng Lễ (Ceremony)',
    foreground: '7. Hồ Sen Tiền Cảnh & Hoa Đăng (Foreground)',
    particles: '8. Khói Trầm & Cánh Hoa (Particles)',
    hud: '9. Khung Thông Tin SafeZone (HUD)'
  };

  const layers = activeSceneConfig.layers || [];
  layers.forEach((layer, idx) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(229,184,91,0.15)';
    tr.style.cursor = 'pointer';
    if (layer.id === selectedLayerId) {
      tr.classList.add('selected-layer-row');
    }

    tr.onclick = (e) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
      selectLayer(layer.id);
    };

    // 1. Thứ tự & Reorder buttons
    const tdOrder = document.createElement('td');
    tdOrder.style.padding = '8px 10px';
    tdOrder.style.fontFamily = 'monospace';
    tdOrder.style.textAlign = 'center';
    tdOrder.textContent = String(layer.order ?? (idx + 1));

    // 2. Tên Layer
    const tdName = document.createElement('td');
    tdName.textContent = layerNames[layer.id] || layer.name || layer.id;
    tdName.style.padding = '8px 10px';
    tdName.style.fontWeight = '600';
    tdName.style.color = 'var(--text)';

    // 3. Asset selector
    const tdAsset = document.createElement('td');
    tdAsset.style.padding = '8px 10px';
    const selAsset = document.createElement('select');
    selAsset.style.fontSize = '12px';
    selAsset.style.padding = '3px 6px';
    selAsset.style.maxWidth = '180px';
    selAsset.innerHTML = '<option value="">(Không gán · Mặc định)</option>';

    for (const asset of sceneAssetsList) {
      const opt = document.createElement('option');
      opt.value = asset.url;
      opt.textContent = `${asset.name} (${asset.mediaType})`;
      if (layer.assetUrl === asset.url) opt.selected = true;
      selAsset.appendChild(opt);
    }

    selAsset.onchange = () => {
      pushSceneUndo();
      layer.assetUrl = selAsset.value || undefined;
      syncSelectedLayerPropsCard();
      renderSceneEditorCanvas();
    };
    tdAsset.appendChild(selAsset);

    // 4. Scale mode selector
    const tdScale = document.createElement('td');
    tdScale.style.padding = '8px 10px';
    const selScale = document.createElement('select');
    selScale.style.fontSize = '12px';
    selScale.style.padding = '3px 6px';
    ['cover', 'contain', 'center', 'custom'].forEach((mode) => {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode.toUpperCase();
      if (layer.scaleMode === mode) opt.selected = true;
      selScale.appendChild(opt);
    });
    selScale.onchange = () => {
      pushSceneUndo();
      layer.scaleMode = selScale.value as any;
      syncSelectedLayerPropsCard();
      renderSceneEditorCanvas();
    };
    tdScale.appendChild(selScale);

    // 5. Opacity slider
    const tdOpacity = document.createElement('td');
    tdOpacity.style.padding = '8px 10px';
    const rngOp = document.createElement('input');
    rngOp.type = 'range';
    rngOp.min = '0';
    rngOp.max = '1';
    rngOp.step = '0.05';
    rngOp.value = String(layer.opacity ?? 1.0);
    rngOp.style.width = '70px';
    const lblOp = document.createElement('span');
    lblOp.style.fontSize = '11px';
    lblOp.style.marginLeft = '4px';
    lblOp.textContent = `${Math.round((layer.opacity ?? 1.0) * 100)}%`;
    rngOp.oninput = () => {
      layer.opacity = Number(rngOp.value);
      lblOp.textContent = `${Math.round(Number(rngOp.value) * 100)}%`;
      syncSelectedLayerPropsCard();
      renderSceneEditorCanvas();
    };
    tdOpacity.append(rngOp, lblOp);

    // 6. Hide Procedural checkbox
    const tdHideProc = document.createElement('td');
    tdHideProc.style.padding = '8px 10px';
    tdHideProc.style.textAlign = 'center';
    const chkHide = document.createElement('input');
    chkHide.type = 'checkbox';
    chkHide.checked = Boolean(layer.hideProcedural);
    chkHide.title = 'Ẩn đồ họa gốc khi có ảnh tùy chỉnh để tránh bị lặp đôi';
    chkHide.onchange = () => {
      pushSceneUndo();
      layer.hideProcedural = chkHide.checked;
      syncSelectedLayerPropsCard();
      renderSceneEditorCanvas();
    };
    tdHideProc.appendChild(chkHide);

    // 7. Visible checkbox
    const tdVis = document.createElement('td');
    tdVis.style.textAlign = 'center';
    tdVis.style.padding = '8px 10px';
    const chkVis = document.createElement('input');
    chkVis.type = 'checkbox';
    chkVis.checked = layer.visible !== false;
    chkVis.onchange = () => {
      pushSceneUndo();
      layer.visible = chkVis.checked;
      syncSelectedLayerPropsCard();
      renderSceneEditorCanvas();
    };
    tdVis.appendChild(chkVis);

    // 8. Lock checkbox
    const tdLock = document.createElement('td');
    tdLock.style.textAlign = 'center';
    tdLock.style.padding = '8px 10px';
    const chkLock = document.createElement('input');
    chkLock.type = 'checkbox';
    chkLock.checked = Boolean(layer.locked);
    chkLock.onchange = () => {
      pushSceneUndo();
      layer.locked = chkLock.checked;
      syncSelectedLayerPropsCard();
    };
    tdLock.appendChild(chkLock);

    // 9. Move buttons
    const tdMove = document.createElement('td');
    tdMove.style.textAlign = 'center';
    tdMove.style.padding = '8px 10px';
    tdMove.style.whiteSpace = 'nowrap';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'btn-layer-order';
    btnUp.textContent = '▲';
    btnUp.title = 'Chuyển layer lên trên';
    btnUp.disabled = idx === 0;
    btnUp.onclick = (e) => {
      e.stopPropagation();
      moveLayerOrder(idx, idx - 1);
    };

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'btn-layer-order';
    btnDown.textContent = '▼';
    btnDown.title = 'Chuyển layer xuống dưới';
    btnDown.disabled = idx === layers.length - 1;
    btnDown.style.marginLeft = '4px';
    btnDown.onclick = (e) => {
      e.stopPropagation();
      moveLayerOrder(idx, idx + 1);
    };

    tdMove.append(btnUp, btnDown);

    tr.append(tdOrder, tdName, tdAsset, tdScale, tdOpacity, tdHideProc, tdVis, tdLock, tdMove);
    tbody.appendChild(tr);
  });

  syncSelectedLayerPropsCard();
}

async function loadSceneAssets(): Promise<void> {
  try {
    const res = await callAdminApi('/api/admin/scene/assets');
    sceneAssetsList = res.assets || [];
    renderSceneAssetsGallery();
    renderLayerStackTable();
  } catch {
    // ignore
  }
}

function renderSceneAssetsGallery(): void {
  const grid = document.getElementById('sceneAssetGrid');
  const countEl = document.getElementById('sceneAssetCount');
  if (countEl) countEl.textContent = String(sceneAssetsList.length);
  if (!grid) return;

  if (sceneAssetsList.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1; text-align:center; color:var(--muted); padding:24px;">Chưa có tư liệu nào trong kho. Hãy chọn tệp bên trái để tải lên.</div>';
    return;
  }

  grid.replaceChildren();
  for (const asset of sceneAssetsList) {
    const card = document.createElement('div');
    card.className = 'scene-asset-card';

    const thumbHtml =
      asset.mediaType === 'video'
        ? `<video src="${asset.url}" class="scene-asset-thumb" muted autoplay loop playsinline></video>`
        : `<img src="${asset.url}" class="scene-asset-thumb" alt="${asset.name}" />`;

    const sizeMb = (asset.fileSizeBytes / (1024 * 1024)).toFixed(1);

    card.innerHTML = `
      ${thumbHtml}
      <div style="font-weight:600; font-size:12px; color:var(--gold-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${asset.name}</div>
      <div style="font-size:11px; color:var(--muted); display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>${asset.targetLayer || asset.layerTarget || 'background'}</span>
        <span>${sizeMb} MB</span>
      </div>
      <div style="display:flex; gap:4px; align-items:center;">
        <select class="sel-asset-layer-assign" style="flex:1; font-size:11px; padding:2px 4px;">
          <option value="background" ${asset.targetLayer === 'background' ? 'selected' : ''}>1. Phông Nền</option>
          <option value="architecture" ${asset.targetLayer === 'architecture' ? 'selected' : ''}>2. Cột Kèo</option>
          <option value="altar" ${asset.targetLayer === 'altar' ? 'selected' : ''}>3. Ban Thờ</option>
          <option value="floor" ${asset.targetLayer === 'floor' ? 'selected' : ''}>4. Sàn Lễ</option>
          <option value="characters" ${asset.targetLayer === 'characters' ? 'selected' : ''}>5. Đạo Tràng</option>
          <option value="ceremony" ${asset.targetLayer === 'ceremony' ? 'selected' : ''}>6. Nghi Lễ</option>
          <option value="foreground" ${asset.targetLayer === 'foreground' ? 'selected' : ''}>7. Tiền Cảnh</option>
          <option value="particles" ${asset.targetLayer === 'particles' ? 'selected' : ''}>8. Khói Trầm</option>
        </select>
        <button type="button" class="btn-assign-asset-chosen" data-url="${asset.url}" style="font-size:11px; padding:3px 6px;">Gán</button>
        <button type="button" class="btn-del-asset" data-id="${asset.id}" style="color:var(--danger); border-color:var(--danger); font-size:11px; padding:3px 6px;">🗑️</button>
      </div>
    `;

    grid.appendChild(card);
  }

  grid.querySelectorAll<HTMLButtonElement>('.btn-assign-asset-chosen').forEach((btn) => {
    btn.onclick = () => {
      const url = btn.getAttribute('data-url');
      const card = btn.closest('.scene-asset-card');
      const selTarget = card?.querySelector('.sel-asset-layer-assign') as HTMLSelectElement | null;
      const target = selTarget?.value || 'background';
      if (!url) return;
      pushSceneUndo();
      const layer = activeSceneConfig.layers?.find((l) => l.id === target);
      if (layer) {
        layer.assetUrl = url;
        renderLayerStackTable();
        renderSceneEditorCanvas();
        showToast(`Đã gán tư liệu vào layer [${target}]`);
      }
    };
  });

  grid.querySelectorAll<HTMLButtonElement>('.btn-del-asset').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Bạn có chắc muốn xóa tư liệu cảnh này?')) return;
      try {
        await callAdminApi('/api/admin/scene/assets/delete', { id });
        showToast('Đã xóa tư liệu');
        void loadSceneAssets();
      } catch (e: any) {
        showToast(`Lỗi xóa: ${e.message}`);
      }
    };
  });
}

async function loadScenePresets(): Promise<void> {
  try {
    const res = await callAdminApi('/api/admin/scene/presets');
    scenePresetsList = res.presets || [];
    const sel = document.getElementById('selScenePreset') as HTMLSelectElement | null;
    if (!sel) return;
    sel.replaceChildren();
    for (const p of scenePresetsList) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.isBuiltin ? '🏛️' : '💾'} ${p.name}`;
      sel.appendChild(opt);
    }
  } catch {
    // ignore
  }
}

async function applyActiveSceneToLive(): Promise<void> {
  try {
    const res = await callAdminApi('/api/admin/scene/active/update', {
      sceneConfig: activeSceneConfig
    });
    activeSceneConfig = res.sceneConfig;
    showToast('⚡ Đã phát cấu hình cảnh Chùa lên LIVE qua WebSocket!');
    if (res.snapshot) renderSnapshot(res.snapshot);
  } catch (e: any) {
    showToast(`Lỗi phát LIVE: ${e.message}`);
  }
}

function initSceneStudio(): void {
  // 1. Independent Tab Switching without full reload
  document.querySelectorAll<HTMLButtonElement>('#sceneNavTabs .audio-tab-btn[data-scenetab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sceneNavTabs .audio-tab-btn[data-scenetab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('#sceneStudioSection .scene-tab-panel, #sceneStudioSection .audio-tab-content').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-scenetab');
      if (tabId) {
        const targetPanel = document.getElementById(tabId);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
        if (tabId === 'tabVisualEditor') {
          renderSceneEditorCanvas();
        } else if (tabId === 'tabLayerStack') {
          renderLayerStackTable();
        } else if (tabId === 'tabAnchorsConfig') {
          updateSceneEditorUI();
        } else if (tabId === 'tabSceneAssets') {
          renderSceneAssetsGallery();
        }
      }
    });
  });

  // 2. Anchor chips in Tab 1
  document.querySelectorAll<HTMLButtonElement>('#anchorChipsContainer [data-anchor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-anchor') as any;
      if (key) selectAnchor(key);
    });
  });

  // 3. Tab 1 Range & Number input synchronization
  if (rngAnchorX) {
    rngAnchorX.oninput = () => {
      if (numAnchorX) numAnchorX.value = rngAnchorX.value;
      updateSelectedAnchorCoords(Number(rngAnchorX.value), Number(rngAnchorY?.value || 520));
    };
  }
  if (numAnchorX) {
    numAnchorX.oninput = () => {
      if (rngAnchorX) rngAnchorX.value = numAnchorX.value;
      updateSelectedAnchorCoords(Number(numAnchorX.value), Number(rngAnchorY?.value || 520));
    };
  }
  if (rngAnchorY) {
    rngAnchorY.oninput = () => {
      if (numAnchorY) numAnchorY.value = rngAnchorY.value;
      updateSelectedAnchorCoords(Number(rngAnchorX?.value || 540), Number(rngAnchorY.value));
    };
  }
  if (numAnchorY) {
    numAnchorY.oninput = () => {
      if (rngAnchorY) rngAnchorY.value = numAnchorY.value;
      updateSelectedAnchorCoords(Number(rngAnchorX?.value || 540), Number(numAnchorY.value));
    };
  }
  if (rngAnchorScale) {
    rngAnchorScale.oninput = () => {
      const sc = Number(rngAnchorScale.value);
      if (lblAnchorScale) lblAnchorScale.textContent = `${Math.round(sc * 100)}%`;
      updateSelectedAnchorCoords(
        Number(rngAnchorX?.value || 540),
        Number(rngAnchorY?.value || 520),
        sc
      );
    };
  }
  if (chkAnchorVisible) {
    chkAnchorVisible.onchange = () => {
      updateSelectedAnchorCoords(
        Number(rngAnchorX?.value || 540),
        Number(rngAnchorY?.value || 520),
        undefined,
        chkAnchorVisible.checked
      );
    };
  }

  // 4. Interactive 9:16 Canvas Drag & Drop with Guardrails
  if (editorCanvas) {
    editorCanvas.addEventListener('pointerdown', (e) => {
      const rect = editorCanvas.getBoundingClientRect();
      const scaleX = 1080 / rect.width;
      const scaleY = 1920 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const anchors = activeSceneConfig.anchors;
      const candidateList: Array<{
        key: typeof selectedAnchorKey;
        ax: number;
        ay: number;
        radius: number;
      }> = [
        { key: 'buddhaStatue', ax: anchors.buddhaStatue.x, ay: anchors.buddhaStatue.y, radius: 70 },
        { key: 'incenseBurner', ax: anchors.incenseBurner.x, ay: anchors.incenseBurner.y, radius: 60 },
        { key: 'woodenFish', ax: anchors.woodenFish.x, ay: anchors.woodenFish.y, radius: 55 },
        { key: 'templeBell', ax: anchors.templeBell.x, ay: anchors.templeBell.y, radius: 55 },
        { key: 'ceremony', ax: anchors.ceremony.kneelX, ay: anchors.ceremony.kneelY, radius: 65 }
      ];

      for (const c of candidateList) {
        const dist = Math.hypot(x - c.ax, y - c.ay);
        if (dist <= c.radius) {
          pushSceneUndo();
          selectAnchor(c.key);
          isDraggingAnchor = true;
          editorCanvas.style.cursor = 'grabbing';
          return;
        }
      }
    });

    editorCanvas.addEventListener('pointermove', (e) => {
      const rect = editorCanvas.getBoundingClientRect();
      const scaleX = 1080 / rect.width;
      const scaleY = 1920 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (!isDraggingAnchor) {
        // Hover cursor cue
        const anchors = activeSceneConfig.anchors;
        const candidateList = [
          { ax: anchors.buddhaStatue.x, ay: anchors.buddhaStatue.y, radius: 70 },
          { ax: anchors.incenseBurner.x, ay: anchors.incenseBurner.y, radius: 60 },
          { ax: anchors.woodenFish.x, ay: anchors.woodenFish.y, radius: 55 },
          { ax: anchors.templeBell.x, ay: anchors.templeBell.y, radius: 55 },
          { ax: anchors.ceremony.kneelX, ay: anchors.ceremony.kneelY, radius: 65 }
        ];
        const isHovering = candidateList.some((c) => Math.hypot(x - c.ax, y - c.ay) <= c.radius);
        editorCanvas.style.cursor = isHovering ? 'grab' : 'crosshair';
        return;
      }

      updateSelectedAnchorCoords(x, y);

      // Read back the safely clamped coordinates from anchors
      const anchors = activeSceneConfig.anchors;
      let clampedX = Math.round(x);
      let clampedY = Math.round(y);
      switch (selectedAnchorKey) {
        case 'buddhaStatue':
          clampedX = anchors.buddhaStatue.x;
          clampedY = anchors.buddhaStatue.y;
          break;
        case 'incenseBurner':
          clampedX = anchors.incenseBurner.x;
          clampedY = anchors.incenseBurner.y;
          break;
        case 'woodenFish':
          clampedX = anchors.woodenFish.x;
          clampedY = anchors.woodenFish.y;
          break;
        case 'templeBell':
          clampedX = anchors.templeBell.x;
          clampedY = anchors.templeBell.y;
          break;
        case 'ceremony':
          clampedX = anchors.ceremony.kneelX;
          clampedY = anchors.ceremony.kneelY;
          break;
      }

      if (rngAnchorX) rngAnchorX.value = String(clampedX);
      if (numAnchorX) numAnchorX.value = String(clampedX);
      if (rngAnchorY) rngAnchorY.value = String(clampedY);
      if (numAnchorY) numAnchorY.value = String(clampedY);
    });

    window.addEventListener('pointerup', () => {
      if (isDraggingAnchor) {
        isDraggingAnchor = false;
        if (editorCanvas) editorCanvas.style.cursor = 'crosshair';
      }
    });
  }

  // 5. Selected Layer Properties Panel Events
  const inpDetailX = document.getElementById('inpDetailLayerX') as HTMLInputElement | null;
  const inpDetailY = document.getElementById('inpDetailLayerY') as HTMLInputElement | null;
  const selDetailScaleMode = document.getElementById('selDetailLayerScaleMode') as HTMLSelectElement | null;
  const rngDetailScaleX = document.getElementById('rngDetailLayerScaleX') as HTMLInputElement | null;
  const lblDetailScaleX = document.getElementById('lblDetailLayerScaleX');
  const rngDetailScaleY = document.getElementById('rngDetailLayerScaleY') as HTMLInputElement | null;
  const lblDetailScaleY = document.getElementById('lblDetailLayerScaleY');
  const rngDetailOpacity = document.getElementById('rngDetailLayerOpacity') as HTMLInputElement | null;
  const lblDetailOpacity = document.getElementById('lblDetailLayerOpacity');
  const selDetailBlend = document.getElementById('selDetailLayerBlendMode') as HTMLSelectElement | null;
  const selDetailAsset = document.getElementById('selDetailLayerAsset') as HTMLSelectElement | null;
  const chkDetailVis = document.getElementById('chkDetailLayerVisible') as HTMLInputElement | null;
  const chkDetailLock = document.getElementById('chkDetailLayerLocked') as HTMLInputElement | null;
  const chkDetailHide = document.getElementById('chkDetailLayerHideProc') as HTMLInputElement | null;

  if (inpDetailX) {
    inpDetailX.oninput = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.x = Number(inpDetailX.value) || 0;
        renderSceneEditorCanvas();
      }
    };
  }
  if (inpDetailY) {
    inpDetailY.oninput = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.y = Number(inpDetailY.value) || 0;
        renderSceneEditorCanvas();
      }
    };
  }
  if (selDetailScaleMode) {
    selDetailScaleMode.onchange = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.scaleMode = selDetailScaleMode.value as any;
        renderLayerStackTable();
        renderSceneEditorCanvas();
      }
    };
  }
  if (rngDetailScaleX) {
    rngDetailScaleX.oninput = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.scaleX = Number(rngDetailScaleX.value);
        if (lblDetailScaleX) lblDetailScaleX.textContent = `${Math.round(layer.scaleX * 100)}%`;
        renderSceneEditorCanvas();
      }
    };
  }
  if (rngDetailScaleY) {
    rngDetailScaleY.oninput = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.scaleY = Number(rngDetailScaleY.value);
        if (lblDetailScaleY) lblDetailScaleY.textContent = `${Math.round(layer.scaleY * 100)}%`;
        renderSceneEditorCanvas();
      }
    };
  }
  if (rngDetailOpacity) {
    rngDetailOpacity.oninput = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.opacity = Number(rngDetailOpacity.value);
        if (lblDetailOpacity) lblDetailOpacity.textContent = `${Math.round(layer.opacity * 100)}%`;
        renderLayerStackTable();
        renderSceneEditorCanvas();
      }
    };
  }
  if (selDetailBlend) {
    selDetailBlend.onchange = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.blendMode = selDetailBlend.value as any;
        renderSceneEditorCanvas();
      }
    };
  }
  if (selDetailAsset) {
    selDetailAsset.onchange = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.assetUrl = selDetailAsset.value || undefined;
        renderLayerStackTable();
        renderSceneEditorCanvas();
      }
    };
  }
  if (chkDetailVis) {
    chkDetailVis.onchange = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.visible = chkDetailVis.checked;
        renderLayerStackTable();
        renderSceneEditorCanvas();
      }
    };
  }
  if (chkDetailLock) {
    chkDetailLock.onchange = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.locked = chkDetailLock.checked;
        renderLayerStackTable();
      }
    };
  }
  if (chkDetailHide) {
    chkDetailHide.onchange = () => {
      const layer = activeSceneConfig.layers?.find((l) => l.id === selectedLayerId);
      if (layer) {
        layer.hideProcedural = chkDetailHide.checked;
        renderLayerStackTable();
        renderSceneEditorCanvas();
      }
    };
  }

  // 6. Action buttons (Presets, Reset, Undo, Redo, Apply)
  document.getElementById('btnApplySceneToLive')?.addEventListener('click', () => {
    void applyActiveSceneToLive();
  });

  document.getElementById('btnApplyScenePreset')?.addEventListener('click', async () => {
    const sel = document.getElementById('selScenePreset') as HTMLSelectElement | null;
    const presetId = sel?.value;
    if (!presetId) return;
    try {
      pushSceneUndo();
      const res = await callAdminApi('/api/admin/scene/presets/apply', { id: presetId });
      activeSceneConfig = res.sceneConfig;
      updateSceneEditorUI();
      renderSceneEditorCanvas();
      showToast('Đã nạp preset và áp dụng lên LIVE thành công');
      if (res.snapshot) renderSnapshot(res.snapshot);
    } catch (e: any) {
      showToast(`Lỗi áp dụng preset: ${e.message}`);
    }
  });

  document.getElementById('btnSaveCurrentPreset')?.addEventListener('click', async () => {
    const name = prompt('Nhập tên cho Preset mới:', 'Chánh Điện Thiết Kế');
    if (!name || !name.trim()) return;
    const presetId = `preset_${Date.now()}`;
    const newPreset: ScenePresetItem = {
      id: presetId,
      name: name.trim(),
      isBuiltin: false,
      config: JSON.parse(JSON.stringify(activeSceneConfig)),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    try {
      await callAdminApi('/api/admin/scene/presets/save', { preset: newPreset });
      showToast(`Đã lưu preset [${name}] vào SQLite`);
      void loadScenePresets();
    } catch (e: any) {
      showToast(`Lỗi lưu preset: ${e.message}`);
    }
  });

  document.getElementById('btnResetSceneDefault')?.addEventListener('click', () => {
    openResetModal('scene');
  });

  document.getElementById('btnUndoScene')?.addEventListener('click', () => {
    if (sceneUndoStack.length === 0) {
      showToast('Không có thao tác nào để hoàn tác');
      return;
    }
    const prev = sceneUndoStack.pop()!;
    sceneRedoStack.push(JSON.parse(JSON.stringify(activeSceneConfig)));
    activeSceneConfig = prev;
    updateSceneEditorUI();
    renderSceneEditorCanvas();
    showToast('Đã hoàn tác (Undo)');
  });

  document.getElementById('btnRedoScene')?.addEventListener('click', () => {
    if (sceneRedoStack.length === 0) {
      showToast('Không có thao tác nào để làm lại');
      return;
    }
    const next = sceneRedoStack.pop()!;
    sceneUndoStack.push(JSON.parse(JSON.stringify(activeSceneConfig)));
    activeSceneConfig = next;
    updateSceneEditorUI();
    renderSceneEditorCanvas();
    showToast('Đã làm lại (Redo)');
  });

  document.getElementById('btnSaveLayerConfig')?.addEventListener('click', () => {
    void applyActiveSceneToLive();
  });

  // 7. Tab 3: Detailed Coordinates & Guardrails Manual Save
  document.getElementById('btnSaveAnchorsManual')?.addEventListener('click', () => {
    pushSceneUndo();
    const anchors = activeSceneConfig.anchors;

    // Buddha Statue
    const bx = document.getElementById('inpManualBuddhaX') as HTMLInputElement | null;
    const by = document.getElementById('inpManualBuddhaY') as HTMLInputElement | null;
    const bs = document.getElementById('inpManualBuddhaScale') as HTMLInputElement | null;
    const bv = document.getElementById('chkManualBuddhaVis') as HTMLInputElement | null;
    if (anchors.buddhaStatue && bx && by && bs) {
      anchors.buddhaStatue.x = Math.max(200, Math.min(880, Number(bx.value) || 540));
      anchors.buddhaStatue.y = Math.max(200, Math.min(700, Number(by.value) || 520));
      anchors.buddhaStatue.scale = Math.max(0.5, Math.min(2.0, Number(bs.value) || 1.0));
      if (bv) anchors.buddhaStatue.visible = bv.checked;
    }

    // Incense Burner
    const ix = document.getElementById('inpManualIncenseX') as HTMLInputElement | null;
    const iy = document.getElementById('inpManualIncenseY') as HTMLInputElement | null;
    const is = document.getElementById('inpManualIncenseScale') as HTMLInputElement | null;
    const iv = document.getElementById('chkManualIncenseVis') as HTMLInputElement | null;
    if (anchors.incenseBurner && ix && iy && is) {
      anchors.incenseBurner.x = Math.max(200, Math.min(880, Number(ix.value) || 540));
      anchors.incenseBurner.y = Math.max(600, Math.min(1000, Number(iy.value) || 845));
      anchors.incenseBurner.scale = Math.max(0.5, Math.min(2.0, Number(is.value) || 1.0));
      if (iv) anchors.incenseBurner.visible = iv.checked;
    }

    // Wooden Fish
    const fx = document.getElementById('inpManualFishX') as HTMLInputElement | null;
    const fy = document.getElementById('inpManualFishY') as HTMLInputElement | null;
    const fs = document.getElementById('inpManualFishScale') as HTMLInputElement | null;
    const fv = document.getElementById('chkManualFishVis') as HTMLInputElement | null;
    if (anchors.woodenFish && fx && fy && fs) {
      anchors.woodenFish.x = Math.max(50, Math.min(450, Number(fx.value) || 210));
      anchors.woodenFish.y = Math.max(650, Math.min(1200, Number(fy.value) || 855));
      anchors.woodenFish.scale = Math.max(0.5, Math.min(2.0, Number(fs.value) || 1.0));
      if (fv) anchors.woodenFish.visible = fv.checked;
    }

    // Temple Bell
    const lx = document.getElementById('inpManualBellX') as HTMLInputElement | null;
    const ly = document.getElementById('inpManualBellY') as HTMLInputElement | null;
    const ls = document.getElementById('inpManualBellScale') as HTMLInputElement | null;
    const lv = document.getElementById('chkManualBellVis') as HTMLInputElement | null;
    if (anchors.templeBell && lx && ly && ls) {
      anchors.templeBell.x = Math.max(630, Math.min(1030, Number(lx.value) || 870));
      anchors.templeBell.y = Math.max(600, Math.min(1200, Number(ly.value) || 720));
      anchors.templeBell.scale = Math.max(0.5, Math.min(2.0, Number(ls.value) || 1.0));
      if (lv) anchors.templeBell.visible = lv.checked;
    }

    // Central Ceremony Guardrail
    const cer = anchors.ceremony;
    const spX = document.getElementById('inpCeremonySpawnX') as HTMLInputElement | null;
    const spY = document.getElementById('inpCeremonySpawnY') as HTMLInputElement | null;
    const knX = document.getElementById('inpCeremonyKneelX') as HTMLInputElement | null;
    const knY = document.getElementById('inpCeremonyKneelY') as HTMLInputElement | null;
    const exX = document.getElementById('inpCeremonyExitX') as HTMLInputElement | null;
    const exY = document.getElementById('inpCeremonyExitY') as HTMLInputElement | null;
    const cv = document.getElementById('chkCeremonyVis') as HTMLInputElement | null;

    if (cer && spX && spY && knX && knY && exX && exY) {
      cer.spawnX = Number(spX.value);
      cer.spawnY = Number(spY.value);
      cer.kneelX = Math.max(300, Math.min(780, Number(knX.value)));
      // Strict guardrail check: Y >= 960!
      cer.kneelY = Math.max(960, Math.min(1400, Number(knY.value)));
      cer.exitX = Number(exX.value);
      cer.exitY = Number(exY.value);
      if (cv) cer.visible = cv.checked;
    }

    // Congregation Perspective
    const cong = anchors.congregation;
    const yT = document.getElementById('inpCongYTop') as HTMLInputElement | null;
    const hT = document.getElementById('inpCongHalfTop') as HTMLInputElement | null;
    const yB = document.getElementById('inpCongYBottom') as HTMLInputElement | null;
    const hB = document.getElementById('inpCongHalfBottom') as HTMLInputElement | null;
    const gv = document.getElementById('chkCongregationVis') as HTMLInputElement | null;

    if (cong && yT && hT && yB && hB) {
      // Strict guardrail check: Y Top >= 1100!
      cong.yTop = Math.max(1100, Number(yT.value));
      cong.halfTop = Number(hT.value);
      cong.yBottom = Number(yB.value);
      cong.halfBottom = Number(hB.value);
      if (gv) cong.visible = gv.checked;
    }

    renderSceneEditorCanvas();
    void applyActiveSceneToLive();
  });

  // 8. Tab 4: Scene Assets Uploader
  const btnUploadAsset = document.getElementById('btnUploadSceneAsset');
  const inpAssetFile = document.getElementById('inpSceneAssetFile') as HTMLInputElement | null;
  const inpAssetName = document.getElementById('inpSceneAssetName') as HTMLInputElement | null;
  const selAssetTarget = document.getElementById('selSceneAssetLayerTarget') as HTMLSelectElement | null;
  const uploadStatus = document.getElementById('sceneAssetUploadStatus');

  if (btnUploadAsset && inpAssetFile) {
    btnUploadAsset.onclick = async () => {
      const file = inpAssetFile.files?.[0];
      if (!file) {
        showToast('Vui lòng chọn tệp ảnh hoặc video');
        return;
      }
      try {
        btnUploadAsset.textContent = '⏳ Đang tải lên...';
        btnUploadAsset.setAttribute('disabled', 'true');
        if (uploadStatus) uploadStatus.textContent = `Đang gửi ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`;

        const res = await fetch('/api/admin/scene/upload', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'image/png',
            'X-Admin-Token': currentAdminToken,
            'X-File-Name': encodeURIComponent(file.name),
            'X-Asset-Name': encodeURIComponent(inpAssetName?.value || file.name),
            'X-Layer-Target': selAssetTarget?.value || 'background'
          },
          body: file
        });
        if (res.status === 401) {
          openLoginModal('Vui lòng đăng nhập lại để tải lên tư liệu cảnh.');
          throw new Error('Chưa xác thực Admin');
        }
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

        showToast(`Tải lên thành công: ${data.asset.name}`);
        if (uploadStatus) uploadStatus.textContent = '✓ Tải lên hoàn tất';
        if (inpAssetName) inpAssetName.value = '';
        inpAssetFile.value = '';
        void loadSceneAssets();
      } catch (e: any) {
        showToast(`Lỗi upload: ${e.message}`);
        if (uploadStatus) uploadStatus.textContent = `✗ Lỗi: ${e.message}`;
      } finally {
        btnUploadAsset.textContent = '📤 Tải Lên Tư Liệu';
        btnUploadAsset.removeAttribute('disabled');
      }
    };
  }

  document.getElementById('btnRefreshSceneAssets')?.addEventListener('click', () => {
    void loadSceneAssets();
  });

  selectAnchor('buddhaStatue');
  renderSceneEditorCanvas();
  renderLayerStackTable();
  void loadSceneAssets();
  void loadScenePresets();
}

// ======================================================================
// FORTUNE ORACLE & VIETNAMESE TTS CONTROL CENTER
// ======================================================================
let currentFortuneDeck: FortuneStick[] = [];
let localFortuneExecutions: FortuneExecutionRecord[] = [];
let editingFortuneStick: FortuneStick | null = null;

function renderFortuneExecutions(executions: FortuneExecutionRecord[]): void {
  localFortuneExecutions = [...executions];
  const tbody = document.getElementById('tblFortuneLogBody');
  if (!tbody) return;

  if (executions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:12px; text-align:center; color:var(--muted);">Chưa có lượt xin quẻ nào trong phiên này</td></tr>`;
    return;
  }

  tbody.innerHTML = executions
    .map((item) => {
      const timeStr = new Date(item.timestamp).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      let badgeHtml = '';
      switch (item.status) {
        case 'ENQUEUED':
          badgeHtml = '<span style="background:rgba(229,184,91,0.25); color:#ffd700; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px;">⏳ Đang chờ</span>';
          break;
        case 'PLAYING':
          badgeHtml = '<span style="background:rgba(80,200,120,0.3); color:#55ff88; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px;">▶ Đang đọc</span>';
          break;
        case 'COMPLETED':
          badgeHtml = '<span style="background:rgba(40,160,80,0.25); color:#88ffaa; padding:2px 6px; border-radius:4px; font-size:11px;">✓ Đã đọc xong</span>';
          break;
        case 'SKIPPED':
          badgeHtml = `<span style="background:rgba(128,128,128,0.25); color:#aaa; padding:2px 6px; border-radius:4px; font-size:11px;" title="${escapeHtml(item.reason || '')}">⊘ Bỏ qua</span>`;
          break;
        case 'FAILED':
          badgeHtml = `<span style="background:rgba(220,50,50,0.25); color:#ff6666; padding:2px 6px; border-radius:4px; font-size:11px;" title="${escapeHtml(item.reason || '')}">✗ Lỗi</span>`;
          break;
      }

      const fortDesc = item.fortune ? `Số ${item.fortune.number} · ${escapeHtml(item.fortune.rank)}` : '(Không có)';
      const textPreview = item.ttsText
        ? `"${escapeHtml(item.ttsText)}"`
        : `<span style="color:var(--muted); font-style:italic;">${escapeHtml(item.reason || 'Không tạo TTS')}</span>`;

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:6px 8px; color:var(--muted);">${timeStr}</td>
          <td style="padding:6px 8px; font-weight:600; color:var(--text);">${escapeHtml(item.user.nickname || 'Phật tử')}</td>
          <td style="padding:6px 8px; color:var(--gold-bright);">${fortDesc}</td>
          <td style="padding:6px 8px; line-height:1.3; font-size:11px;">${textPreview}</td>
          <td style="padding:6px 8px;">${badgeHtml}</td>
        </tr>
      `;
    })
    .join('');
}

function upsertFortuneExecution(record: FortuneExecutionRecord): void {
  const idx = localFortuneExecutions.findIndex((e) => e.id === record.id || (e.traceId && e.traceId === record.traceId));
  if (idx >= 0) {
    localFortuneExecutions[idx] = { ...localFortuneExecutions[idx], ...record };
  } else {
    localFortuneExecutions.unshift(record);
    if (localFortuneExecutions.length > 30) localFortuneExecutions.length = 30;
  }
  renderFortuneExecutions(localFortuneExecutions);
}

async function loadFortuneDeck(): Promise<void> {
  try {
    const res = await callAdminApi('/api/admin/fortunes', {});
    if (Array.isArray(res.deck)) {
      currentFortuneDeck = res.deck;
      renderFortuneDeckTable();
      const lblCount = document.getElementById('lblFortuneDeckCount');
      if (lblCount) lblCount.textContent = `(${currentFortuneDeck.length} quẻ)`;
    }
  } catch {
    // ignore
  }
}

function renderFortuneDeckTable(): void {
  const tbody = document.getElementById('tblFortuneDeckBody');
  if (!tbody) return;

  const search = (document.getElementById('txtSearchFortuneDeck') as HTMLInputElement | null)?.value.trim().toLowerCase() || '';

  const filtered = currentFortuneDeck.filter((stick) => {
    if (!search) return true;
    return (
      String(stick.number).includes(search) ||
      stick.title.toLowerCase().includes(search) ||
      stick.rank.toLowerCase().includes(search) ||
      stick.meaning.toLowerCase().includes(search)
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:16px; text-align:center; color:var(--muted);">Không tìm thấy quẻ xăm phù hợp</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((stick) => {
      const poemEscaped = escapeHtml(stick.poem).replace(/\n/g, '<br/>');
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:6px 8px; font-weight:bold; color:var(--gold-bright); text-align:center;">${stick.number}</td>
          <td style="padding:6px 8px;"><span style="color:#f6c86a; background:rgba(246,200,106,0.12); padding:2px 5px; border-radius:4px; font-size:11px;">${escapeHtml(stick.rank)}</span></td>
          <td style="padding:6px 8px; font-weight:600; color:var(--text);">${escapeHtml(stick.title)}</td>
          <td style="padding:6px 8px; line-height:1.35; font-size:11px;">
            <div style="font-family:serif; color:#ffddaa; margin-bottom:3px;">${poemEscaped}</div>
            <div style="color:var(--muted);"><b>Ý nghĩa:</b> ${escapeHtml(stick.meaning)}</div>
          </td>
          <td style="padding:6px 8px; text-align:center;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <button type="button" class="btn-edit-fortune" data-stick-num="${stick.number}" style="font-size:11px; padding:2px 6px;">✏ Sửa</button>
              <button type="button" class="btn-test-single-fortune gold" data-stick-num="${stick.number}" style="font-size:11px; padding:2px 6px;">🔊 Thử Đọc</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll<HTMLButtonElement>('.btn-edit-fortune').forEach((btn) => {
    btn.onclick = () => {
      const num = Number(btn.getAttribute('data-stick-num'));
      const stick = currentFortuneDeck.find((s) => s.number === num);
      if (stick) openEditFortuneModal(stick);
    };
  });

  tbody.querySelectorAll<HTMLButtonElement>('.btn-test-single-fortune').forEach((btn) => {
    btn.onclick = async () => {
      const num = Number(btn.getAttribute('data-stick-num'));
      try {
        await callAdminApi('/api/admin/fortunes/test', { fortuneId: num });
        showToast(`Đã phát thử quẻ số ${num}`);
      } catch (e: any) {
        showToast(`Lỗi: ${e.message}`);
      }
    };
  });
}

function openEditFortuneModal(stick: FortuneStick): void {
  editingFortuneStick = stick;
  const modal = document.getElementById('modalEditFortune');
  const inpNum = document.getElementById('editFortuneNumber') as HTMLInputElement | null;
  const inpRank = document.getElementById('editFortuneRank') as HTMLInputElement | null;
  const inpTitle = document.getElementById('editFortuneTitle') as HTMLInputElement | null;
  const inpPoem = document.getElementById('editFortunePoem') as HTMLTextAreaElement | null;
  const inpMeaning = document.getElementById('editFortuneMeaning') as HTMLTextAreaElement | null;
  const inpTts = document.getElementById('editFortuneTts') as HTMLTextAreaElement | null;

  if (inpNum) inpNum.value = String(stick.number);
  if (inpRank) inpRank.value = stick.rank;
  if (inpTitle) inpTitle.value = stick.title;
  if (inpPoem) inpPoem.value = stick.poem;
  if (inpMeaning) inpMeaning.value = stick.meaning;
  if (inpTts) inpTts.value = stick.ttsSummary || '';

  modal?.classList.add('active');
}

function initFortuneOracleControl(): void {
  const chkOracle = document.getElementById('chkFortuneOracleEnabled') as HTMLInputElement | null;
  const chkSync = document.getElementById('chkReadFortunesSync') as HTMLInputElement | null;
  const selMode = document.getElementById('selFortuneReadMode') as HTMLSelectElement | null;
  const txtCooldown = document.getElementById('txtFortuneCooldownSec') as HTMLInputElement | null;
  const selVoice = document.getElementById('selFortuneVoice') as HTMLSelectElement | null;
  const rngRate = document.getElementById('rngFortuneRate') as HTMLInputElement | null;
  const lblRate = document.getElementById('lblFortuneRate');
  const rngVol = document.getElementById('rngFortuneVolume') as HTMLInputElement | null;
  const lblVol = document.getElementById('lblFortuneVolume');
  const btnSave = document.getElementById('btnSaveFortuneConfig');

  if (rngRate && lblRate) {
    rngRate.oninput = () => {
      lblRate.textContent = `${rngRate.value}%`;
    };
  }

  if (rngVol && lblVol) {
    rngVol.oninput = () => {
      lblVol.textContent = `${Math.round(Number(rngVol.value) * 100)}%`;
    };
  }

  // Two-way sync with primary settings checkboxes
  if (chkOracle) {
    chkOracle.onchange = () => {
      const primary = document.getElementById('chkFortune') as HTMLInputElement | null;
      if (primary) primary.checked = chkOracle.checked;
    };
  }
  if (chkSync) {
    chkSync.onchange = () => {
      const primary = document.getElementById('chkReadFortunes') as HTMLInputElement | null;
      if (primary) primary.checked = chkSync.checked;
    };
  }

  if (btnSave) {
    btnSave.onclick = async () => {
      try {
        const payload: Record<string, any> = {
          fortuneEnabled: chkOracle ? chkOracle.checked : true,
          ttsReadFortunes: chkSync ? chkSync.checked : true,
          fortuneReadMode: selMode ? selMode.value : 'summary',
          fortuneUserCooldownSec: txtCooldown ? Number(txtCooldown.value) || 15 : 15,
          fortuneVoice: selVoice && selVoice.value !== 'default' ? selVoice.value : undefined,
          fortuneRatePercent: rngRate ? Number(rngRate.value) : -10,
          fortuneVolume: rngVol ? Number(rngVol.value) : 0.95
        };
        const res = await callAdminApi('/api/admin/settings', payload);
        renderSnapshot(res.snapshot);
        showToast('✓ Đã lưu cấu hình Quẻ Xăm Văn Hóa & TTS');
      } catch (e: any) {
        showToast(`Lỗi lưu: ${e.message}`);
      }
    };
  }

  document.getElementById('btnTestFortuneDraw')?.addEventListener('click', async () => {
    try {
      const mode = selMode ? selMode.value : 'summary';
      const res = await callAdminApi('/api/admin/fortunes/test', { mode });
      if (res.snapshot) renderSnapshot(res.snapshot);
      showToast('🎋 Đã phát lệnh thử rút quẻ & gửi đọc TTS');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  });

  document.getElementById('btnReplayFortune')?.addEventListener('click', async () => {
    try {
      const res = await callAdminApi('/api/admin/fortunes/replay', {});
      if (res.snapshot) renderSnapshot(res.snapshot);
      showToast('🔁 Đang đọc lại quẻ gần nhất');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  });

  document.getElementById('btnStopFortuneAudio')?.addEventListener('click', async () => {
    try {
      await callAdminApi('/api/admin/fortunes/stop', {});
      showToast('⏹ Đã dừng âm thanh đọc quẻ');
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  });

  document.getElementById('btnRefreshFortuneLog')?.addEventListener('click', async () => {
    try {
      const res = await callAdminApi('/api/admin/fortunes/history', {});
      if (Array.isArray(res.executions)) {
        renderFortuneExecutions(res.executions);
        showToast('✓ Đã làm mới nhật ký rút quẻ');
      }
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    }
  });

  const txtSearch = document.getElementById('txtSearchFortuneDeck') as HTMLInputElement | null;
  if (txtSearch) {
    txtSearch.oninput = () => {
      renderFortuneDeckTable();
    };
  }

  document.getElementById('btnSaveDeckLibrary')?.addEventListener('click', async () => {
    try {
      const res = await callAdminApi('/api/admin/fortunes', { deck: currentFortuneDeck });
      if (res.snapshot) renderSnapshot(res.snapshot);
      showToast(`✓ Đã lưu ${currentFortuneDeck.length} quẻ xăm vào cơ sở dữ liệu`);
    } catch (e: any) {
      showToast(`Lỗi lưu thư viện: ${e.message}`);
    }
  });

  // Modal handlers
  document.getElementById('btnCancelEditFortune')?.addEventListener('click', () => {
    document.getElementById('modalEditFortune')?.classList.remove('active');
    editingFortuneStick = null;
  });

  document.getElementById('btnSaveSingleFortune')?.addEventListener('click', async () => {
    if (!editingFortuneStick) return;
    const inpRank = document.getElementById('editFortuneRank') as HTMLInputElement | null;
    const inpTitle = document.getElementById('editFortuneTitle') as HTMLInputElement | null;
    const inpPoem = document.getElementById('editFortunePoem') as HTMLTextAreaElement | null;
    const inpMeaning = document.getElementById('editFortuneMeaning') as HTMLTextAreaElement | null;
    const inpTts = document.getElementById('editFortuneTts') as HTMLTextAreaElement | null;

    editingFortuneStick.rank = inpRank?.value || editingFortuneStick.rank;
    editingFortuneStick.title = inpTitle?.value || editingFortuneStick.title;
    editingFortuneStick.poem = inpPoem?.value || editingFortuneStick.poem;
    editingFortuneStick.meaning = inpMeaning?.value || editingFortuneStick.meaning;
    editingFortuneStick.ttsSummary = inpTts?.value || editingFortuneStick.ttsSummary;

    try {
      const res = await callAdminApi('/api/admin/fortunes', { deck: currentFortuneDeck });
      if (res.snapshot) renderSnapshot(res.snapshot);
      renderFortuneDeckTable();
      document.getElementById('modalEditFortune')?.classList.remove('active');
      showToast(`✓ Đã lưu thay đổi cho quẻ số ${editingFortuneStick.number}`);
      editingFortuneStick = null;
    } catch (e: any) {
      showToast(`Lỗi lưu: ${e.message}`);
    }
  });
}

function initFirstRunWizard(): void {
  const modal = document.getElementById('modalFirstRunWizard');
  if (!modal) return;

  const step1 = document.getElementById('wizardStep1')!;
  const step2 = document.getElementById('wizardStep2')!;
  const step3 = document.getElementById('wizardStep3')!;
  const step4 = document.getElementById('wizardStep4')!;
  const stepIndicator = document.getElementById('wizardStepIndicator')!;
  const progressText = document.getElementById('wizardProgressText')!;
  const btnPrev = document.getElementById('btnWizardPrev') as HTMLButtonElement;
  const btnNext = document.getElementById('btnWizardNext') as HTMLButtonElement;
  const btnSkip = document.getElementById('btnWizardSkip') as HTMLButtonElement;
  const btnTestVoice = document.getElementById('btnWizardTestVoice') as HTMLButtonElement;
  const btnCopyOverlay = document.getElementById('btnWizardCopyOverlay') as HTMLButtonElement;
  const overlayUrlText = document.getElementById('wizardOverlayUrlText')!;

  const inputPassword = document.getElementById('inputWizardPassword') as HTMLInputElement;
  const inputTiktok = document.getElementById('inputWizardTiktokUser') as HTMLInputElement;

  if (overlayUrlText) {
    overlayUrlText.textContent = `${window.location.origin}/overlay`;
  }

  let currentStep = 1;

  function updateStepUi(): void {
    step1.style.display = currentStep === 1 ? 'block' : 'none';
    step2.style.display = currentStep === 2 ? 'block' : 'none';
    step3.style.display = currentStep === 3 ? 'block' : 'none';
    step4.style.display = currentStep === 4 ? 'block' : 'none';

    btnPrev.style.visibility = currentStep > 1 ? 'visible' : 'hidden';

    if (currentStep === 1) {
      stepIndicator.textContent = 'Bước 1 / 4: Đặt Mật Khẩu Quản Trị';
      progressText.textContent = 'Bảo mật';
      btnNext.textContent = 'Tiếp theo ➡';
    } else if (currentStep === 2) {
      stepIndicator.textContent = 'Bước 2 / 4: Kênh TikTok LIVE';
      progressText.textContent = 'Kết nối';
      btnNext.textContent = 'Tiếp theo ➡';
    } else if (currentStep === 3) {
      stepIndicator.textContent = 'Bước 3 / 4: Giọng Đọc Tiếng Việt';
      progressText.textContent = 'Âm thanh';
      btnNext.textContent = 'Tiếp theo ➡';
    } else if (currentStep === 4) {
      stepIndicator.textContent = 'Bước 4 / 4: Nguồn OBS & Sẵn Sàng';
      progressText.textContent = 'Hoàn tất';
      btnNext.textContent = '🚀 Hoàn Tất Cài Đặt';
    }
  }

  btnPrev?.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepUi();
    }
  });

  btnNext?.addEventListener('click', async () => {
    if (currentStep === 1) {
      const pwd = inputPassword?.value.trim() || '';
      if (pwd.length > 0 && pwd.length < 4) {
        showToast('Mật khẩu nên có ít nhất 4 ký tự hoặc để trống.');
        return;
      }
      currentStep = 2;
      updateStepUi();
    } else if (currentStep === 2) {
      currentStep = 3;
      updateStepUi();
    } else if (currentStep === 3) {
      currentStep = 4;
      updateStepUi();
    } else if (currentStep === 4) {
      const selectedVoiceEl = document.querySelector('input[name="wizardVoiceRadio"]:checked') as HTMLInputElement | null;
      const selectedVoice = selectedVoiceEl?.value || 'vi-VN-HoaiMyNeural';
      try {
        await callAdminApi('/api/admin/setup/complete', {
          password: inputPassword?.value.trim() || undefined,
          tiktokUsername: inputTiktok?.value.trim() || undefined,
          voice: selectedVoice
        });
        modal.classList.remove('active');
        showToast('🎉 Thiết lập ban đầu thành công! Chúc buổi livestream an lạc.');
      } catch (err: any) {
        showToast(`Lỗi lưu thiết lập: ${err?.message}`);
      }
    }
  });

  btnSkip?.addEventListener('click', async () => {
    try {
      await callAdminApi('/api/admin/setup/complete', {});
      modal.classList.remove('active');
      showToast('Đã bỏ qua thiết lập ban đầu.');
    } catch {
      modal.classList.remove('active');
    }
  });

  btnCopyOverlay?.addEventListener('click', () => {
    const url = `${window.location.origin}/overlay`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('✓ Đã sao chép đường dẫn Overlay cho OBS!');
    }).catch(() => {
      showToast(url);
    });
  });

  btnTestVoice?.addEventListener('click', async () => {
    const selectedVoiceEl = document.querySelector('input[name="wizardVoiceRadio"]:checked') as HTMLInputElement | null;
    const voice = selectedVoiceEl?.value || 'vi-VN-HoaiMyNeural';
    btnTestVoice.disabled = true;
    btnTestVoice.textContent = '⏳ Đang đọc...';
    try {
      const res = await callAdminApi('/api/admin/tts/preview', {
        text: 'Nam mô A Di Đà Phật, kính chúc quý đạo hữu thân tâm thường an lạc, vạn sự cát tường.',
        voice
      });
      if (res.audioUrl) {
        const audio = new Audio(res.audioUrl);
        await audio.play();
        showToast('🔊 Đang phát giọng đọc mẫu tiếng Việt');
      }
    } catch (e: any) {
      showToast(`Lỗi phát giọng: ${e.message}`);
    } finally {
      btnTestVoice.disabled = false;
      btnTestVoice.textContent = '🔊 Nghe Thử Giọng Đọc Mẫu';
    }
  });

  // Check setup status on load
  void (async () => {
    try {
      const statusRes = await fetch('/api/auth/status', {
        headers: currentAdminToken ? { 'X-Admin-Token': currentAdminToken } : {}
      });
      const status = await statusRes.json();
      if (status && status.isFirstRun) {
        currentStep = 1;
        updateStepUi();
        modal.classList.add('active');
      }
    } catch {
      // ignore
    }
  })();
}

async function performAdminLogin(): Promise<void> {
  if (!inputAdminLoginPassword || !btnAdminLoginSubmit) return;
  const password = inputAdminLoginPassword.value.trim();
  if (!password) {
    if (loginAlertBox) {
      loginAlertBox.textContent = 'Vui lòng nhập mật khẩu quản trị.';
      loginAlertBox.style.display = 'block';
    }
    return;
  }

  btnAdminLoginSubmit.disabled = true;
  btnAdminLoginSubmit.textContent = 'Đang xác thực...';
  if (loginAlertBox) loginAlertBox.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Mật khẩu quản trị không đúng');
    }

    setAdminToken(data.token);
    closeLoginModal();
    showToast('✓ Đăng nhập quản trị thành công!');
    initApp();
  } catch (err: any) {
    if (loginAlertBox) {
      loginAlertBox.textContent = err.message || 'Lỗi đăng nhập';
      loginAlertBox.style.display = 'block';
    }
  } finally {
    btnAdminLoginSubmit.disabled = false;
    btnAdminLoginSubmit.textContent = 'Đăng Nhập Quản Trị ➔';
  }
}

btnAdminLoginSubmit?.addEventListener('click', () => void performAdminLogin());
inputAdminLoginPassword?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    void performAdminLogin();
  }
});

btnLogoutAdmin?.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  setAdminToken('');
  showToast('Đã đăng xuất.');
  openLoginModal('Bạn đã đăng xuất khỏi Bảng Điều Khiển.');
});

let isAppInitialized = false;
function initApp(): void {
  if (isAppInitialized) return;
  isAppInitialized = true;
  connectAdminWs();
  void loadAudioTracks();
  void loadPlaylists();
  initSceneStudio();
  initFortuneOracleControl();
  void loadFortuneDeck();
}

async function checkAuthAndInit(): Promise<void> {
  try {
    const res = await fetch('/api/auth/status', {
      headers: currentAdminToken ? { 'X-Admin-Token': currentAdminToken } : {}
    });
    const data = await res.json();
    if (data.authenticated) {
      initApp();
      if (data.isFirstRun) {
        initFirstRunWizard();
      }
    } else if (!data.hasPassword) {
      initFirstRunWizard();
      initApp();
    } else {
      openLoginModal();
    }
  } catch {
    initApp();
  }
}

void checkAuthAndInit();
