# ART DIRECTION — TEMPLE LIVE STUDIO (CHÁNH ĐIỆN VIỆT NAM 2.5D)

## 1. Triết Lý Thẩm Mỹ & Ngôn Ngữ Thiết Kế: "Sơn Mài Vàng Son & Ánh Nến Chánh Điện"

Thay vì giao diện dashboard web phẳng thông thường, **Temple Live Studio** lấy cảm hứng từ nghệ thuật **Sơn Mài Truyền Thống Việt Nam (Vietnamese Lacquerware — Sơn Son Thếji Vàng)** kết hợp kiến trúc gỗ **Chùa Việt Cổ (Lim, Hoàng Đàn, Hoành Phi Câu Đối, Đèn Lồng Lụa Hội An, Hoa Sen Đồng)**.

- **Tỷ lệ khung hình gốc**: `1080 × 1920` (9:16 Dọc — ưu tiên tuyệt đối cho màn hình điện thoại TikTok LIVE), tự động co giãn mượt theo mọi kích thước cửa sổ và OBS Browser Source.
- **Đẹp tĩnh tại ngay cả khi không có sự kiện**: Khi phòng LIVE yên tĩnh, người xem vẫn cảm nhận được không gian thiền định sống động nhờ:
  - Hào quang kim sắc phía sau tôn tượng Đức Phật A Di Đà chuyển động nhịp thở êm dịu.
  - Khói trầm hương uốn lượn tự nhiên từ Lư Hương Đỉnh Đồng bay lên.
  - Ánh nến lung linh ấm áp phản chiếu xuống sàn gỗ và mặt thảm đỏ.
  - Cánh hoa sen hồng/vàng và các hạt bụi sáng lơ lửng chậm rãi trong không gian.
  - Các nhân vật Phật tử ngồi thiền trên bồ đoàn có nhịp thở nhẹ nhàng.

---

## 2. Bảng Màu Chuẩn (Color Palette)

| Vai trò | Tên màu | Mã Hex | Mô tả ứng dụng |
|---|---|---|---|
| **Hậu cảnh sâu** | Nâu Gỗ Mun / Sơn Mài Đêm | `#0B0503` → `#1B0B06` | Nền hậu cảnh chánh điện, tạo độ tương phản sâu cho ánh sáng vàng và khói hương. |
| **Kiến trúc gỗ & Cột lim** | Đỏ Nâu Cánh Gián / Sơn Son | `#3A120A` → `#5E1B10` | Cột gỗ lim, xà ngang, bàn thờ Tam Bảo, khung bảng hoành phi. |
| **Điểm nhấn Hoàng Kim** | Vàng Lá Thếp (Imperial Gold) | `#E5B85B` / `#FFD982` | Tôn tượng Phật, đường viền sơn mài, chữ hoành phi, huy hiệu VIP. |
| **Ánh sáng Linh Thiêng** | Vàng Hổ Phách Ấm (Warm Amber) | `#FFB347` / `#FFF3C4` | Hào quang Phật, ngọn đèn lưu ly, đốm lửa đầu nén nhang. |
| **Hoa Sen & Từ Bi** | Hồng Liên Hoa (Lotus Rose) | `#F48FB1` / `#FCE4EC` | Đài sen, cánh hoa sen rơi, đèn hoa đăng cầu nguyện. |
| **Ngọc Bích Tịnh Tâm** | Xanh Ngọc Lưu Ly (Jade Accent) | `#4DB6AC` / `#80CBC4` | Nhãn trạng thái kết nối, bình cam lộ, chỉ báo thanh tịnh. |
| **Văn bản Chính** | Trắng Ngà Giấy Dó (Warm Parchment) | `#F8ECD6` | Tên Phật tử, lời cầu nguyện, thơ quẻ xăm (độ tương phản WCAG AAA trên nền tối). |
| **Văn bản Phụ** | Vàng Đồng Trầm (Muted Bronze) | `#C9AC82` | Nhãn phụ, bộ đếm thời gian, chú thích. |

---

