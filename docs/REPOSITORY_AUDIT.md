# REPOSITORY AUDIT — TEMPLE LIVE STUDIO

> **Phân loại bằng chứng:**
> - **VERIFIED**: Đã xác minh trực tiếp trong mã nguồn của repository tham khảo (kèm đường dẫn file và tên hàm/lớp).
> - **UNVERIFIED**: Tuyên bố trong README hoặc tài liệu nhưng không có mã thực thi tương ứng hoặc chưa có benchmark kiểm chứng.
> - **PROPOSED**: Kiến trúc/thiết kế đề xuất cho **Temple Live Studio** trên cơ sở tổng hợp ưu điểm và loại bỏ anti-pattern.

---

## 1. Bảng Tổng Hợp 15 Repository Tham Khảo

| # | Repository | Ngôn ngữ / Stack | License | Tests | Kết nối TikTok | Đồ họa / Rendering | Chính sách Tái sử dụng |
|---|---|---|---|---|---|---|---|
| 1 | `kentjuno/chanh-dien-online` | Node.js ESM (`server.mjs`), HTML5 Canvas 2D (`overlay.html`) | MIT (`LICENSE`) | 0 | `tiktok-live-connector` ^2.1.0 | Canvas 2D 1080×1920 + PNG sprites + DOM HUD | Chỉ tham khảo ý tưởng bố cục bồ đoàn & Web Audio synth; **không** dùng lại ảnh/nhạc (nguồn gốc asset không rõ) và loại bỏ đoạn mã obfuscated watermark. |
| 2 | `zane-tv/tiktok-live-temple-rpc` | Node.js CJS (`server.js`), Express, `ws`, Python (`tts_worker.py`), Canvas 2D + DOM | **NO LICENSE** (All Rights Reserved mặc định) | 1 | `tiktok-live-connector` ^2.1.0 | Offscreen Canvas 2D (30 FPS cap) + DOM 8-pose swap | **Không sao chép code hoặc assets** (không có giấy phép). Học hỏi ý tưởng kiến trúc: JSON-RPC state sync, pre-rendered particle sprites, bộ lọc Unicode spam. |
| 3 | `matheusmonck/live-avatars` | Node.js ESM (`src/server/`), React + Vite (`admin/`), PixiJS (`public/`) | MIT (`LICENSE`) | 25 (`vitest`) | `tiktok-live-connector` ^2.4.3 | PixiJS 2D sprite avatars | Tham khảo cấu trúc tách `connection-manager`, `simulator`, `bridge` và bộ test Vitest. |
| 4 | `landsbetween/tiktok-pyramid-live` | Node.js (`server/server.js`) + Godot 4 GDScript (`game/scripts/*.gd`) | **NO LICENSE** | 0 | `tiktok-live-connector` 2.x | Godot 4 2D engine | **Không sao chép code**. Tham khảo ý tưởng `ControlEvent.WEBSOCKET_DATA` 60s stale-socket watchdog. |
| 5 | `ephrisian/TikTok-Overlay` | TypeScript (`backend/*.ts`), Construct 2/3 plugins | **NO LICENSE** | 1 | `tiktok-live-connector` | Construct 2/3 runtime + Web overlay | **Không sao chép code**. Tham khảo mô hình `IFTTTRule` (`all`/`any` conditions + template interpolation `{{user.username}}`). |
| 6 | `duyduoc03/tiktok-live-games` | Node.js ESM (`src/`), Vanilla JS Canvas (`public/games/horse-racing/`) | `package.json`: MIT (thiếu file `LICENSE`) | 0 | `tiktok-live-connector` | HTML5 Canvas 2D | Tham khảo mô hình hàm thuần chuẩn hóa sự kiện (`tiktokEventNormalizer.js`) và backoff có jitter (`tiktokReconnectPolicy.js`). |
| 7 | `darinh/tiktok-overlays` | Node.js CJS (`serve.js`, `overlays/coin-jar-pro/`) | `package.json`: ISC (thiếu file `LICENSE`) | 4 (`node:test`) | Bridged / Query / Demo | Canvas 2D / DOM | Tham khảo cách kiểm tra chống thoát thư mục gốc (`fs.realpath` + `path.relative`) và công cụ test tự động. |
| 8 | `talkaboutdesign/tiklive` | TypeScript Monorepo (`Bun`, `Effect 4.0`, Electron desktop) | MIT (`LICENSE`) | 27 | Custom Effect client | HTML/JS examples | Tham khảo kiến trúc phân tách rõ package `client`, `server`, `desktop` và quản lý vòng đời tiến trình (`shutdown.ts`). |
| 9 | `klucilla/teddytravolta` | Node.js ESM (`src/queue.js`, `src/tiktok.js`, `src/obs.js`) | MIT (`LICENSE`) | 3 | `tiktok-live-connector` | OBS scene switching + HTML card | Tham khảo cơ chế hàng đợi ưu tiên (`QUEUE_PRIORITY`) kết hợp thời hạn hiệu lực sự kiện (`QUEUE_TTL`) và thay thế bình luận chờ của cùng 1 user. |
| 10 | `ThangBaymau123/tiktok-live-overlay` | Node.js ESM (`server.js`), Fastify, WebSocket, multi-overlay (`public/overlay/*`) | MIT (`LICENSE`) | 19 | `tiktok-live-connector` (vendored) | Multi-page HTML/CSS/Canvas overlays | Tham khảo cơ chế `TokenBucket` theo từng loại sự kiện, `STATS_FLUSH_INTERVAL_MS` debounce 500ms, và giới hạn `MAX_GIFTERS`. |
| 11 | `zerodytrash/TikTok-Live-Connector` | TypeScript (`src/lib/client/index.ts`, `tiktok-live-proto/v3`, `ws`) | **AGPL-3.0-only** (v2.x) | 25 | Thư viện gốc đọc TikTok Webcast | N/A | Dùng dưới dạng **optional/pluggable npm dependency** qua interface `ITikTokConnector` (xem mục 3 bên dưới). |
| 12 | `kitakeyos-dev/TikTokStreamSuite` | Java (`ActionRulesEngineImpl.java`, `StreamSessionMediator.java`) | MIT (`LICENSE`) | 0 | Java TikTok connector | JavaFX / Desktop UI | Tham khảo mô hình `StreamRule` (`TriggerType` → `ActionType.SOUND` / `ActionType.TTS`) lưu file JSON. |
| 13 | `fida2020/tiktok-live-setup` | Node.js CJS (`src/overlays/overlayQueue.js`, `src/obs/obsClient.js`), PowerShell (`.ps1`) | **NO LICENSE** | 11 | TikFinity / Listener bridge | Multi-overlay HTML + OBS WebSocket | **Không sao chép code, tuyệt đối không chạy `.ps1`**. Học hỏi kinh nghiệm `OverlayQueue` không ngắt ngang animation đang chạy để tránh treo trạng thái OBS. |
| 14 | `Ghifaryh/tiktok-poll-overlay` | TypeScript (`Bun`, `Drizzle ORM`, `Astro`, `apps/api/src/connector/manager.ts`) | **NO LICENSE** | 0 | `tiktok-live-connector` | Astro + React components | **Không sao chép code**. Tham khảo ý tưởng `FakeConnection` (EventEmitter) cho kiểm thử tích hợp không cần phòng LIVE thật. |
| 15 | `tucadis/tiktok_connect` | TypeScript (`Express`, `Socket.IO`, `MQTT`, `Redis`, `obs-websocket-js`) | MIT (`LICENSE`) | 3 (`jest`) | `tiktok-live-connector` ^1.2.1 | Dashboard HTML + Chart | Tham khảo kiến trúc tách `Collector` → `EventParser` → `EventRouter` → `Integrations`. |

