import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createStudioServer } from '../httpServer.ts';

function findLocalBrowserExecutable(): string {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Could not find local Edge or Chrome executable for Visual QA Runner');
}

async function runVisualQa(): Promise<void> {
  const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-vqa-'));
  const screenshotsDir = path.resolve(process.cwd(), 'docs', 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const executablePath = findLocalBrowserExecutable();
  console.log(`[VisualQA] Using local browser: ${executablePath}`);

  const studio = await createStudioServer({
    host: '127.0.0.1',
    port: 0,
    dataDir: tmpDataDir,
    adminToken: 'vqa-admin-token',
    synthesizeTtsEnabled: false
  });

  const baseUrl = `http://${studio.host}:${studio.port}`;
  console.log(`[VisualQA] Studio server running at ${baseUrl}`);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  try {
    // 1. Open 1080x1920 Vertical Overlay
    const overlayContext = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1
    });
    const overlayPage = await overlayContext.newPage();

    overlayPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Overlay Console Error] ${msg.text()}`);
      }
    });
    overlayPage.on('pageerror', (err) => {
      pageErrors.push(`[Overlay Page Error] ${err.message}`);
    });

    await overlayPage.goto(`${baseUrl}/overlay`, { waitUntil: 'networkidle' });
    await overlayPage.waitForTimeout(1500);

    const postAdmin = async (endpoint: string, body: unknown) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': 'vqa-admin-token'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`POST ${endpoint} failed with ${res.status}: ${text}`);
      }
    };

    // Populate temple with diverse worshippers & skins
    const sampleVisitors = [
      { uniqueId: 'minh_anh_99', nickname: 'Minh Anh 🌸', comment: 'nữ', points: 45 },
      { uniqueId: 'thien_tam_88', nickname: 'Thiện Tâm 🙏', comment: 'sư', points: 60 },
      { uniqueId: 'hoang_long_vip', nickname: 'Hoàng Long 🐉', comment: 'nam', points: 120 },
      { uniqueId: 'ngoc_lan_sen', nickname: 'Ngọc Lan 🪷', comment: 'nữ', points: 85 },
      { uniqueId: 'an_nhien_zen', nickname: 'An Nhiên 🍃', comment: 'tiểu', points: 50 },
      { uniqueId: 'phuc_loc_tho', nickname: 'Phúc Lộc Thọ ✨', comment: 'hộ pháp', points: 220 }
    ];

    for (const v of sampleVisitors) {
      await postAdmin('/api/admin/sim/event', {
        type: 'chat',
        uniqueId: v.uniqueId,
        nickname: v.nickname,
        comment: v.comment
      });
      await postAdmin('/api/admin/sim/event', {
        type: 'gift',
        uniqueId: v.uniqueId,
        nickname: v.nickname,
        giftName: 'Hoa Sen Vàng',
        diamondCount: v.points,
        repeatCount: 1,
        repeatEnd: true
      });
    }

    // Release wishing lanterns
    await postAdmin('/api/admin/sim/event', {
      type: 'chat',
      uniqueId: 'ngoc_lan_sen',
      nickname: 'Ngọc Lan 🪷',
      comment: 'Con xin thả đèn hoa đăng cầu gia đình bình an mạnh khỏe, vạn sự cát tường'
    });

    // Trigger Grand Ceremony so central carpet & banner are visible
    await postAdmin('/api/admin/sim/event', {
      type: 'gift',
      uniqueId: 'dai_thi_chu_88',
      nickname: 'Đại Thí Chủ Minh Đức',
      giftName: 'Đại Lễ Kim Liên Hào Quang',
      diamondCount: 520,
      repeatCount: 1,
      repeatEnd: true
    });

    // Wait for characters to walk & ceremony banner to appear
    await overlayPage.waitForTimeout(2200);

    const mainShotPath = path.join(screenshotsDir, 'overlay-1080x1920-night-ceremony.png');
    await overlayPage.screenshot({ path: mainShotPath, fullPage: false });
    console.log(`[VisualQA] Saved screenshot: ${mainShotPath}`);

    // Trigger Fortune Oracle ("Xin Xăm") with a dedicated user and capture
    await postAdmin('/api/admin/sim/event', {
      type: 'chat',
      uniqueId: 'loc_xuan_cat_tuong',
      nickname: 'Lộc Xuân Cát Tường 🎋',
      comment: 'Con xin xăm đầu năm cầu công việc thuận lợi'
    });
    await overlayPage.waitForTimeout(1200);

    const fortuneShotPath = path.join(screenshotsDir, 'overlay-1080x1920-fortune-oracle.png');
    await overlayPage.screenshot({ path: fortuneShotPath, fullPage: false });
    console.log(`[VisualQA] Saved screenshot: ${fortuneShotPath}`);

    // Trigger Flower Offering Ceremony ("Dâng Hoa Sen Cúng Phật")
    await postAdmin('/api/admin/ritual/flowers', {
      nickname: 'Diệu Hương 🪷',
      wishText: 'Cung kính dâng hoa sen tươi lên Đức Bổn Sư Thích Ca Mâu Ni Phật'
    });
    await overlayPage.waitForTimeout(1400);

    const flowerShotPath = path.join(screenshotsDir, 'overlay-1080x1920-flower-offering.png');
    await overlayPage.screenshot({ path: flowerShotPath, fullPage: false });
    console.log(`[VisualQA] Saved screenshot: ${flowerShotPath}`);

    // Switch ambience to GOLDEN_DUSK + LOTUS_RAIN and capture
    await postAdmin('/api/admin/settings', {
      timeOfDay: 'GOLDEN_DUSK',
      weather: 'LOTUS_RAIN'
    });
    await overlayPage.waitForTimeout(1200);

    const dawnShotPath = path.join(screenshotsDir, 'overlay-1080x1920-dawn-petals.png');
    await overlayPage.screenshot({ path: dawnShotPath, fullPage: false });
    console.log(`[VisualQA] Saved screenshot: ${dawnShotPath}`);

    // Capture with TikTok Safe Zone Guide lines visible
    await postAdmin('/api/admin/settings', {
      showSafeZones: true
    });
    await overlayPage.waitForTimeout(600);
    const safeZoneShotPath = path.join(screenshotsDir, 'overlay-1080x1920-safezone.png');
    await overlayPage.screenshot({ path: safeZoneShotPath, fullPage: false });
    console.log(`[VisualQA] Saved screenshot: ${safeZoneShotPath}`);
    await postAdmin('/api/admin/settings', {
      showSafeZones: false
    });

    // Measure actual render FPS over 90 animation frames inside the browser
    const fpsMetrics = await overlayPage.evaluate(async () => {
      return await new Promise<{ fps: number; avgFrameMs: number; p95FrameMs: number }>((resolve) => {
        const deltas: number[] = [];
        let last = performance.now();
        let count = 0;
        function step(now: number) {
          deltas.push(now - last);
          last = now;
          count += 1;
          if (count < 90) {
            requestAnimationFrame(step);
          } else {
            const valid = deltas.slice(1);
            const sum = valid.reduce((a, b) => a + b, 0);
            const avg = sum / valid.length;
            const sorted = [...valid].sort((a, b) => a - b);
            const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;
            resolve({
              fps: Math.round(1000 / Math.max(1, avg)),
              avgFrameMs: Number(avg.toFixed(2)),
              p95FrameMs: Number(p95.toFixed(2))
            });
          }
        }
        requestAnimationFrame(step);
      });
    });

    console.log(
      `[VisualQA] Measured Browser Render Metrics (1080x1920): FPS=${fpsMetrics.fps} | avgFrameMs=${fpsMetrics.avgFrameMs}ms | p95FrameMs=${fpsMetrics.p95FrameMs}ms`
    );

    // 2. Open OBS Transparent Mode (/overlay?obs=1&transparent=1&hud=minimal)
    await postAdmin('/api/admin/settings', {
      timeOfDay: 'SACRED_NIGHT',
      weather: 'CLEAR'
    });
    const obsPage = await overlayContext.newPage();
    await obsPage.goto(`${baseUrl}/overlay?obs=1&transparent=1&hud=minimal`, {
      waitUntil: 'networkidle'
    });
    await obsPage.waitForTimeout(1200);
    const obsShotPath = path.join(screenshotsDir, 'overlay-obs-transparent.png');
    await obsPage.screenshot({ path: obsShotPath, omitBackground: true });
    console.log(`[VisualQA] Saved OBS transparent screenshot: ${obsShotPath}`);

    // 3. Open Admin Studio Dashboard (1600x1000)
    const adminContext = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 1
    });
    const adminPage = await adminContext.newPage();
    adminPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Admin Console Error] ${msg.text()}`);
      }
    });
    adminPage.on('pageerror', (err) => {
      pageErrors.push(`[Admin Page Error] ${err.message}`);
    });

    await adminPage.goto(`${baseUrl}/admin?token=vqa-admin-token`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);

    const adminShotPath = path.join(screenshotsDir, 'admin-dashboard-1600x1000.png');
    await adminPage.screenshot({ path: adminShotPath, fullPage: false });
    console.log(`[VisualQA] Saved Admin screenshot: ${adminShotPath}`);

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      console.error('[VisualQA] Errors detected during browser run:', {
        consoleErrors,
        pageErrors
      });
      process.exitCode = 1;
    } else {
      console.log(
        '[VisualQA] Zero console errors and zero page errors across Overlay, OBS mode, and Admin Dashboard.'
      );
    }
  } finally {
    await browser.close();
    await studio.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  }
}

runVisualQa().catch((err) => {
  console.error('[VisualQA] Fatal error:', err);
  process.exit(1);
});
