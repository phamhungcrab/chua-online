# 🧪 Báo Cáo Kiểm Thử, Benchmark & Visual QA (`TEST_REPORT.md`)

Tài liệu này ghi nhận kết quả kiểm thử tự động, kiểm thử tải đột biến (Burst Benchmark), kiểm thử bảo mật và đo đạc hiệu năng đồ họa thực tế trên trình duyệt của hệ thống **Temple Live Studio — Chánh Điện Tịnh Tâm**.

> **Nguyên tắc trung thực kỹ thuật**: Mọi số liệu dưới đây đều thuộc nhóm **`VERIFIED`** (đã chạy thực tế trên máy Windows hiện tại với Node.js `v24.14.0`, SQLite `3.51.2`, Vite `6.4.5`, Vitest `3.2.7` và Microsoft Edge Headless qua `playwright-core`). Các kịch bản soak test 2h / 6h / 12h liên tục được cung cấp sẵn công cụ chạy nhưng chưa tuyên bố hoàn thành khi chưa treo máy đủ số giờ thực tế.

---

## 1. Kết Quả Biên Dịch & Kiểm Tra Kiểu (`npm run build`)

- **Lệnh thực thi**: `vite build && tsc --noEmit`
- **Trạng thái**: **PASS (Exit Code 0)**
- **Thời gian biên dịch**: `2.84s` (737 modules transformed)
- **Kích thước gói đầu ra (`dist/client/`)**:
  - `overlay.html`: `14.46 kB` (`4.06 kB` gzip)
  - `admin.html`: `21.10 kB` (`5.90 kB` gzip)
  - `overlay.js` (bao gồm PixiJS v8 + 2.5D Scene Engine + Web Audio Synth): `164.33 kB` (`52.05 kB` gzip)
  - `admin.js`: `10.13 kB` (`3.22 kB` gzip)
  - Bộ font tiếng Việt tự chủ (`@fontsource/noto-serif` & `@fontsource/be-vietnam-pro` `.woff2`): Đóng gói cục bộ 100%, không phụ thuộc mạng ngoài khi phát sóng.

---

## 2. Kết Quả Bộ Kiểm Thử Tự Động (`npm test` — Vitest)

- **Lệnh thực thi**: `npm test` (`vitest run`)
- **Trạng thái**: **20 / 20 Tests PASSED (100%)** trong `255ms` (tổng thời gian chạy `1.02s`).