## 3. Typography Tiếng Việt (Chuẩn Dấu & Dễ Đọc Trên Điện Thoại)

- **Phông chữ Tiêu đề / Hoành phi / Quẻ xăm (`--font-display`)**:
  - `"Noto Serif"`, `"Playfair Display"`, `Georgia`, `serif` — hỗ trợ đầy đủ 100% dấu thanh và ký tự tiếng Việt (`Ấ, Ầ, Ẩ, Ẫ, Ậ, Ắ, Ằ, Ẳ, Ẵ, Ặ, Đ, Ơ, Ư`), nét chữ trang nghiêm, cổ kính.
- **Phông chữ Giao diện / Thẻ tên / Bình luận (`--font-body`)**:
  - `"Be Vietnam Pro"`, `"Segoe UI"`, `system-ui`, `sans-serif` — được thiết kế chuyên biệt cho tiếng Việt, rõ nét ngay cả ở kích thước nhỏ trên màn hình điện thoại nén qua luồng video H.264 của TikTok.
- **Phông chữ Số liệu / Bộ đếm (`--font-mono`)**:
  - `font-variant-numeric: tabular-nums` trên `"Be Vietnam Pro"` hoặc `"JetBrains Mono"`, giúp các con số công đức, thời gian và FPS không bị giật ngang khi thay đổi.

---

## 4. Phân Lớp Không Gian 2.5D (7-Layer Depth Composition trên Khung 1080×1920)

```
+-----------------------------------------------------------------------+  y = 0
| [Lớp 7 - HUD Top] Hoành Phi "CHÁNH ĐIỆN TỊNH TÂM" & Thanh Trạng Thái  |
|-----------------------------------------------------------------------|  y = 220
| [Lớp 1 & 2] Kiến Trúc Gỗ Lim, Rèm Gấm Đỏ, Cửa Võng Chạm Rồng Phượng   |
| [Lớp 3] Tôn Tượng Đức Phật A Di Đà Ngự Đài Sen + Hào Quang Đa Tầng    |  y = 240..780
|         + Đôi Đèn Lồng Hội An + Bình Hoa Sen Vàng + Đĩa Ngũ Quả       |
|-----------------------------------------------------------------------|  y = 780..960
| [Lớp 4] Bàn Thờ Tam Bảo + Lư Hương Đỉnh Đồng (x=540, y=880)           |
|         + Đại Hồng Chung (Phải) + Mõ Gỗ Tụng Kinh (Trái)              |
|         + Khói Trầm Hương Uốn Lượn Tự Nhiên Bay Lên                   |
|-----------------------------------------------------------------------|  y = 960..1180
| [Lớp 5A] Bục Tam Bảo: Sư Trụ Trì (Giữa) & 2 Vị Tăng + 6 Đệm Quỳ VIP   |
|-----------------------------------------------------------------------|  y = 1180..1760
| [Lớp 5B] Thảm Đỏ Trung Tâm & Lưới Bồ Đoàn Hình Thang (24/36/64/100)   |
|          Nhân Vật Phật Tử 2D (Depth-Sorted theo Y)                    |
|          Đi bộ -> Quỳ -> Chắp tay -> Đảnh lễ Tam Bái -> Ngồi thiền    |
|-----------------------------------------------------------------------|  y = 1760..1920
| [Lớp 6] Tiền Cảnh Hồ Sen Đêm, Đèn Hoa Đăng Trôi & Thông Báo Pháp Bảo  |
+-----------------------------------------------------------------------+  y = 1920
```

---

## 5. Đặc Tả Nhân Vật 2D, Trạng Thái & Minh Bạch Về Asset

### 5.1. Hệ thống trang phục (Character Skins)
Hỗ trợ 7 hình tướng Phật tử truyền thống:
1. `lam_female` (Phật tử nữ áo lam truyền thống)
2. `lam_male` (Phật tử nam áo lam truyền thống)
3. `brown_elder` (Cụ bà / Phật tử áo nâu sồng)
4. `monk` (Tăng sĩ áo vàng nhật bình)
5. `nun` (Ni sư áo nâu/vàng)
6. `child` (Chú tiểu / Em bé chắp tay)
7. `master_vip` (Thí chủ hộ pháp — áo lam viền kim tuyến & tọa cụ sen vàng)