---

## 2. Phân Tích Chi Tiết Các Dự Án Trọng Tâm

### 2.1. `kentjuno/chanh-dien-online`
- **Kiến trúc thực tế (VERIFIED)**:
  - `live/server.mjs` (300 dòng): HTTP + `ws` server đơn file, dùng `msedge-tts` tạo file MP3 trong `live/tts/`, giữ tối đa 40 file gần nhất.
  - `live/overlay.html` (331 dòng): Canvas 2D `1080×1920` vẽ ảnh nền `/assets/hall.jpg`, 3 vị tăng cố định (`TEACHERS`), lưới chỗ ngồi hình thang (`FLOOR = { yTop: 1215, yBot: 1845 }`) với sức chứa `24 | 36 | 64 | 100`.
- **Điểm mạnh kỹ thuật (VERIFIED)**:
  - **Bảo mật localhost rất tốt** (`live/server.mjs:255-289`): Bind mặc định `127.0.0.1`, kiểm tra header `Host` chống DNS Rebinding (`ALLOWED_HOSTS`), kiểm tra `Origin` trên WebSocket, phân tách `ws.role = 'control' | 'overlay'` (overlay không thể gửi lệnh điều khiển), chặn truy cập dot-files và file `.mjs/.json`.
  - **Tổng hợp âm thanh chuông & mõ bằng Web Audio API** (`live/overlay.html:182-192`): Dùng `OscillatorNode` nhiều họa âm (`216, 432, 1296, 2160 Hz`) và `BiquadFilterNode` bandpass `700 Hz` cho tiếng mõ — không phụ thuộc file âm thanh ngoài.
  - **Audio ducking** (`live/overlay.html:180`): Tự động giảm âm lượng nhạc nền xuống `0.14` bằng `linearRampToValueAtTime` khi phát giọng đọc TTS.
  - **Xử lý gift streak cơ bản** (`live/server.mjs:156-157`): `if (type === 1 && !d.repeatEnd) return;`.
