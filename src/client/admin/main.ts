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

    rngMasterVol.value = String(snap.settings.audioMasterVolume);
    rngMusicVol.value = String(snap.settings.audioMusicVolume);
    rngSfxVol.value = String(snap.settings.audioSfxVolume);
    rngTtsVol.value = String(snap.settings.audioTtsVolume);
    lblMasterVol.textContent = `${Math.round(snap.settings.audioMasterVolume * 100)}%`;
    lblMusicVol.textContent = `${Math.round(snap.settings.audioMusicVolume * 100)}%`;
    lblSfxVol.textContent = `${Math.round(snap.settings.audioSfxVolume * 100)}%`;
    lblTtsVol.textContent = `${Math.round(snap.settings.audioTtsVolume * 100)}%`;
    selTtsVoice.value = snap.settings.ttsVoice;
    inpMoBpm.value = String(snap.settings.woodenFishBpm);
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

rngMasterVol.oninput = () => {
  lblMasterVol.textContent = `${Math.round(Number(rngMasterVol.value) * 100)}%`;
};
rngMusicVol.oninput = () => {
  lblMusicVol.textContent = `${Math.round(Number(rngMusicVol.value) * 100)}%`;
};
rngSfxVol.oninput = () => {
  lblSfxVol.textContent = `${Math.round(Number(rngSfxVol.value) * 100)}%`;
};
rngTtsVol.oninput = () => {
  lblTtsVol.textContent = `${Math.round(Number(rngTtsVol.value) * 100)}%`;
};

document.getElementById('btnSaveAudioSettings')!.onclick = async () => {
  try {
    const res = await callAdminApi('/api/admin/settings', {
      audioMasterVolume: Number(rngMasterVol.value),
      audioMusicVolume: Number(rngMusicVol.value),
      audioSfxVolume: Number(rngSfxVol.value),
      audioTtsVolume: Number(rngTtsVol.value),
      ttsVoice: selTtsVoice.value,
      woodenFishBpm: Number(inpMoBpm.value)
    });
    renderSnapshot(res.snapshot);
    showToast('Đã lưu cấu hình Âm thanh & Giọng đọc');
  } catch (e: any) {
    showToast(`Lỗi: ${e.message}`);
  }
};

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
