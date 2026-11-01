import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/noto-serif/700.css';
import type {
  CommunityGoalState,
  DispatchedRitual,
  LivePollState,
  QualityPreset,
  SeatedViewer,
  ServerToClientWsMessage,
  TempleStateSnapshot
} from '../../shared/types.ts';
import { TempleAudioEngine } from './audio/TempleAudioEngine.ts';
import { TempleSceneEngine } from './scene/TempleSceneEngine.ts';

const urlParams = new URLSearchParams(window.location.search);
const isObsMode = urlParams.get('obs') === '1';
const isTransparent = urlParams.get('transparent') === '1';
const hudMode = urlParams.get('hud') || 'full';
const overrideQuality = urlParams.get('quality') as QualityPreset | null;
const overrideFps = urlParams.get('fps');

if (isObsMode) document.body.classList.add('obs-mode');
if (isTransparent) document.body.classList.add('transparent-mode');
if (hudMode === 'minimal') document.body.classList.add('hud-minimal');
if (hudMode === 'none') document.body.classList.add('hud-none');

// 1. Responsive 1080x1920 stage scaling
const stageEl = document.getElementById('stage9x16') as HTMLElement;
function fitStageToViewport(): void {
  const scale = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  stageEl.style.transform = `scale(${scale.toFixed(4)})`;
}
window.addEventListener('resize', fitStageToViewport);
fitStageToViewport();

// 2. Initialize 2.5D Scene Engine & Web Audio Synthesizer
const canvas = document.getElementById('templeCanvas') as HTMLCanvasElement;
const scene = new TempleSceneEngine(canvas, { transparent: isTransparent });
const audio = new TempleAudioEngine();

const isMutedMode =
  urlParams.get('muted') === '1' ||
  urlParams.get('audio') === '0' ||
  urlParams.get('preview') === '1';

const btnEnableAudio = document.getElementById('btnEnableAudio') as HTMLButtonElement | null;
function unlockAudioHandler(): void {
  if (isMutedMode) return;
  if (audio.unlock() && btnEnableAudio) {
    btnEnableAudio.remove();
  }
}

if (isMutedMode) {
  audio.setMuted(true);
  if (btnEnableAudio) btnEnableAudio.remove();
} else {
  if (btnEnableAudio) {
    btnEnableAudio.addEventListener('click', unlockAudioHandler);
  }
  window.addEventListener('pointerdown', unlockAudioHandler, { once: true });
  if (isObsMode) {
    setTimeout(unlockAudioHandler, 400);
  }
}

// 3. HUD DOM Update Helpers (Strict textContent usage — zero XSS risk)
const plaqueTitleEl = document.getElementById('plaqueTitle')!;
const plaqueSubtitleEl = document.getElementById('plaqueSubtitle')!;
const pillSeatedEl = document.getElementById('pillSeated')!;
const pillIncenseEl = document.getElementById('pillIncense')!;
const pillBellEl = document.getElementById('pillBell')!;
const pillLanternsEl = document.getElementById('pillLanterns')!;
const pillTimerEl = document.getElementById('pillTimer')!;
const pillLunarEl = document.getElementById('pillLunar')!;
const pillLunarIconEl = document.getElementById('pillLunarIcon')!;
const prayerTickerTextEl = document.getElementById('prayerTickerText')!;
const goalProgressTextEl = document.getElementById('goalProgressText')!;
const goalBarFillEl = document.getElementById('goalBarFill')!;
const pollQuestionEl = document.getElementById('pollQuestion')!;
const pollOptionsListEl = document.getElementById('pollOptionsList')!;
const leaderboardListEl = document.getElementById('leaderboardList')!;
const recentFeedEl = document.getElementById('recentFeed')!;
const ceremonyModalEl = document.getElementById('ceremonyModal')!;
const modalBadgeEl = document.getElementById('modalBadge')!;
const modalHeadlineEl = document.getElementById('modalHeadline')!;
const modalBodyEl = document.getElementById('modalBody')!;
const modalSubnoteEl = document.getElementById('modalSubnote')!;
const ethicsTextEl = document.getElementById('ethicsText')!;
const perfIndicatorEl = document.getElementById('perfIndicator')!;

let serverStartedAt = Date.now();
let modalHideTimer: ReturnType<typeof setTimeout> | null = null;