- **Hạn chế & Rủi ro (VERIFIED)**:
  - **Đoạn mã ẩn (Obfuscated Watermark Injection)** tại `live/overlay.html:320-327`: Dưới comment giả `/* lantern ambience: every few minutes the hall lanterns brighten for a moment */` là mảng số XOR `_q` giải mã thành chuỗi `"✦ Mã nguồn được chia sẻ bởi Kent Juno ✦"` và ghi đè `window['frame']` để vẽ đè lên canvas mỗi 5–10 phút.
  - **Không lưu trữ trạng thái (No Persistence)**: Toàn bộ `viewers` nằm trong `Map` bộ nhớ RAM; khi khởi động lại server sẽ mất sạch công đức và chỗ ngồi.
  - **Không có cơ chế tự động kết nối lại (No Auto-Reconnect)**: Khi nhận `ControlEvent.DISCONNECTED` (`live/server.mjs:165`), chỉ đổi `status = 'disconnected'` và dừng hẳn.
  - **Hiệu năng Canvas**: Trong `live/overlay.html:299`, hàm `ctx.createRadialGradient` được gọi mỗi frame cho từng nhân vật có hào quang (`v.glow > 0 || v.skin === 'master'`), gây cấp phát đối tượng liên tục trong vòng lặp 60 FPS.
  - **Bản quyền Asset**: Các file `/assets/*.png`, `/assets/hall.jpg`, `/assets/music/*.mp3` không có thông tin nguồn gốc hay giấy phép riêng. **Quyết định**: Không tái sử dụng bất kỳ asset nào của repo này.

### 2.2. `zane-tv/tiktok-live-temple-rpc`
- **Kiến trúc thực tế (VERIFIED)**:
  - `server.js` (1.222 dòng): Express + `ws` JSON-RPC 2.0 server, quản lý child process Python `tts_worker.py` (`ZeroTTS`), lưu trạng thái ra file JSON `data/merit-state.json` (debounce 1200ms).
  - `public/js/live.js` (845 dòng), `public/js/particles.js` (339 dòng), `public/js/audio.js` (424 dòng).
