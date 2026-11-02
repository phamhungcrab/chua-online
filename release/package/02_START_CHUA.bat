@echo off
chcp 65001 >nul
title Khởi Động Temple Live Studio — Chánh Điện Online 2.5D
cls

:: Chuyển đến thư mục chứa file BAT bất kể ký tự tiếng Việt hay khoảng trắng
cd /d "%~dp0"

echo ======================================================================
echo 🪷 TEMPLE LIVE STUDIO — HỆ THỐNG CHÁNH ĐIỆN VIỆT NAM 2.5D
echo ======================================================================
echo.

:: 1. Kiểm tra Docker CLI trong PATH hoặc trong thư mục chuẩn
where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;%ProgramFiles%\Docker\Docker\resources\bin"
    ) else (
        echo [LỖI] Không tìm thấy Docker trên máy tính của bạn.
        echo Vui lòng chạy file '01_CAI_DOCKER.bat' trước để cài đặt Docker Desktop.
        echo.
        pause
        exit /b 1
    )
)

:: 2. Kiểm tra xem Docker Engine đã hoạt động chưa
echo [1/4] Đang kiểm tra trạng thái Docker Engine...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker Desktop chưa khởi động. Đang tự động mở Docker Desktop...
    if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
        start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    )
    echo Đang chờ Docker Engine sẵn sàng (quá trình này có thể mất 20 - 45 giây)...
    set /a DOCKER_WAIT_COUNT=0

    :WAIT_FOR_DOCKER
    timeout /t 3 /nobreak >nul
    set /a DOCKER_WAIT_COUNT+=3
    docker info >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        goto DOCKER_ENGINE_READY
    )
    if %DOCKER_WAIT_COUNT% geq 90 (
        echo.
        echo [LỖI] Đã quá 90 giây nhưng Docker Engine vẫn chưa sẵn sàng.
        echo Hướng dẫn xử lý:
        echo 1. Hãy kiểm tra khay hệ thống (góc dưới bên phải màn hình Windows).
        echo 2. Nhấp vào biểu tượng chú cá voi Docker Desktop để xem Docker đã khởi động xong chưa.
        echo 3. Sau khi Docker hiện chữ 'Engine running' màu xanh, hãy nhấp đúp lại file '02_START_CHUA.bat'.
        echo.
        pause
        exit /b 1
    )
    <nul set /p=.
    goto WAIT_FOR_DOCKER
)

:DOCKER_ENGINE_READY
echo.
echo [1/4] Docker Engine: ĐÃ SẴN SÀNG

:: 3. Kiểm tra xem image Chùa đã được nạp vào Docker chưa
echo [2/4] Đang kiểm tra Docker Image 'temple-live-studio:v1.0.1'...
docker image inspect temple-live-studio:v1.0.1 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%~dp0images\temple-live-studio-v1.0.1.tar" (
        echo Đang nạp Docker image từ bộ cài (chỉ thực hiện 1 lần duy nhất, khoảng 15-20 giây)...
        docker load -i "%~dp0images\temple-live-studio-v1.0.1.tar"
        if %ERRORLEVEL% neq 0 (
            echo [LỖI] Không thể nạp Docker image. Vui lòng kiểm tra dung lượng ổ đĩa.
            pause
            exit /b 1
        )
        echo [NẠP THÀNH CÔNG] Docker image đã sẵn sàng.
    ) else if exist "%~dp0images\temple-live-studio-v1.0.tar" (
        echo Đang nạp Docker image v1.0 dự phòng...
        docker load -i "%~dp0images\temple-live-studio-v1.0.tar"
    ) else (
        echo [LỖI] Không tìm thấy file '%~dp0images\temple-live-studio-v1.0.1.tar'.
        echo Vui lòng đảm bảo bạn đã giải nén đầy đủ thư mục của bộ cài.
        pause
        exit /b 1
    )
) else (
    echo [2/4] Docker Image: ĐÃ CÓ SẴN (Bỏ qua bước nạp file)
)

:: 4. Kiểm tra xem hệ thống đã đang chạy chưa để tránh mở trùng
for /f "tokens=*" %%i in ('docker compose ps -q --filter "status=running" 2^>nul') do set RUNNING_ID=%%i
if not "%RUNNING_ID%"=="" (
    echo.
    echo [THÔNG BÁO] Hệ thống Chánh Điện Online ĐÃ ĐANG CHẠY!
    echo Đang tự động mở Bảng Điều Khiển Admin...
    timeout /t 2 /nobreak >nul
    start http://127.0.0.1:3000/admin
    goto PRINT_SUCCESS_INFO
)

:: 5. Khởi động container bằng Docker Compose ở chế độ nền (-d)
echo [3/4] Đang khởi động Chánh Điện Online trong container an toàn...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Không thể khởi động container bằng Docker Compose.
    echo Vui lòng chạy file '05_XEM_LOI.bat' để xem chi tiết nguyên nhân.
    pause
    exit /b 1
)

:: 6. Đợi cho đến khi API /api/health trả về HTTP 200 lành mạnh
echo [4/4] Đang xác thực dịch vụ và kết nối WebSocket Chánh Điện...
set /a HEALTH_WAIT=0
:WAIT_HEALTH
timeout /t 2 /nobreak >nul
set /a HEALTH_WAIT+=2
curl -s -f http://127.0.0.1:3000/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 goto LAUNCH_BROWSER
if %HEALTH_WAIT% geq 40 (
    echo.
    echo [CẢNH BÁO] Dịch vụ mất nhiều thời gian hơn bình thường để phản hồi.
    echo Hãy mở trình duyệt và thử truy cập http://127.0.0.1:3000/admin.
    goto LAUNCH_BROWSER
)
<nul set /p=.
goto WAIT_HEALTH

:LAUNCH_BROWSER
echo.
echo [4/4] Kiểm tra kết nối: HOÀN TẤT (HTTP 200 OK)
timeout /t 1 /nobreak >nul
start http://127.0.0.1:3000/admin

:PRINT_SUCCESS_INFO
echo.
echo ======================================================================
echo 🪷 KHỞI ĐỘNG THÀNH CÔNG! CHÁNH ĐIỆN ONLINE ĐÃ SẴN SÀNG HOẠT ĐỘNG
echo ======================================================================
echo.
echo  🎛️  Bảng Điều Khiển Admin:   http://127.0.0.1:3000/admin
echo  📺  Nguồn Overlay Cho OBS:   http://127.0.0.1:3000/overlay
echo  🪟  Overlay Nền Trong Suốt:  http://127.0.0.1:3000/overlay?obs=1^&transparent=1
echo.
echo  💡 Hướng dẫn nhanh cho OBS Studio:
echo     1. Thêm nguồn 'Browser' (Trình duyệt) vào OBS.
echo     2. Dán link: http://127.0.0.1:3000/overlay
echo     3. Kích thước đặt đúng: 1080 x 1920 (chuẩn dọc TikTok).
echo     4. Tích chọn: 'Control audio via OBS' (Điều khiển âm thanh qua OBS).
echo.
echo  💡 Khi muốn dừng hệ thống: Nhấp đúp file '03_STOP_CHUA.bat'.
echo ======================================================================
echo.
pause
