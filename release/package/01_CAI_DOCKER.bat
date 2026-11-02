@echo off
chcp 65001 >nul
title Cài Đặt Docker Desktop — Temple Live Studio
cls

cd /d "%~dp0"

echo ======================================================================
echo 🪷 TEMPLE LIVE STUDIO — KIỂM TRA & CÀI ĐẶT DOCKER DESKTOP
echo ======================================================================
echo.

:: 1. Kiểm tra kiến trúc hệ điều hành (Bắt buộc Windows x64 / AMD64)
if not "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    if not "%PROCESSOR_ARCHITEW6432%"=="AMD64" (
        echo [LỖI] Hệ thống của bạn không phải là Windows 64-bit (x64).
        echo Temple Live Studio yêu cầu Windows 10/11 64-bit để vận hành Docker.
        echo.
        pause
        exit /b 1
    )
)
echo [1/3] Kiểm tra kiến trúc Windows: x64 [HỢP LỆ]

:: 2. Kiểm tra xem Docker CLI và Docker Desktop đã được cài đặt chưa
where docker >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [2/3] Kiểm tra Docker Desktop: ĐÃ CÀI ĐẶT
    docker --version
    echo.
    echo ======================================================================
    echo  CHÚC MỪNG! Máy tính của bạn ĐÃ SẴN SÀNG để chạy Temple Live Studio.
    echo  Bạn KHÔNG CẦN cài đặt lại Docker Desktop.
    echo  Bước tiếp theo: Nhấp đúp file '02_START_CHUA.bat' để bắt đầu!
    echo ======================================================================
    echo.
    pause
    exit /b 0
)

:: Kiểm tra thêm đường dẫn cài đặt mặc định nếu chưa có trong PATH
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    echo [2/3] Kiểm tra Docker Desktop: Tìm thấy tại %ProgramFiles%\Docker\Docker
    echo.
    echo ======================================================================
    echo  Docker Desktop đã có sẵn trên máy của bạn!
    echo  Bạn chỉ cần nhấp đúp file '02_START_CHUA.bat' để khởi chạy.
    echo ======================================================================
    echo.
    pause
    exit /b 0
)

echo [2/3] Kiểm tra Docker Desktop: CHƯA CÀI ĐẶT TRÊN MÁY
echo.
echo ----------------------------------------------------------------------
echo Temple Live Studio chạy trên nền tảng Docker Container nhẹ, an toàn,
echo giúp hệ thống ổn định 100%%, không xung đột phần mềm và không lo lỗi file.
echo ----------------------------------------------------------------------
echo.

:: 3. Kiểm tra xem Windows Package Manager (winget) có sẵn không
where winget >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Máy tính của bạn hỗ trợ cài đặt tự động qua Windows Package Manager.
    echo.
    echo Vui lòng chọn cách cài đặt Docker Desktop:
    echo   [1] Tự động cài đặt Docker Desktop qua Winget (Khuyên dùng)
    echo   [2] Mở trình duyệt tải bộ cài chính thức từ Docker.com
    echo   [3] Thoát
    echo.
    set /p USER_CHOICE="Nhập lựa chọn của bạn (1, 2 hoặc 3): "

    if "%USER_CHOICE%"=="1" (
        echo.
        echo Đang tiến hành cài đặt Docker Desktop...
        echo (Nếu xuất hiện bảng thông báo màu vàng của Windows UAC, vui lòng chọn YES để đồng ý)
        echo.
        winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
        echo.
        echo ======================================================================
        echo  LƯU Ý QUAN TRỌNG:
        echo  Sau khi cài xong Docker Desktop, nếu Windows yêu cầu Khởi động lại (Restart),
        echo  vui lòng khởi động lại máy tính. Sau đó nhấp đúp file '02_START_CHUA.bat'.
        echo ======================================================================
        echo.
        pause
        exit /b 0
    ) else if "%USER_CHOICE%"=="2" (
        echo.
        echo Đang mở trang tải chính thức của Docker Desktop...
        start https://docs.docker.com/desktop/setup/install/windows-install/
        echo.
        echo Vui lòng tải file cài đặt "Docker Desktop for Windows - x86_64",
        echo nhấp đúp file đã tải để cài đặt, sau đó chạy '02_START_CHUA.bat'.
        echo.
        pause
        exit /b 0
    ) else (
        echo Đã hủy cài đặt.
        exit /b 0
    )
) else (
    echo Đang mở trang web chính thức để bạn tải Docker Desktop...
    start https://docs.docker.com/desktop/setup/install/windows-install/
    echo.
    echo Hướng dẫn:
    echo 1. Tải file "Docker Desktop Installer.exe" từ trang web vừa mở.
    echo 2. Nhấp đúp file cài đặt, giữ nguyên tùy chọn WSL2 và bấm OK.
    echo 3. Sau khi cài xong (và khởi động lại máy nếu Windows yêu cầu),
    echo    bạn chỉ cần nhấp đúp file '02_START_CHUA.bat' để sử dụng!
    echo.
    pause
    exit /b 0
)