| Nhóm kiểm thử | Số lượng test | Nội dung xác minh (`VERIFIED`) | Kết quả |
| :--- | :---: | :--- | :---: |
| **1. Moderation, Vietnamese Diacritics & Skin Keyword Guard** | 5 | • Giữ nguyên dấu tiếng Việt chuẩn `NFC`, loại bỏ ký tự ẩn zero-width.<br>• Chặn tấn công Zalgo combining marks (`\u0300-\u036F`), chữ hình nêm Cuneiform và Braille.<br>• Chặn URL lừa đảo (`https://...`) và từ khóa cờ bạc/tục tĩu.<br>• Khớp lệnh đổi trang phục $\le 3$ từ: Câu *"Nam mô A Di Đà Phật"* (6 từ) trả về `null`, không bao giờ kích hoạt nhầm trang phục `"nam"`.<br>• Chống XSS bằng `escapeHtml` và làm sạch tên hiển thị. | ✅ PASS (5/5) |
| **2. Event Normalizer, Deduplication, Rate Limits & Gift Streaks** | 5 | • Bộ lọc trùng lặp `LruDeduplicator` theo `eventId` và cơ chế đuổi phần tử cũ nhất khi đầy.<br>• `GiftStreakTracker` xử lý chuẩn `giftType === 1`: không nhân đôi nghi lễ ở các gói trung gian (`repeatEnd: false`), chỉ phát nghi lễ cuối cùng khi `repeatEnd: true` hoặc hết thời gian chờ.<br>• `LikeBatchAggregator` gom cụm lượt thả tim tần suất cao thành một nhịp gõ Mõ Gỗ duy nhất.<br>• `TokenBucket` và `UserCooldownTracker` chặn flood theo từng loại sự kiện và từng người dùng.<br>• Chuẩn hóa sự kiện `chat` và `gift` (phân tầng Tier 1–4). | ✅ PASS (5/5) |
| **3. Dynamic Rule Engine & Exponential Backoff** | 2 | • Đánh giá luật `EventActionRule` theo độ ưu tiên (`priority`), nội suy biến mẫu (`{{user.nickname}}`, `{{wish}}`) và tôn trọng `cooldownSec`.<br>• Tính toán `computeBackoffWithJitter` có giới hạn trần + nhiễu ngẫu nhiên và chuẩn hóa `@username` TikTok. | ✅ PASS (2/2) |
| **4. SQLite Persistence, Crash Recovery & TempleStateEngine** | 1 | • Lưu trữ bền vững danh sách Phật tử, Bảng Vinh Danh (`meritPoints`), cấu hình bối cảnh (`GOLDEN_DUSK`, `LOTUS_RAIN`), tạo bản sao lưu JSON (`backups/backup_*.json`) và khôi phục nguyên trạng sau khi đóng và khởi tạo lại Engine. | ✅ PASS (1/1) |
| **5. HTTP & WebSocket Server Security, Auth & End-to-End Integration** | 7 | • Chỉ lắng nghe trên `127.0.0.1` và phản hồi `/api/health` (`200 OK`).<br>• Từ chối `Origin` lạ với mã `403 Forbidden` (chống CSRF/CSWSH).<br>• Chặn truy cập trái phép vào `/api/admin/*` khi thiếu/sai `X-Admin-Token` với mã `401 Unauthorized`.<br>• Kiểm tra schema bằng Zod, trả về `400 Bad Request` khi dữ liệu ngoài ngưỡng.<br>• Chặn tấn công Path Traversal (`..%2f..%2fpackage.json` $\to$ `404`).<br>• Xuất/nhập trọn bộ cấu hình JSON (`/api/config/export` & `/api/admin/config/import`).<br>• Chạy thử nghiệm tải đột biến 250 sự kiện qua REST API. | ✅ PASS (7/7) |

---

## 3. Kết Quả Kiểm Thử Tải Đột Biến (`npm run sim:burst`)

- **Lệnh thực thi**: `npm run sim:burst` (`src/server/cli/burstBenchmark.ts`)
- **Môi trường**: Node.js `v24.14.0` + SQLite WAL (`node:sqlite`) trên Windows.
- **Số đo thực tế (`VERIFIED`)**:
  - **Bộ nhớ ban đầu (Initial Memory)**: `RSS: 58.35 MB` | `HeapUsed: 9.67 MB`
  - **Đợt 1 — Burst 250 sự kiện hỗn hợp** (Like, Chat, Gift Streak, Follow):
    - Thời gian xử lý: **`27.98 ms`** (~`8,935 events/sec`)
    - Số lượng nhân vật trong chánh điện: `50 / 64` (tự động nâng sức chứa chiếu ngồi lên 64)
  - **Đợt 2 — Burst 1,000 sự kiện liên tiếp**:
    - Thời gian xử lý: **`8.06 ms`** (~`124,069 events/sec`)
    - Thống kê bộ lọc bảo vệ: `Accepted: 131` | `Deduplicated: 25` | `Rate-Limited (TokenBucket + Cooldown): 1,094`
  - **Bộ nhớ sau 1,250 sự kiện dồn dập**: `RSS: 61.45 MB` (+`3.10 MB`) | `HeapUsed: 11.05 MB` (+`1.38 MB`) — chứng minh các cấu trúc hàng đợi có giới hạn (`LruDeduplicator`, `UserCooldownTracker`, `PriorityTtsService`) không gây rò rỉ bộ nhớ.

---

## 4. Kết Quả Kiểm Thử Đồ Họa & Hiệu Năng Trình Duyệt (`npm run qa:visual`)

