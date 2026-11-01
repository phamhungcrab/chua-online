# 🪷 Temple Live Studio — Chánh Điện Tịnh Tâm (Interactive TikTok LIVE)

**Temple Live Studio** là hệ thống phát sóng tương tác thời gian thực (**Chùa Online 2.5D trên TikTok LIVE**) được thiết kế độc lập từ đầu (clean-room implementation) cho Windows và OBS Studio. Dự án kết hợp nghệ thuật **Sơn Mài Vàng Son (Vietnamese Lacquerware & Sanctuary Art)** ở độ phân giải dọc chuẩn điện thoại **`1080×1920`** với kiến trúc 10 module tách biệt, bảo mật mặc định trên `localhost`, có khả năng chịu tải cao (burst/flood protection) và phục hồi trạng thái tự động qua SQLite WAL.

---

## ✨ Tính năng nổi bật

1. **Đồ họa Chánh Điện Việt Nam 2.5D (`1080×1920` Mobile-First)**:
   - Không gian 5 lớp chiều sâu: Tượng Phật A Di Đà tọa đài sen 3 tầng, bánh xe hào quang xoay chậm, rèm gấm đỏ chỉ vàng, cột gỗ lim câu đối chữ Việt, lư hương đồng chạm nổi, Đại Hồng Chung và Mõ Gỗ Bát Nhã.
   - Hệ thống hạt (Particle Pool) không cấp phát bộ nhớ động trong vòng lặp vẽ: khói trầm uốn lượn theo hàm sóng điều hòa, cánh sen rơi, bụi vàng lấp lánh và đèn hoa đăng bay lên.
   - **4 bối cảnh thời gian**: `SACRED_NIGHT` (Đêm Linh Thiêng), `GOLDEN_DUSK` (Hoàng Hôn Vàng Son), `DAY_SERENE` (Ban Ngày Thanh Tịnh), `FESTIVAL_GLOW` (Đêm Đại Lễ Hoa Đăng).
   - **4 chế độ thời tiết**: `CLEAR`, `LOTUS_RAIN` (Mưa Cánh Sen), `MISTY_INCENSE` (Sương Trầm), `SPRING_BLOSSOM` (Lộc Xuân).
   - **Quality Presets (`low` / `medium` / `high`)** và giới hạn FPS (`30` / `60`) thích ứng cấu hình máy phát trực tiếp.

2. **Hệ thống Nhân vật 7 Trạng thái (FSM) & Nghi lễ Đảnh Lễ Tam Bái**:
   - 7 trang phục Phật tử & hành giả (`lam_female`, `lam_male`, `brown_elder`, `monk`, `nun`, `child`, `master_vip`) với 6 tư thế vẽ thủ công chất lượng cao và sắp xếp chiều sâu theo trục Y (`depth sorting`).
   - Tự động mở rộng chiếu ngồi từ `24 → 36 → 64 → 100` vị trí, cùng **6 chiếu nghỉ VIP mạ vàng** hàng đầu cho Bảng Vinh Danh.
   - Nghi lễ trung tâm thảm đỏ: Nhân vật bước từ cổng Tam Quan, tiến lên thảm đỏ giữa điện, chắp tay và thực hiện **3 lạy trang nghiêm (Tam Bái)** trước khi về vị trí tọa thiền.

