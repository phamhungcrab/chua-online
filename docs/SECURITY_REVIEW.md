# SECURITY REVIEW — TEMPLE LIVE STUDIO

## 1. Mô Hình Mối Đe Dọa (Threat Model)

Một hệ thống phát livestream cục bộ kết nối với nguồn sự kiện công cộng (TikTok LIVE chat/gifts) và mở cổng HTTP/WebSocket cho OBS Browser Source đối mặt với 5 nhóm rủi ro chính:

1. **Tấn công từ trang web bên ngoài vào localhost (DNS Rebinding / Cross-Site WebSocket Hijacking / CSRF)**: Người phát live mở một trang web độc hại trên trình duyệt cùng máy tính; trang đó cố gắng gọi `http://localhost:3000` hoặc `ws://localhost:3000/ws` để chiếm quyền điều khiển chánh điện.
2. **Tấn công qua dữ liệu người xem TikTok (Stored/Reflected XSS, Unicode Rendering DoS, TTS Injection)**: Người xem đặt tên hoặc bình luận chứa mã `<script>`, `<img onerror=...>`, chuỗi Zalgo hàng nghìn dấu thanh, ký tự Cuneiform làm treo bộ dựng phông chữ, hoặc văn bản lừa đảo/thô tục để hệ thống đọc lên sóng LIVE.
3. **Tấn công Lộ File Hệ Thống (Path Traversal / Symlink Escape)**: Truy vấn đường dẫn tĩnh chứa `../`, `%2e%2e`, hoặc byte rỗng `\0` để đọc mã nguồn máy chủ hoặc file nhạy cảm.
4. **Tấn công Làm Nghẽn Dịch Vụ Cục Bộ (Event Flood / Memory Exhaustion)**: Phòng LIVE đột ngột có hàng trăm bình luận/lượt thả tim mỗi giây làm tràn hàng đợi TTS, rò rỉ bộ nhớ hoặc treo OBS.
5. **Rủi ro Lộ Thông Tin Xác Thực & Quyền Hệ Thống**: Yêu cầu cookie/session TikTok trái phép, hard-code khóa API/mật khẩu OBS, hoặc chạy script `.bat`/`.ps1` can thiệp hệ thống.

---

## 2. Các Biện Pháp Kiểm Soát Bảo Mật Đã Triển Khai (VERIFIED Controls)

### 2.1. Mạng & Phân Quyền Truy Cập (Network & Access Control)
- **Bind chặt `127.0.0.1` mặc định**: Máy chủ HTTP/WebSocket mặc định chỉ lắng nghe trên giao diện loopback `127.0.0.1` (`DEFAULT_HOST = '127.0.0.1'`), không mở ra mạng LAN hay Internet (`0.0.0.0`).
- **Kiểm tra Header `Host` (Chống DNS Rebinding)**: Mọi request HTTP và nâng cấp WebSocket đều phải có header `Host` khớp danh sách cho phép (`localhost:<port>`, `127.0.0.1:<port>`, `[::1]:<port>`). Nếu không khớp sẽ bị từ chối ngay với mã `421 Misdirected Request`.
- **Kiểm tra `Origin` trên REST & WebSocket**:
  - Các kết nối có gửi `Origin` bắt buộc phải xuất phát từ cùng host hợp lệ (`http://localhost:<port>` hoặc `http://127.0.0.1:<port>`).
  - Các client không phải trình duyệt (như OBS Browser Source trong một số chế độ nội bộ không gửi `Origin`) chỉ được phép kết nối ở vai trò `overlay` (chỉ đọc) trừ khi cung cấp Admin Token hợp lệ.
- **Xác thực Admin Dashboard & Phân tách Vai trò (`overlay` vs `admin`)**:
  - Kết nối WebSocket của `/overlay` (`?role=overlay`) là **chỉ đọc (Read-Only)**: máy chủ bỏ qua hoàn toàn mọi gói tin điều khiển gửi từ socket `overlay`.
  - Các thao tác quản trị (`POST /api/admin/*` và lệnh điều khiển qua WebSocket `role=admin`) được bảo vệ bởi **Session Admin Token** sinh ngẫu nhiên bằng `crypto.randomBytes(24)` (hoặc cấu hình qua biến môi trường `TEMPLE_ADMIN_TOKEN`), kết hợp phiên làm việc cục bộ trên trang `/admin`.