- **Điểm mạnh kỹ thuật (VERIFIED)**:
  - **Pre-rendered Offscreen Sprites** (`public/js/particles.js:37-85`): Khởi tạo 1 lần các offscreen canvas cho khói (`64×64`), hạt sáng vàng (`16×16`), cánh sen hồng/vàng (`28×28`), trong vòng lặp frame chỉ gọi `ctx.drawImage()` — loại bỏ hoàn toàn `createRadialGradient` và `shadowBlur` mỗi frame.
  - **Chống spam & lọc nội dung tiếng Việt** (`server.js:337-390`): Chặn ký tự Cuneiform (`\u{12000}-\u{1254F}`), Braille, Zalgo combining marks (`[\u0300-\u036F]{3,}`), emote ngoặc vuông `[...]`, chuẩn hóa Unicode `NFKC` + `NFC`, và cooldown mỗi người dùng `3.5s`.
  - **Theo dõi delta của Gift Combo** (`server.js:936-952`): Dùng `giftComboTracker` theo `groupId` để tính `deltaCount = repeatCount - prevCount`.
- **Hạn chế & Rủi ro (VERIFIED)**:
  - **Không có LICENSE file**: Không được phép sao chép mã nguồn hoặc hình ảnh (`/assets/amitabha_stage.png`, `devotee_*.png`).
  - **Lỗ hổng bảo mật**:
    - `app.use(cors())` mở toàn bộ CORS (`server.js:1097`).
    - `server.listen(PORT)` (`server.js:1207`) không chỉ định `127.0.0.1` (mặc định lắng nghe trên tất cả network interfaces `0.0.0.0` / `::`).
    - Endpoint `/rpc` và `/ws` không kiểm tra `Host`, không kiểm tra `Origin`, không có xác thực cho các lệnh quản trị (`temple.resetMerit`, `live.connect`).
    - Tự động kết nối vào kênh `@zenfacts_vn` ngay khi bật server (`server.js:1216-1220`).
  - **Hiệu năng DOM**: Cập nhật `congregationHall.innerHTML` cho 40 chỗ ngồi mỗi khi bảng xếp hạng thay đổi (`public/js/live.js:163`).

### 2.3. `zerodytrash/TikTok-Live-Connector` (v2.5.0)
- **Kiến trúc & API thực tế (VERIFIED trong `src/lib/client/index.ts` & `src/types/events.ts`)**:
  - Class chính: `TikTokLiveConnection(uniqueId, options)` kế thừa `EventEmitter`.
  - Các tùy chọn constructor quan trọng:
    - `processInitialData?: boolean` (mặc định `true` — nên đặt `false` hoặc kiểm soát qua dedupe để tránh phát lại hàng loạt sự kiện cũ khi vừa kết nối).
    - `fetchRoomInfoOnConnect?: boolean` (mặc định `true` — ném `UserOfflineError` khi `status === 4`).
    - `enableExtendedGiftInfo?: boolean` (mặc định `false` — khi `false` vẫn có `gift.diamondCount` trong protobuf v3).
    - `signApiKey?: string` (EulerStream API key tùy chọn nếu vượt giới hạn rate-limit miễn phí).
  - Các enum sự kiện (`src/types/events.ts:69-156`):
    - `ControlEvent`: `CONNECTED ('connected')`, `DISCONNECTED ('disconnected')`, `ERROR ('error')`, `WEBSOCKET_DATA ('websocketData')`, `RAW_DATA ('rawData')`.
    - `WebcastEvent`: `CHAT ('chat')`, `GIFT ('gift')`, `LIKE ('like')`, `MEMBER ('member')`, `SOCIAL ('social')`, `FOLLOW ('follow')`, `SHARE ('share')`, `ROOM_USER ('roomUser')`, `STREAM_END ('streamEnd')`.
  - **Quan trọng**: Thư viện **không** tự động reconnect khi đứt kết nối WebSocket; ứng dụng bắt buộc phải tự quản lý backoff reconnect và phát hiện kết nối treo (stale socket).
  - **Giấy phép (License)**: Phiên bản 2.x dùng **AGPL-3.0-only**. Trong kiến trúc của chúng ta, `tiktok-live-connector` chỉ được nạp động (`await import('tiktok-live-connector')`) thông qua adapter `TikTokLiveConnectorAdapter` thực thi interface `ITikTokConnector`, không trộn lẫn hay sửa đổi mã nguồn của thư viện.

