@echo off
chcp 65001 >nul
title Dừng Temple Live Studio
cls

cd /d "%~dp0"

echo ======================================================================
echo 🪷 TEMPLE LIVE STUDIO — DỪNG DỊCH VỤ CHÁNH ĐIỆN ONLINE
echo ======================================================================
echo.

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;%ProgramFiles%\Docker\Docker\resources\bin"
    )
)

echo Đang dừng container an toàn và lưu trạng thái vào SQLite...
docker compose stop

echo.
echo ======================================================================
echo  ĐÃ DỪNG HỆ THỐNG THÀNH CÔNG!
echo  - Toàn bộ dữ liệu, điểm công đức, file nhạc và cấu hình ĐƯỢC BẢO TOÀN.
echo  - OBS Studio và TikTok LIVE Studio vẫn tiếp tục hoạt động bình thường.
echo  - Khi muốn mở lại, hãy nhấp đúp file '02_START_CHUA.bat'.
echo ======================================================================
echo.
pause
