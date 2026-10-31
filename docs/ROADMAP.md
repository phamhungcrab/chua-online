# ROADMAP — TEMPLE LIVE STUDIO

## 1. Lộ Trình Thực Hiện Theo 6 Giai Đoạn (Phases 0–5)

| Phase | Tên giai đoạn | Mục tiêu cốt lõi | Trạng thái |
|---|---|---|---|
| **Phase 0** | **Research & Source Audit** | Kiểm toán 15 repository tham khảo từ mã nguồn thực tế, phân loại giấy phép (MIT vs AGPL-3.0 vs No License), nhận diện các rủi ro bảo mật/obfuscation và xác lập kiến trúc Clean-Room. | **HOÀN THÀNH** |
| **Phase 1** | **Foundation & Typed Contracts** | Thiết lập cấu trúc TypeScript modular, schema Zod, SQLite Persistence (`node:sqlite` WAL), bộ lọc kiểm duyệt tiếng Việt, `LruDeduplicator`, `GiftStreakTracker`, `TokenBucket`, `LikeBatchAggregator`, `RuleEngine` và `OfflineEventSimulator`. | **ĐANG TRIỂN KHAI & KIỂM THỬ** |
| **Phase 2** | **Visual Vertical Slice (2.5D Sanctuary)** | Xây dựng `ProceduralAtlas` & `TempleSceneEngine` (PixiJS v8 + Canvas 2D fallback) ở khung chuẩn `1080×1920`: kiến trúc gỗ sơn son thếp vàng, tôn tượng Phật A Di Đà & hào quang đa tầng, lư hương đỉnh đồng & khói trầm uốn lượn, 7 trạng thái nhân vật Phật tử depth-sorted, và các tương tác hoàn chỉnh từ sự kiện tới hoạt ảnh. | **ĐANG TRIỂN KHAI & KIỂM THỬ** |
| **Phase 3** | **Integration (TikTok, TTS, OBS, Admin)** | Tích hợp `TikTokLiveConnectorAdapter` (Exponential Backoff + Jitter + Stale-Socket Watchdog), hệ thống `PriorityTtsQueue` + Web Audio Synthesizer (Đại Hồng Chung, Mõ Gỗ, Nhạc thiền Auto-Ducking), chế độ OBS Browser Source (`?obs=1&transparent=1`) và Admin Studio Dashboard. | **ĐANG TRIỂN KHAI & KIỂM THỬ** |
| **Phase 4** | **Expansion (Rituals, Rules, Ambience)** | Mở rộng nghi thức Xin Xăm 18 quẻ văn hóa, Thả Đèn Hoa Đăng trên hồ sen, Bảng Vinh Danh & 6 Đệm Quỳ VIP, Nghi thức tụng kinh định kỳ, Đổi cảnh Ngày/Đêm/Thời tiết, Bình chọn qua Chat (Live Poll), Mục tiêu cộng đồng, Rule Editor & Import/Export JSON. | **ĐANG TRIỂN KHAI & KIỂM THỬ** |
| **Phase 5** | **Hardening, Load Testing & Visual QA** | Kiểm thử Unit & Integration (Vitest), kiểm thử Burst Stress (1.000+ sự kiện mô phỏng), đo đạc FPS / Frame Time / Memory / Latency thực tế trên trình duyệt headless và hoàn thiện báo cáo `docs/TEST_REPORT.md` + `README.md`. | **ĐANG TRIỂN KHAI & KIỂM THỬ** |

---

## 2. Định Hướng Mở Rộng Tiếp Theo (Post-v1.0)

1. **Custom Artist Sprite Pack Loader**: Công cụ đóng gói và kiểm tra tự động bộ sprite sheet PNG/WebP 4K do họa sĩ bên ngoài vẽ (kèm trình xem trước frame-by-frame ngay trên Dashboard).
2. **OBS WebSocket v5 Bidirectional Bridge**: Tự động chuyển cảnh OBS hoặc bật/tắt filter âm thanh trên OBS khi bắt đầu/kết thúc phiên LIVE.
3. **Multi-Scene Sanctuary Transitions**: Mở rộng thêm cảnh *Chùa Một Cột Đầu Xuân*, *Vườn Lâm Tỳ Ni*, và *Hồ Liên Hoa Đêm Rằm* có thể chuyển cảnh mượt theo sự kiện cộng đồng.
4. **Long-Haul Soak Runner CLI (`npm run test:soak`)**: Công cụ dòng lệnh chạy kiểm thử liên tục 2 giờ, 6 giờ và 12 giờ với báo cáo biểu đồ heap memory và độ trễ hàng đợi tự động xuất ra CSV/Markdown.