function applyFullSnapshot(snap: TempleStateSnapshot): void {
  serverStartedAt = snap.startedAt;
  const effectiveSettings = { ...snap.settings };
  if (overrideQuality && ['low', 'medium', 'high'].includes(overrideQuality)) {
    effectiveSettings.qualityPreset = overrideQuality;
  }
  if (overrideFps === '30' || overrideFps === '60') {
    effectiveSettings.targetFps = Number(overrideFps) as 30 | 60;
  }

  plaqueTitleEl.textContent = effectiveSettings.title;
  plaqueSubtitleEl.textContent = effectiveSettings.subtitle;
  ethicsTextEl.textContent = effectiveSettings.ethicsNotice;

  pillSeatedEl.textContent = `${snap.seatedViewers.length}/${snap.seatCapacity}`;
  pillIncenseEl.textContent = String(snap.totals.incenseBurned);
  pillBellEl.textContent = String(snap.totals.bellRings);
  pillLanternsEl.textContent = String(snap.totals.lanternsReleased);

  if (snap.lunarInfo) {
    if (snap.lunarInfo.festivalTitle) {
      pillLunarIconEl.textContent = '🏮';
      pillLunarEl.textContent = snap.lunarInfo.festivalTitle;
    } else {
      pillLunarIconEl.textContent = '🌙';
      pillLunarEl.textContent = snap.lunarInfo.lunarDateStr;
    }
  }

  if (snap.prayers && snap.prayers.length > 0) {
    const latest = snap.prayers[0];
    prayerTickerTextEl.textContent = `${latest.nickname} [${latest.category}]: “${latest.wishText}”`;
  }

  renderGoal(snap.communityGoal);
  renderPoll(snap.poll);
  renderLeaderboard(snap.leaderboard);
  renderRecentRituals(snap.recentRituals);

  scene.syncFromSnapshot(
    snap.seatedViewers,
    snap.lanterns,
    effectiveSettings,
    snap.totals.incenseBurned
  );
  audio.applySettings(effectiveSettings);
}

function renderGoal(goal: CommunityGoalState): void {
  goalProgressTextEl.textContent = `${goal.currentValue}/${goal.targetValue}`;
  const pct = Math.max(4, Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100)));
  goalBarFillEl.style.width = `${pct}%`;
}

function renderPoll(poll: LivePollState): void {
  pollQuestionEl.textContent = poll.question;
  pollOptionsListEl.replaceChildren();
  const total = Math.max(1, poll.totalVotes);

  for (const opt of poll.options) {
    const pct = Math.round((opt.votes / total) * 100);
    const wrap = document.createElement('div');
    wrap.className = 'poll-option';

    const row = document.createElement('div');
    row.className = 'poll-option-row';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = opt.label;
    const pctSpan = document.createElement('span');
    pctSpan.textContent = `${pct}% (${opt.votes})`;
    row.append(labelSpan, pctSpan);

    const barBg = document.createElement('div');
    barBg.className = 'poll-option-bar';
    const barFill = document.createElement('div');
    barFill.className = 'poll-option-fill';
    barFill.style.width = `${pct}%`;
    barBg.appendChild(barFill);

    wrap.append(row, barBg);
    pollOptionsListEl.appendChild(wrap);
  }
}

function renderLeaderboard(leaders: SeatedViewer[]): void {
  leaderboardListEl.replaceChildren();
  const top6 = leaders.slice(0, 6);
  if (top6.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'lb-row';
    empty.textContent = 'Chưa có dữ liệu phiên này';
    leaderboardListEl.appendChild(empty);
    return;
  }

  top6.forEach((v, idx) => {
    const li = document.createElement('li');
    li.className = `lb-row ${idx === 0 ? 'top1' : ''}`;

    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = String(idx + 1);

    const name = document.createElement('span');
    name.className = 'lb-name';
    name.textContent = v.nickname;

    const score = document.createElement('span');
    score.className = 'lb-score';
    score.textContent = `${v.meritPoints}`;

    li.append(rank, name, score);
    leaderboardListEl.appendChild(li);
  });
}

function renderRecentRituals(rituals: DispatchedRitual[]): void {
  recentFeedEl.replaceChildren();
  for (const r of rituals.slice(0, 4)) {
    const div = document.createElement('div');
    div.className = 'feed-item';
    const b = document.createElement('b');
    b.textContent = r.user.nickname + ': ';
    const span = document.createElement('span');
    span.textContent = r.giftName ? `Dâng ${r.giftName}` : r.ruleName;
    div.append(b, span);
    recentFeedEl.appendChild(div);
  }
}

