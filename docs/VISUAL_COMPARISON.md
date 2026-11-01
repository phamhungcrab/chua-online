# SO SÁNH NÂNG CẤP ĐỒ HỌA 2.5D & MỸ THUẬT (VISUAL COMPARISON REPORT)
**Dự án:** Temple Live Studio — Vietnamese Lacquered Sanctuary · Cinematic Digital Heritage  
**Chuẩn khung hình:** 1080×1920 (Vertical 9:16 Cinematic Stage)  
**Ngày phát hành:** 01/11/2026  

---

## 1. SO SÁNH TOÀN DIỆN: PROTOTYPE BAN ĐẦU vs HIỆN TẠI

| Thành phần mỹ thuật | Bản Prototype Ban Đầu | Bản Nâng Cấp Hiện Tại (Lacquered Sanctuary) |
| :--- | :--- | :--- |
| **Định hướng mỹ thuật (Art Direction)** | Giao diện web phẳng, icon vector thô, hình khối procedural đơn điệu. | **Sơn Son Thếp Vàng Cổ Truyền** — Đậm đà bản sắc tự viện Việt Nam, sâu lắng u uẩn, vàng quỳ rực rỡ, bề mặt sơn mài thắm đượm. |
| **Kiến trúc Chánh Điện** | Khối hình chữ nhật đơn sắc, thiếu chi tiết gỗ và thiếu độ sâu không gian. | **Trục kiến trúc chuẩn mực:** Hoành phi sơn mài `ĐẠI HÙNG BẢO ĐIỆN`, cửa võng chạm sen, câu đối Hán Nôm & Quốc ngữ trên cột gỗ lim, sân chùa Tam Quan lát đá xanh và đèn đá hoa sen. |
| **Tôn Tượng Phật & Hào Quang** | Hình tròn màu vàng đơn giản, tĩnh lặng không nhịp thở. | **Tôn Tượng Phật A Di Đà** ngự tòa sen tam tầng, ngực mang chữ Vạn 卐 cát tường, vầng hào quang bánh xe chánh pháp 24 nan tia xoay êm ả và thở theo chu kỳ sinh học. |
| **Nhân vật Phật tử & Trang phục** | Hình người que/chấm tròn pixel thô sơ, chỉ có 1-2 kiểu dáng cơ bản. | **7 bộ trang phục truyền thống Việt Nam:** Áo lam cư sĩ, áo nâu sồng, cà-sa hoàng bào tăng ni, tiểu đồng, cụ bà trùm khăn nhung, hộ pháp thếp vàng; có giải phẫu tự nhiên, nếp vạt chéo, tràng hạt chuỗi bồ đề, 6 tư thế chuyển động mượt mà. |
| **Hàng đợi Nghi thức (Ceremony Queue)** | Ghi đè nhân vật đơn lẻ, nhiều tương tác liên tiếp khiến sprite va chạm hoặc biến mất đột ngột. | **State Machine tuần tự (Queue 8 vị):** Đi từ sân Tam Quan $\to$ đứng chắp tay búp sen $\to$ Đảnh Lễ Tam Bái (3 lạy sát đất) $\to$ dâng hoa/lễ vật với ánh hào quang $\to$ khoan thai lui về đạo tràng. Tuyệt đối không chồng hình. |
| **Khói trầm & Cánh hoa sen** | Hạt tròn đơn lẻ rơi thẳng đều, thiếu tính vật lý tự nhiên. | Khói trầm uốn lượn hình sin cuốn xoáy theo luồng nhiệt từ đỉnh đồng; cánh hoa sen hồng và lá vàng rơi chao lượn có gió thoảng, xoay 3D đa hướng. |
| **Tương thích TikTok 9:16 (Safe Zones)** | Không có chỉ dẫn safe zone, text và tượng thường bị nút bấm TikTok che khuất. | **Tích hợp TikTok Safe Zone Engine:** Tự động né vùng Header (0-140px), cụm nút bấm bên phải (920-1080px), và khay chat bình luận (1640-1920px); có chế độ hiển thị guideline để streamer căn chỉnh. |

---

## 2. BẢN ĐỒ 7 LỚP CHIỀU SÂU KHÔNG GIAN (7-LAYER DEPTH ARCHITECTURE)

```
[Layer 7 - Front HUD]        Bảng vàng Tinh Tấn · Pháp hội tương tác · Sổ Lời Nguyện ticker · Safe Zones
[Layer 6 - Atmosphere]       Khói trầm hương uốn lượn · Cánh hoa sen bay · Tia sáng vàng phát quang · Sóng âm chuông mõ
[Layer 5 - Foreground Pond]  Hồ Liên Hoa tiền cảnh (y=1755..1920) · Đèn hoa đăng trôi bồng bềnh mang tên người nguyện
[Layer 4 - Ceremony Aisle]   Thảm đỏ dẫn lễ trung tâm (y=1020..1720) · Phật tử đảnh lễ tam bái tuần tự
[Layer 3 - Congregation]     Lưới bồ đoàn phối cảnh hình thang · Chư tăng thiền định · Hàng ngũ Phật tử depth-sorted
[Layer 2 - Altar Platform]   Bàn thờ Tam Bảo sơn son · Đỉnh đồng lư hương Bách Thọ · Tôn tượng Đức Phật A Di Đà & Hào quang
[Layer 1 - Sanctuary Hall]   Vách chùa sơn mài · Đôi cột lim đại tự câu đối vàng · Cửa võng rèm gấm · Đèn lồng Hội An
```