3. **Tương tác TikTok LIVE & Động cơ Luật Động (Dynamic Event-to-Action Rule Engine)**:
   - **Bình luận (Chat)**: Vào chánh điện tọa thiền, thắp hương kèm bong bóng lời nguyện đã qua bộ lọc kiểm duyệt tiếng Việt.
   - **Đổi trang phục**: Gõ ngắn gọn `nam`, `nữ`, `ông`, `bà`, `sư`, `ni`, `tiểu`, `hộ pháp` (giới hạn $\le 3$ từ để câu niệm *"Nam mô A Di Đà Phật"* không bao giờ bị nhận nhầm là lệnh đổi trang phục `"nam"`).
   - **Thả tim (Like Batching)**: Gom cụm 550ms chuyển thành nhịp gõ Mõ Gỗ Bát Nhã, chống nghẽn hiệu ứng khi có hàng trăm tim mỗi giây.
   - **Follow / Share**: Thỉnh Đại Hồng Chung ngân vang cùng sóng âm vàng kim.
   - **Quà tặng (Gift 4 Tiers & Streak Protection)**: Xử lý chuẩn xác `giftType === 1` (`repeatEnd`), chỉ kích hoạt đại lễ khi kết thúc chuỗi combo hoặc hết thời gian chờ, phân tầng lễ vật (`Hoa Sen`, `Đèn Lưu Ly`, `Mâm Ngũ Quả`, `Đại Lễ Kim Liên Hào Quang`).
   - **Thả Đèn Hoa Đăng & Xin Xăm Văn Hóa**: Bộ 18 quẻ xăm thơ lục bát/thất ngôn truyền thống mang tính văn hóa – khích lệ tinh thần hướng thiện.
   - **Bình chọn trực tiếp (Live Chat Poll) & Đại Nguyện Cộng Đồng (Community Goal)**.

4. **Âm thanh Thiền & Giọng đọc TTS Tiếng Việt Có Ưu Tiên (Priority + TTL Queue)**:
   - Bộ tổng hợp âm thanh Web Audio API tích hợp sẵn (tiếng Đại Hồng Chung 4 họa âm, tiếng Mõ Gỗ cộng hưởng, chuông xoay, tiếng lắc ống xăm, nhạc nền Ngũ Cung Tịnh Tâm).
   - Tự động giảm âm lượng nhạc nền (**Auto-Ducking**) khi phát giọng đọc TTS (`vi-VN-NamMinhNeural` / `vi-VN-HoaiMyNeural`) có bộ nhớ đệm SHA-256 trên đĩa (`data/tts-cache`).

5. **An toàn, Đạo đức & Bảo mật Mặc định**:
   - Chỉ lắng nghe trên `127.0.0.1` theo mặc định; kiểm tra chặt chẽ `Host` (chống DNS Rebinding `421`), `Origin` (chống CSRF/CSWSH `403`), và xác thực `X-Admin-Token` (`401`).
   - **Không bao giờ** yêu cầu mật khẩu, cookie hay session ID của TikTok.
   - Minh bạch đạo đức: Điểm trong ứng dụng là **Điểm Tinh Tấn / Công Đức Ảo** phục vụ tương tác văn hóa; không cam kết phước báo siêu nhiên đổi lấy tiền hay quà tặng.

---

## 🛠️ Yêu cầu hệ thống (Windows)

- **Hệ điều hành**: Windows 10 / Windows 11 (64-bit).
- **Node.js**: Phiên bản **`v22.5+` hoặc `v24.x`** (dự án sử dụng module `node:sqlite` tích hợp sẵn trong nhân Node.js, không cần cài Visual Studio C++ Build Tools).
- **OBS Studio**: Phiên bản 29.0 trở lên (khuyến nghị OBS 30+).

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy trên Windows

Mở **PowerShell** tại thư mục gốc `e:\tiktok`:

```powershell
# 1. Cài đặt dependencies (an toàn, tắt lifecycle scripts bên thứ ba)
npm install --ignore-scripts

# 2. Biên dịch giao diện Overlay + Admin Dashboard và kiểm tra kiểu TypeScript
npm run build

# 3. Chạy bộ kiểm thử tự động (Unit + Integration + Security)
npm test

# 4. Khởi chạy Temple Live Studio Server (mặc định tại http://127.0.0.1:3000)
npm start
```

Khi khởi chạy, cửa sổ dòng lệnh sẽ hiển thị:
- **Overlay URL (1080×1920)**: `http://127.0.0.1:3000/overlay`
- **OBS Transparent Overlay URL**: `http://127.0.0.1:3000/overlay?obs=1&transparent=1&hud=minimal`
- **Admin Studio Dashboard URL**: `http://127.0.0.1:3000/admin` (đã tự động gắn khóa phiên quản trị cục bộ)