function showCeremonyBanner(ritual: DispatchedRitual): void {
  if (
    ritual.actionType !== 'OFFER_GIFT' &&
    ritual.actionType !== 'GRAND_CEREMONY' &&
    ritual.actionType !== 'DRAW_FORTUNE' &&
    ritual.actionType !== 'RELEASE_LANTERN' &&
    ritual.actionType !== 'PERIODIC_CHANT' &&
    ritual.actionType !== 'OFFER_FLOWERS'
  ) {
    return;
  }

  if (modalHideTimer) clearTimeout(modalHideTimer);

  if (ritual.actionType === 'DRAW_FORTUNE' && ritual.fortune) {
    modalBadgeEl.textContent = `🎋 QUẺ XĂM ĐẦU XUÂN · SỐ ${ritual.fortune.number} (${ritual.fortune.rank})`;
    modalHeadlineEl.textContent = `${ritual.user.nickname} · ${ritual.fortune.title}`;
    modalBodyEl.textContent = ritual.fortune.poem;
    modalSubnoteEl.textContent = `Lời bàn văn hóa: ${ritual.fortune.meaning} (Mang tính giải trí & suy ngẫm văn hóa)`;
  } else if (ritual.actionType === 'OFFER_FLOWERS') {
    modalBadgeEl.textContent = '🪷 DÂNG HOA SEN TƯƠI CÚNG PHẬT 🪷';
    modalHeadlineEl.textContent = `${ritual.user.nickname} dâng đóa sen thanh tịnh`;
    modalBodyEl.textContent = `“${ritual.wishText || 'Kính nguyện hoa sen nở rộ, lòng người an vui'}”`;
    modalSubnoteEl.textContent = `+${ritual.meritAwarded} Điểm Tinh Tấn · Cúng dường hoa sen tươi`;
  } else if (ritual.actionType === 'OFFER_GIFT' || ritual.actionType === 'GRAND_CEREMONY') {
    modalBadgeEl.textContent =
      ritual.actionType === 'GRAND_CEREMONY'
        ? '✦ ĐẠI LỄ HÀO QUANG KIM LIÊN ✦'
        : '🪷 DÂNG PHẨM VẬT TAM BẢO 🪷';
    modalHeadlineEl.textContent = `${ritual.user.nickname} dâng ${ritual.giftName || 'Lễ Vật'}`;
    modalBodyEl.textContent = `“${ritual.wishText || 'Nguyện cầu gia đạo bình an, vạn sự cát tường'}”`;
    modalSubnoteEl.textContent = `+${ritual.meritAwarded} Điểm Tinh Tấn (Điểm tương tác ảo trong phiên LIVE)`;
  } else if (ritual.actionType === 'RELEASE_LANTERN') {
    modalBadgeEl.textContent = '🪷 ĐÈN HOA ĐĂNG CẦU NGUYỆN 🪷';
    modalHeadlineEl.textContent = `Phật tử ${ritual.user.nickname}`;
    modalBodyEl.textContent = `“${ritual.wishText || 'Nguyện cầu bình an hạnh phúc'}”`;
    modalSubnoteEl.textContent = 'Hoa đăng đã được thả xuống Hồ Liên Hoa tiền cảnh';
  } else if (ritual.actionType === 'PERIODIC_CHANT') {
    modalBadgeEl.textContent = '🔔 TỤNG KINH & THỈNH CHUÔNG ĐỊNH KỲ 🔔';
    modalHeadlineEl.textContent = 'Chánh Điện Tịnh Tâm';
    modalBodyEl.textContent = ritual.wishText || '';
    modalSubnoteEl.textContent = '';
  }

  ceremonyModalEl.classList.add('visible');
  const durationMs =
    ritual.actionType === 'GRAND_CEREMONY' || ritual.actionType === 'DRAW_FORTUNE'
      ? 6800
      : 4800;
  modalHideTimer = setTimeout(() => {
    ceremonyModalEl.classList.remove('visible');
  }, durationMs);
}