---

## 3. CÁC CHẾ ĐỘ ÁNH SÁNG & KHÔNG GIAN (CINEMATIC AMBIENCE MODES)

Hệ thống hỗ trợ 4 chế độ ánh sáng điện ảnh (Cinematic Ambience) thay đổi theo thời khắc trong ngày hoặc sự kiện:

1. **SACRED NIGHT (Đêm Thiền Tịnh - Mặc định):**
   - Ánh đèn lồng ấm áp, vách sơn mài then sẫm huyền bí (`#0A0402`), hào quang Phật tỏa rạng ấm nồng như ánh trăng rằm, tạo cảm giác tĩnh tâm tuyệt đối cho các buổi phát sóng ban đêm.
2. **GOLDEN DUSK (Hoàng Hôn Vàng Son):**
   - Sắc hổ phách và hoàng hôn rực rỡ chiếu rọi qua rèm gấm, dát vàng lên từng nếp gỗ và tôn tượng.
3. **DAY SERENE (Ban Ngày Tịnh Minh):**
   - Ánh sáng tự nhiên trang nhã, trong trẻo, phù hợp cho các buổi khóa tu ban ngày hoặc cuối tuần.
4. **FESTIVAL GLOW (Đại Lễ Hoa Đăng):**
   - Ánh sáng vàng hồng rực rỡ, hàng chục đèn hoa đăng bừng sáng mặt hồ sen tiền cảnh, cánh hoa sen vàng rơi lộng lẫy kỷ niệm các ngày vía Phật đản, Vu Lan hay Rằm tháng Giêng.

---

## 4. BẰNG CHỨNG THỰC TẾ QUA ẢNH CHỤP CHẤT LƯỢNG CAO (VISUAL ARTIFACTS)

Toàn bộ ảnh chụp thực tế dưới đây được render tự động từ browser Microsoft Edge ở độ phân giải thực `1080×1920` (hoặc `1600×1000` cho Admin Dashboard) và lưu trữ trực tiếp trong thư mục `docs/screenshots/`:

| Tên ảnh chụp | Độ phân giải | Nội dung minh chứng |
| :--- | :--- | :--- |
| `overlay-1080x1920-night-ceremony.png` | 1080×1920 | Toàn cảnh Chánh Điện Đêm Tịnh Tâm: Tôn tượng Phật A Di Đà, câu đối cột lim, thảm đỏ dẫn lễ, bồ đoàn đạo tràng, lư hương bốc khói và lễ bái trang nghiêm. |
| `overlay-1080x1920-flower-offering.png` | 1080×1920 | Nghi thức Dâng Hoa Sen Cúng Phật: Phật tử dâng đóa sen tươi, hào quang kim liên tỏa rạng, sóng âm và banner cúng dường thanh tịnh. |
| `overlay-1080x1920-fortune-oracle.png` | 1080×1920 | Giao diện Quẻ Xăm Đầu Xuân với bài thơ cổ truyền, ý thơ chiêm nghiệm và lời giải thích văn hóa giải trí hướng thiện. |
| `overlay-1080x1920-dawn-petals.png` | 1080×1920 | Bầu không khí Hoàng Hôn Cánh Sen Vàng (Golden Dusk + Lotus Rain) rực rỡ, thanh cao. |
| `overlay-1080x1920-safezone.png` | 1080×1920 | Khung chỉ dẫn TikTok Safe Zones 9:16 (Top Header 140px, Right Action tray, Bottom Chat tray 280px) bao quanh vùng trung tâm Chánh Điện an toàn. |
| `overlay-obs-transparent.png` | 1080×1920 | Chế độ OBS nền trong suốt (`?transparent=1`) cho phép lồng ghép lớp nhân vật, bàn thờ và hoa đăng lên video quay thực tế cảnh chùa thật. |
| `admin-dashboard-1600x1000.png` | 1600×1000 | Bảng điều khiển Studio hoàn chỉnh: Xem trước 9:16 thời gian thực, nút kiểm tra TikTok Live, thanh gạt ánh sáng, mixer âm thanh, telemetry và Sổ Lời Nguyện. |

---
*Báo cáo so sánh mỹ thuật hoàn tất bởi Ban Chỉ đạo Nghệ thuật Temple Live Studio.*