### 5.2. Máy trạng thái chuyển động (7-State Character Animation FSM)
Mỗi nhân vật trong `CharacterActor` vận hành qua máy trạng thái mượt mà:
1. `APPEAR`: Xuất hiện ở cổng tam quan phía dưới (`y = 1900`), hiệu ứng fade-in + hào quang nhẹ.
2. `WALK`: Bước đi dọc lối thảm đỏ hướng về vị trí bồ đoàn hoặc lên trước Lư Hương (xen kẽ nhịp chân, bóng đổ co giãn dưới chân, tỷ lệ phối cảnh `scale` thu nhỏ dần khi tiến về phía bàn thờ).
3. `KNEEL_DOWN`: Hạ gối xuống đệm bồ đoàn.
4. `PRAY_HANDS`: Chắp tay trước ngực / đưa lên trán khi dâng lời cầu nguyện hoặc khi có bong bóng chat.
5. `PROSTRATE_BOW`: Nghi thức cúi lạy (Đảnh lễ Tam Bái: Chắp tay trán → Nghiêng 45° → Ngũ thể đầu địa sát chiếu → Ngẩng lên).
6. `SIT_MEDITATE`: Ngồi kiết già tĩnh tọa trên bồ đoàn, lồng ngực nhịp thở điều hòa theo hàm sin lệch pha (`Math.sin(t * 1.2 + phase)`).
7. `LEAVE`: Chắp tay xá chào, đứng dậy và mờ dần khi rời chánh điện.

### 5.3. Minh bạch về Procedural Art Atlas & Khả năng Thay thế Asset
- Toàn bộ kiến trúc chánh điện, tôn tượng Phật A Di Đà, đài sen, lư hương đồng, đại hồng chung, mõ gỗ, đèn hoa đăng và các frame nhân vật mặc định được dựng bằng **Clean-Room Procedural High-DPI Texture Baker (`ProceduralAtlas.ts`)** kết xuất trực tiếp ra GPU `PIXI.Texture` / Offscreen Canvas ở độ phân giải cao.
- **Minh bạch**: Đây là hệ thống đồ họa vector/procedural nguyên bản 100% có bản quyền sạch (MIT) được thiết kế chuyên biệt cho dự án. Ngoài ra, hệ thống hỗ trợ nạp các file ảnh PNG/WebP hoặc Sprite Sheet bên ngoài qua bảng cấu hình `/assets/custom-manifest.json` để họa sĩ có thể thay thế từng lớp (`buddha`, `altar`, `censer`, `character_sheets`) mà không cần sửa code.

---

## 6. Ngân Sách Hiệu Năng (Performance Budget) & Quality Presets

| Thiết lập | `LOW` (Máy yếu / Laptop iGPU) | `MEDIUM` (Mặc định OBS) | `HIGH` (PC Streaming rời) |
|---|---|---|---|
| **Mục tiêu FPS** | 30 FPS (khóa nhịp) | 60 FPS (tự giảm về 30 khi quá tải) | 60 FPS |
| **Hạt khói hương (Pooled)** | Tối đa 16 hạt | Tối đa 36 hạt | Tối đa 64 hạt |
| **Cánh hoa sen & Bụi vàng** | 12 hạt | 32 hạt | 64 hạt |
| **Đèn hoa đăng nổi** | Tối đa 6 đèn | Tối đa 14 đèn | Tối đa 24 đèn |
| **Ánh sáng & Phản chiếu** | Tĩnh + Hào quang cơ bản | Hào quang nhịp thở + Nến lung linh | Đầy đủ tia sáng (God-rays) + Phản chiếu mặt nước |
| **Object Allocation trong Frame Loop** | **0 đối tượng mới/frame** (Object Pooling + Pre-baked Textures) | **0 đối tượng mới/frame** | **0 đối tượng mới/frame** |