### 2.4. Các Repository Đồ Họa, Overlay & Automation Khác
- **`matheusmonck/live-avatars` (VERIFIED)**: Tách biệt rõ `src/server/connection-manager.js`, `src/server/simulator.js`, `src/server/bridge.js`, có script `iniciar.bat` (chỉ chạy `npm install` + `npm run dev` — an toàn nhưng chúng ta không chạy). Điểm yếu: `connection-manager.js:52` bắt buộc phải có `signApiKey` mới cho kết nối (`if (!newCfg?.signApiKey) throw new Error(...)`), gây khó khăn khi dùng chế độ miễn phí.
- **`landsbetween/tiktok-pyramid-live` (VERIFIED)**: Trong `server/server.js:136-146`, có kỹ thuật rất đáng giá: lắng nghe `ControlEvent.WEBSOCKET_DATA` để cập nhật biến `lastData = Date.now()`; nếu `conn.isConnected && Date.now() - lastData > 60000` thì chủ động `disconnect()` và kết nối lại (vì TikTok đôi khi giữ TCP socket mở nhưng ngừng đẩy frame). File `start.bat:26` có lệnh `taskkill /F /PID` và `git pull` — **tuyệt đối không chạy**.
- **`ephrisian/TikTok-Overlay` (VERIFIED)**: `backend/ruleEngine.ts` thiết kế cấu trúc điều kiện `all` / `any` với các toán tử `equals`, `greater_than`, `contains` và nội suy chuỗi `{{user.username}}` kèm log giải thích lý do khớp rule (`checkConditionWithExplanation`).
- **`duyduoc03/tiktok-live-games` (VERIFIED)**: `src/lib/tiktokReconnectPolicy.js` triển khai công thức exponential backoff có jitter `±30%`: `exp = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)`.
- **`darinh/tiktok-overlays` (VERIFIED)**: `serve.js:25-59` sử dụng `fs.realpath` kết hợp `path.relative` và chặn null-byte `\0` để chống Path Traversal và Symlink Escape.
- **`klucilla/teddytravolta` (VERIFIED)**: `src/queue.js:60-119` định nghĩa bảng trọng số `QUEUE_PRIORITY` (`gift: 100`, `comment: 80`, `share: 60`, `likes: 50`, `follow: 40`, `join: 20`) và `QUEUE_TTL` (`join: 30s`, `likes: 60s`, `comment: 90s`). Khi 1 người gửi nhiều bình luận liên tiếp khi chưa kịp đọc, bình luận mới sẽ thay thế bình luận cũ đang chờ trong hàng đợi (`src/queue.js:306-313`), chống độc chiếm TTS.
- **`ThangBaymau123/tiktok-live-overlay` (VERIFIED)**: `server.js:118-178` sử dụng `TokenBucket` riêng cho từng loại sự kiện (`comment`, `like`, `follow`, `share`, `join`, `gift`) ngay tại tầng thu thập để không làm nghẽn WebSocket và trình duyệt khi phòng live có lưu lượng đột biến (viral stream), đồng thời gộp việc phát bảng thống kê mỗi `500ms` (`STATS_FLUSH_INTERVAL_MS`).
- **`fida2020/tiktok-live-setup` (VERIFIED)**:
  - `src/overlays/overlayQueue.js` đảm bảo các sự kiện ưu tiên cao (`priority === 'high'`) được chèn lên trước các sự kiện thường đang chờ nhưng **không cắt ngang** hiệu ứng đang chạy dở trên màn hình.
  - **Cảnh báo rủi ro cao với các file `.ps1`**: `Verify-SkyRigDisplay.ps1` gọi `Disable-PnpDevice` để vô hiệu hóa card màn hình/màn hình mặc định của Windows và xóa Scheduled Task. Chúng ta chỉ đọc văn bản để kiểm toán, **tuyệt đối không thực thi**.

