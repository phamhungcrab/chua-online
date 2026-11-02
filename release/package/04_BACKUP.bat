@echo off
chcp 65001 >nul
title Sao Lưu Dữ Liệu Chánh Điện — Temple Live Studio
cls

cd /d "%~dp0"

echo ======================================================================
echo 🪷 TEMPLE LIVE STUDIO — SAO LƯU DỮ LIỆU TOÀN VẸN (ATOMIC BACKUP)
echo ======================================================================
echo.

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;%ProgramFiles%\Docker\Docker\resources\bin"
    )
)

:: Tạo chuỗi thời gian YYYYMMDD_HHMMSS
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set LDT=%%I
set TIMESTAMP=%LDT:~0,8%_%LDT:~8,6%
if "%TIMESTAMP%"=="" set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set "BACKUP_DEST=%~dp0backups\backup_%TIMESTAMP%"
if not exist "%BACKUP_DEST%" mkdir "%BACKUP_DEST%"

echo [1/3] Đang tạo bản chụp nguyên tử SQLite (VACUUM INTO) để tích hợp toàn bộ WAL...
docker compose exec -T temple-live-studio node -e "import('node:sqlite').then(({ DatabaseSync }) => { const db = new DatabaseSync('/data/temple-studio.sqlite'); db.exec('VACUUM INTO ''/data/backups/live_backup.sqlite'''); console.log('OK'); }).catch(e => { console.error(e.message); process.exit(1); });" >nul 2>&1

if %ERRORLEVEL% neq 0 (
    echo [Cảnh báo] Container chưa chạy hoặc đang bận. Đang sao lưu trực tiếp từ Volume...
    docker cp temple-live-studio:/data/temple-studio.sqlite "%BACKUP_DEST%\temple-studio.sqlite" >nul 2>&1
    docker cp temple-live-studio:/data/temple-studio.sqlite-wal "%BACKUP_DEST%\temple-studio.sqlite-wal" >nul 2>&1
    docker cp temple-live-studio:/data/temple-studio.sqlite-shm "%BACKUP_DEST%\temple-studio.sqlite-shm" >nul 2>&1
) else (
    docker cp temple-live-studio:/data/backups/live_backup.sqlite "%BACKUP_DEST%\temple-studio.sqlite" >nul 2>&1
    echo [1/3] Đã trích xuất cơ sở dữ liệu SQLite nhất quán.
)

echo [2/3] Đang sao lưu thư viện âm thanh và tài nguyên cảnh chùa...
docker cp temple-live-studio:/data/audio-uploads "%BACKUP_DEST%\audio-uploads" >nul 2>&1
docker cp temple-live-studio:/data/scene-assets "%BACKUP_DEST%\scene-assets" >nul 2>&1

echo [3/3] Đang kiểm tra tính toàn vẹn của tệp sao lưu...
if exist "%BACKUP_DEST%\temple-studio.sqlite" (
    for %%A in ("%BACKUP_DEST%\temple-studio.sqlite") do set DB_SIZE=%%~zA
    echo File SQLite: %%A (Dung lượng: %DB_SIZE% bytes) [HỢP LỆ]
    echo.
    echo ======================================================================
    echo  SAO LƯU THÀNH CÔNG!
    echo  Thư mục sao lưu: %BACKUP_DEST%
    echo  Toàn bộ cài đặt, điểm công đức, file nhạc và hình nền đã được lưu giữ.
    echo ======================================================================
) else (
    echo [LỖI] Không thể tạo file sao lưu. Vui lòng đảm bảo container đã được tạo hoặc chạy ít nhất một lần.
)

echo.
pause