---

## 🎥 Hướng dẫn Tích hợp vào OBS Studio & TikTok LIVE Studio

### Cách 1: Dựng cảnh toàn màn hình dọc `1080×1920` (Khuyến nghị)
1. Trong **OBS Studio**, vào **Settings → Video**:
   - **Base (Canvas) Resolution**: `1080x1920`
   - **Output (Scaled) Resolution**: `1080x1920`
   - **Common FPS Values**: `60` (hoặc `30` nếu máy cấu hình thấp).
2. Trong mục **Sources**, nhấn **`+` → Browser**:
   - **URL**: `http://127.0.0.1:3000/overlay?obs=1`
   - **Width**: `1080`
   - **Height**: `1920`
   - Bật ✅ **Control audio via OBS** để điều chỉnh âm lượng chuông, mõ, nhạc thiền và giọng đọc TTS ngay trên Audio Mixer của OBS.
   - Bật ✅ **Refresh browser when scene becomes active**.

### Cách 2: Chế độ Nền Trong Suốt (Đặt đè lên Video quay sẵn / Unreal / Blender)
- Sử dụng URL: `http://127.0.0.1:3000/overlay?obs=1&transparent=1&hud=minimal`
- Bầu trời hậu cảnh sẽ được tắt hoàn toàn (`alpha = 0`), giữ nguyên tượng Phật, bàn thờ, nhân vật Phật tử, khói hương và thẻ nghi lễ để ghép lớp (compositing) mượt mà.

---

## 🧪 Các lệnh Kiểm thử Hiệu năng & Visual QA

```powershell
# Chạy kiểm thử tải đột biến (250 sự kiện & 1.000 sự kiện liên tiếp)
npm run sim:burst

# Chạy kiểm thử đồ họa tự động bằng trình duyệt headless & đo FPS thực tế
npm run qa:visual
```

---

## 📂 Tài liệu Kỹ thuật Chi tiết

- [Báo Cáo Sẵn Sàng Phát Sóng TikTok LIVE (`docs/LIVE_READINESS_REPORT.md`)](file:///e:/tiktok/docs/LIVE_READINESS_REPORT.md)
- [Thẩm Định Tính Chuẩn Xác Văn Hóa & Nghi Thức Việt Nam (`docs/CULTURAL_ACCURACY_REVIEW.md`)](file:///e:/tiktok/docs/CULTURAL_ACCURACY_REVIEW.md)
- [Báo Cáo So Sánh Nâng Cấp Mỹ Thuật 2.5D (`docs/VISUAL_COMPARISON.md`)](file:///e:/tiktok/docs/VISUAL_COMPARISON.md)
- [Báo cáo Kiểm toán 15 Repository Tham khảo (`docs/REPOSITORY_AUDIT.md`)](file:///e:/tiktok/docs/REPOSITORY_AUDIT.md)
- [Kiến trúc Hệ thống 10 Module (`docs/ARCHITECTURE.md`)](file:///e:/tiktok/docs/ARCHITECTURE.md)
- [Định hướng Mỹ thuật & Đồ họa 2.5D (`docs/ART_DIRECTION.md`)](file:///e:/tiktok/docs/ART_DIRECTION.md)
- [Ma trận Tính năng & Luật Sự kiện (`docs/FEATURE_MATRIX.md`)](file:///e:/tiktok/docs/FEATURE_MATRIX.md)
- [Đánh giá Bảo mật & Mô hình Mối đe dọa (`docs/SECURITY_REVIEW.md`)](file:///e:/tiktok/docs/SECURITY_REVIEW.md)
- [Báo cáo Kiểm thử, Benchmark & Visual QA (`docs/TEST_REPORT.md`)](file:///e:/tiktok/docs/TEST_REPORT.md)
- [Lộ trình Phát triển Tiếp theo (`docs/ROADMAP.md`)](file:///e:/tiktok/docs/ROADMAP.md)