---

## 3. Tổng Hợp Các Quyết Định Thiết Kế Cho Temple Live Studio (PROPOSED)

Từ kết quả kiểm toán mã nguồn trên, **Temple Live Studio** áp dụng các nguyên tắc kỹ thuật sau:

1. **100% Mã Nguồn & Đồ Họa Gốc (Clean-Room Implementation)**:
   - Không sao chép bất kỳ file hình ảnh, âm thanh hay mã nguồn nào từ các repo không có giấy phép hoặc không rõ nguồn gốc asset.
   - Xây dựng hệ thống **Procedural Vector & Shader-like Temple Artwork Generator** kết hợp **PixiJS v8 Scene Graph** (với Canvas 2D high-precision fallback/atlas baking), tạo ra kiến trúc Chánh Điện Việt Nam 2.5D sắc nét ở độ phân giải gốc `1080×1920`, kèm nhãn minh bạch trong tài liệu về các thành phần đồ họa thủ tục (procedural art) và khả năng thay thế bằng sprite sheet bên ngoài.
2. **Kết Nối & Chống Đứt Quãng (Resilience Engine)**:
   - Adapter `TikTokLiveConnectorAdapter` (tải động `tiktok-live-connector`) + Exponential Backoff có Jitter (`±25%`) + **Stale-Socket Watchdog** (kiểm tra thời gian từ frame cuối cùng).
   - Xử lý chính xác **Gift Streak (`giftType === 1`)**: hỗ trợ cả chế độ đợi `repeatEnd` hoặc cập nhật lũy tiến theo `deltaCount` mà không nhân đôi điểm hay đọc TTS lặp.
3. **Bộ Định Tuyến Sự Kiện, Kiểm Duyệt & Luật Tương Tác (Normalizer, Moderation & Rule Engine)**:
   - Chuẩn hóa toàn bộ sự kiện về schema chặt chẽ (Zod + TypeScript).
   - Bộ lọc chống spam đa tầng: lọc Unicode rác (Zalgo, Cuneiform, Braille), từ khóa nhạy cảm, giới hạn độ dài, LRU Deduplication theo `eventId`, Per-User Cooldown, và `TokenBucket` chống bão sự kiện (Like/Chat flood).
   - Rule Engine cấu hình động từ Dashboard (lưu SQLite + import/export JSON), không hard-code.
4. **Hệ Thống Âm Thanh & TTS Không Chặn (Non-Blocking Audio & Priority/TTL TTS Queue)**:
   - Kết hợp hàng đợi ưu tiên (`QUEUE_PRIORITY`) + thời hạn sống (`QUEUE_TTL`) + gộp bình luận trùng người gửi.
   - Tự động hạ nhạc nền (**Audio Ducking**) mượt mà khi phát giọng đọc.
   - Hỗ trợ tổng hợp giọng đọc tiếng Việt (Edge Neural TTS qua backend stream / Web Speech API fallback) kèm bộ nhớ đệm SHA-256 trên đĩa và tổng hợp pháp khí (Đại Hồng Chung, Mõ Gỗ, Chuông Bát Nhã, Ống Xăm) bằng Web Audio API chuẩn 0dBFS.
5. **Bảo Mật Mặc Định (Secure by Default)**:
   - Mặc định chỉ bind `127.0.0.1`.
   - Kiểm tra chặt header `Host` (chống DNS Rebinding) và `Origin` trên cả HTTP REST lẫn WebSocket.
   - Phân quyền rõ ràng giữa kết nối `overlay` (chỉ đọc sự kiện hiển thị) và `admin` (yêu cầu xác thực token cục bộ hoặc phiên quản trị để thay đổi cấu hình/kết nối).
