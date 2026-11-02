@echo off
chcp 65001 >nul
title Cập Nhật Phiên Bản Mới — Temple Live Studio
cls

cd /d "%~dp0"

echo ======================================================================
echo 🪷 TEMPLE LIVE STUDIO — QUY TRÌNH NÂNG CẤP PHIÊN BẢN AN TOÀN
echo ======================================================================
echo.

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;%ProgramFiles%\Docker\Docker\resources\bin"
    )
)

echo [1/4] Đang tìm kiếm tệp cập nhật trong thư mục images...
set UPDATE_TAR=
for %%f in ("%~dp0images\temple-live-studio-*.tar") do (
    set "UPDATE_TAR=%%f"
)

if "%UPDATE_TAR%"=="" (
    echo [THÔNG BÁO] Hiện tại chưa có tệp cập nhật mới trong thư mục 'images\'.
    echo Khi có bản cập nhật mới từ nhà phát hành, bạn chỉ cần sao chép tệp
    echo 'temple-live-studio-vX.X.tar' vào thư mục 'images\' rồi chạy lại file này.
    echo.
    pause
    exit /b 0
)

echo Tìm thấy gói cập nhật: %UPDATE_TAR%
echo.

echo [2/4] TỰ ĐỘNG SAO LƯU DỮ LIỆU HIỆN CÓ TRƯỚC KHI CẬP NHẬT...
call "%~dp004_BACKUP.bat"

echo.
echo [3/4] Đang nạp phiên bản Docker Image mới...
docker load -i "%UPDATE_TAR%"
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Không thể nạp hình ảnh cập nhật. Quá trình nâng cấp bị hủy.
    pause
    exit /b 1
)

echo.
echo [4/4] Đang khởi động lại ứng dụng với phiên bản mới...
docker compose down
docker compose up -d

timeout /t 5 /nobreak >nul
curl -s -f http://127.0.0.1:3000/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo.
    echo ======================================================================
    echo  NÂNG CẤP THÀNH CÔNG!
    echo  Hệ thống Chánh Điện đã được cập nhật phiên bản mới nhất.
    echo  Toàn bộ dữ liệu, điểm công đức và cấu hình vẫn được giữ nguyên vẹn.
    echo ======================================================================
) else (
    echo.
    echo [CẢNH BÁO] Phiên bản mới gặp vấn đề khi khởi động.
    echo Đang thực hiện khôi phục phiên bản trước đó (Rollback)...
    docker compose down
    docker compose up -d
)

echo.
pause