// 4. Trigger synthesized temple audio on ritual events
function playRitualSfx(ritual: DispatchedRitual): void {
  if (isMutedMode) return;
  switch (ritual.actionType) {
    case 'GRAND_CEREMONY':
      audio.playTempleBell(1.3);
      setTimeout(() => audio.playIncenseChime(), 350);
      break;
    case 'OFFER_GIFT':
      if ((ritual.giftTier ?? 1) >= 3) {
        audio.playTempleBell(1.0);
      } else {
        audio.playIncenseChime();
      }
      break;
    case 'RING_BELL':
    case 'PERIODIC_CHANT':
      audio.playTempleBell(1.0);
      break;
    case 'DRAW_FORTUNE':
      audio.playFortuneShake();
      break;
    case 'BURN_INCENSE':
    case 'RELEASE_LANTERN':
    case 'OFFER_FLOWERS':
      audio.playIncenseChime();
      break;
    case 'STRIKE_WOODEN_FISH':
      audio.playWoodenFish(1.0);
      break;
  }
}

// 5. WebSocket Client with Auto-Reconnect & State Resync
let ws: WebSocket | null = null;
let wsReconnectAttempt = 0;
let myClientId: string | null = null;

audio.onPlaybackStarted = (traceId) => {
  if (ws && ws.readyState === WebSocket.OPEN && traceId) {
    ws.send(JSON.stringify({ type: 'tracePlaybackStart', traceId }));
  }
};

audio.onPlaybackFinished = (traceId) => {
  if (ws && ws.readyState === WebSocket.OPEN && traceId) {
    ws.send(JSON.stringify({ type: 'tracePlaybackEnd', traceId }));
  }
};

function connectWebSocket(): void {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = `role=overlay&muted=${isMutedMode ? '1' : '0'}`;
  ws = new WebSocket(`${proto}//${window.location.host}/ws?${query}`);

  ws.onopen = () => {
    wsReconnectAttempt = 0;
  };

  ws.onmessage = (ev) => {
    try {
      if (!isMutedMode && audio.getIsAudioLeader()) {
        audio.unlock(); // Ensure Web Audio unlocks on incoming server events for OBS
      }
      const msg = JSON.parse(String(ev.data)) as ServerToClientWsMessage;
      switch (msg.type) {
        case 'snapshot':
          applyFullSnapshot(msg.snapshot);
          if (msg.snapshot.audioLeaderClientId && myClientId) {
            audio.setAudioLeader(msg.snapshot.audioLeaderClientId === myClientId);
          }
          break;
        case 'audioLeaderUpdate':
          if (myClientId) {
            audio.setAudioLeader(msg.leaderClientId === myClientId);
          }
          break;
        case 'stopAudio':
          audio.stopCurrentAudio();
          break;
        case 'clearTtsQueue':
          audio.clearTtsQueue();
          break;
        case 'restartAudioEngine':
          audio.stopCurrentAudio();
          audio.clearTtsQueue();
          break;
        case 'prayer': {
          const p = msg.prayer;
          prayerTickerTextEl.textContent = `${p.nickname} [${p.category}]: “${p.wishText}”`;
          break;
        }
        case 'ritual':
          pillIncenseEl.textContent = String(msg.totals.incenseBurned);
          pillBellEl.textContent = String(msg.totals.bellRings);
          pillLanternsEl.textContent = String(msg.totals.lanternsReleased);
          renderGoal(msg.communityGoal);
          scene.triggerRitualVisuals(msg.ritual);
          showCeremonyBanner(msg.ritual);
          playRitualSfx(msg.ritual);
          break;
        case 'likeBatch':
          scene.triggerLikeBatchVisuals(msg.count);
          if (!isMutedMode && audio.getIsAudioLeader()) audio.playWoodenFish(1.02);
          break;
        case 'tts':
          if (!isMutedMode) audio.enqueueTts(msg.tts);
          break;
      }
    } catch {
      // ignore malformed packet
    }
  };

  ws.onclose = () => {
    const delay = Math.min(10000, 1000 * Math.pow(1.6, wsReconnectAttempt++));
    setTimeout(connectWebSocket, delay);
  };
}

connectWebSocket();

// 6. Uptime Timer & Perf Telemetry Reporter (every 1s)
setInterval(() => {
  const sec = Math.max(0, Math.floor((Date.now() - serverStartedAt) / 1000));
  const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  pillTimerEl.textContent = `${hh}:${mm}:${ss}`;

  const perf = scene.getPerfReport('overlay_main');
  perfIndicatorEl.textContent = `${perf.fps} FPS · ${perf.frameTimeMs}ms · ${perf.activeActors} vị`;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'perf', report: perf }));
  }
}, 1000);