### 2.2. Xác Thực Dữ Liệu Đầu Vào, Chống XSS & Kiểm Duyệt Nội Dung
- **Xác thực Schema bằng Zod**: Toàn bộ body JSON gửi tới REST API và WebSocket RPC đều được kiểm tra kiểu, miền giá trị và chiều dài qua schema Zod (`src/shared/schemas.ts`), giới hạn kích thước payload tối đa `64 KB` cho WebSocket và `256 KB` cho HTTP JSON.
- **Chống XSS tuyệt đối**:
  - Trên Canvas/PixiJS: Văn bản chỉ được vẽ qua `PIXI.Text` / `ctx.fillText()`.
  - Trên DOM (HUD & Admin Dashboard): Chỉ sử dụng `textContent` hoặc hàm `escapeHtml()` chuẩn hóa 5 ký tự (`&`, `<`, `>`, `"`, `'`), không bao giờ nối trực tiếp tên/bình luận người xem vào `innerHTML`.
  - Header bảo mật HTTP được đính kèm trên mọi phản hồi:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: SAMEORIGIN`
    - `Referrer-Policy: no-referrer`
    - `Content-Security-Policy` chặt chẽ cho cả Overlay và Admin.
- **Kiểm duyệt Tiếng Việt & Lọc Unicode Độc hại (`src/server/router/moderation.ts`)**:
  - Loại bỏ ký tự điều khiển, chuỗi Zalgo (`[\u0300-\u036F]{3,}`), khối chữ hình nêm Cuneiform (`\u{12000}-\u{1254F}`), Braille, và ký tự lặp quá mức.
  - Chuẩn hóa tiếng Việt về chuẩn `NFC` để hiển thị dấu thanh đồng nhất và so khớp bộ lọc từ cấm chính xác.

### 2.3. Chống Path Traversal & Command Injection
- **Phục vụ file tĩnh an toàn**:
  - Chặn byte rỗng `\0`, chặn mọi phân đoạn đường dẫn bắt đầu bằng dấu chấm (`.env`, `.git`, `.sqlite`) và chỉ phục vụ các thư mục tĩnh được phép (`dist/client`, `public`, và thư mục cache âm thanh `/tts-cache` chỉ cho phép định dạng `.mp3`/`.wav`).
  - Kiểm tra cả `path.resolve` lẫn `fs.realpathSync` kết hợp `path.relative` để đảm bảo đường dẫn thực tế không bao giờ thoát khỏi thư mục gốc được phép.
- **Không dùng `child_process.exec` / Shell**:
  - Dự án không gọi bất kỳ lệnh shell nào với dữ liệu người dùng. Việc tổng hợp giọng đọc sử dụng thư viện thuần JS/WebSocket (`msedge-tts`) hoặc Web Audio API trên trình duyệt.

### 2.4. Bảo Vệ Tài Khoản TikTok & Tuân Thủ Đạo Đức
- **Không bao giờ yêu cầu hoặc lưu trữ mật khẩu, cookie hay session TikTok**: Hệ thống chỉ đọc luồng sự kiện công khai của phòng LIVE thông qua `@uniqueId`.
- **Không hard-code bí mật**: Mọi cấu hình nhạy cảm tùy chọn (như `EULER_SIGN_API_KEY` hoặc `TEMPLE_ADMIN_TOKEN`) đều đọc từ biến môi trường và không bao giờ xuất hiện trong gói tin gửi xuống `overlay`.
- **Minh bạch Đạo đức**: Hiển thị rõ ràng rằng điểm tương tác trong ứng dụng là điểm ảo giải trí văn hóa, không phải quyên góp tài chính và không gắn với cam kết phước báu.