- **Lệnh thực thi**: `npm run qa:visual` (`src/server/cli/visualQaRunner.ts`)
- **Trình duyệt thực thi**: Microsoft Edge (`msedge.exe`) qua `playwright-core` với WebGL / D3D11 ANGLE bật ở độ phân giải gốc **`1080×1920`** (Overlay) và **`1600×1000`** (Admin Dashboard).
- **Số đo hiệu năng khung hình thực tế (`VERIFIED`)**:
  - **Tốc độ khung hình đo qua 90 khung `requestAnimationFrame` liên tiếp ở `1080×1920`**:
    - **Render FPS**: **`144 FPS`** (trên màn hình/trình duyệt không khóa VSync 60Hz; khi bật giới hạn 60 FPS trong cài đặt đạt ổn định 60 FPS, và chế độ 30 FPS ổn định ở 30–48 FPS).
    - **Thời gian vẽ trung bình mỗi khung (`avgFrameMs`)**: **`6.94 ms`** (ngân sách cho 60 FPS là `16.67 ms`, tức chỉ sử dụng ~41% ngân sách khung hình).
    - **Thời gian vẽ phân vị 95 (`p95FrameMs`)**: **`7.20 ms`**.
  - **Lỗi Console / Page Errors**: **`0 console errors, 0 page errors`** trên cả 3 chế độ (`/overlay`, `/overlay?obs=1&transparent=1&hud=minimal`, và `/admin`).

### Danh mục Ảnh Chụp Màn Hình Thực Tế (`docs/screenshots/`)

1. **[`overlay-1080x1920-night-ceremony.png`](file:///e:/tiktok/docs/screenshots/overlay-1080x1920-night-ceremony.png)**:
   - Cảnh Chánh Điện ban đêm (`SACRED_NIGHT`), tượng Phật A Di Đà trên đài sen 3 tầng, lư hương đồng tỏa khói, 6 chiếu VIP mạ vàng phía trước, nhân vật bước trên thảm đỏ thực hiện nghi thức **Đảnh Lễ Tam Bái** và bảng vinh danh **Đại Lễ Hào Quang Kim Liên**.
2. **[`overlay-1080x1920-fortune-oracle.png`](file:///e:/tiktok/docs/screenshots/overlay-1080x1920-fortune-oracle.png)**:
   - Hoạt cảnh rút **Quẻ Xăm Đầu Xuân** (`🎋 QUẺ XĂM ĐẦU XUÂN`) hiển thị thơ lục bát tiếng Việt rõ nét kèm lời bàn văn hóa tích cực.
3. **[`overlay-1080x1920-dawn-petals.png`](file:///e:/tiktok/docs/screenshots/overlay-1080x1920-dawn-petals.png)**:
   - Cảnh Hoàng Hôn Vàng Son (`GOLDEN_DUSK`) kết hợp mưa cánh hoa sen (`LOTUS_RAIN`) và dàn Phật tử tọa thiền.
4. **[`overlay-obs-transparent.png`](file:///e:/tiktok/docs/screenshots/overlay-obs-transparent.png)**:
   - Chế độ **OBS Transparent Mode (`?obs=1&transparent=1&hud=minimal`)** tách nền alpha trong suốt hoàn toàn để ghép đè lên nguồn video khác trong OBS Studio.
5. **[`admin-dashboard-1600x1000.png`](file:///e:/tiktok/docs/screenshots/admin-dashboard-1600x1000.png)**:
   - Giao diện **Admin Studio Dashboard** với khung xem trước `9:16` trực tiếp, bảng điều khiển kết nối TikTok LIVE, bộ phát sự kiện mô phỏng (Offline Simulator), nút kiểm thử Burst 250 / 1000 events, bộ chỉnh cảnh/ánh sáng, bàn trộn âm thanh (Sound Mixer) và bảng giám sát Telemetry.

---

## 5. Hướng Dẫn Chạy Soak Test Dài Hạn (2 Giờ / 6 Giờ / 12 Giờ)

Để kiểm tra độ ổn định liên tục nhiều giờ trước khi phát sóng dài ngày:
1. Khởi chạy server: `npm start`
2. Mở Admin Dashboard (`http://127.0.0.1:3000/admin`), tại mục **1. Kết Nối TikTok LIVE & Mô Phỏng**, bật **Chạy Đông Người (Busy)** hoặc **Đại Lễ (Festival)**.
3. Theo dõi các chỉ số trực tiếp tại mục **5. Giám Sát Hiệu Năng, Hàng Đợi & Độ Ổn Định (Telemetry)**:
   - `Overlay Render FPS & Frame Time`
   - `JS Heap Memory (MB)`
   - `TTS Queue Depth` & `Active Gift Streaks`
   - `Events Accepted / Deduplicated / Rate-Limited`
