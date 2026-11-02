@echo off
chcp 65001 >nul
title Xem Lỗi & Nhật Ký Hoạt Động — Temple Live Studio
cls

cd /d "%~dp0"

echo ======================================================================
echo 🪷 TEMPLE LIVE STUDIO — KIỂM TRA TRẠNG THÁI & NHẬT KÝ LỖI (LOGS)
echo ======================================================================
echo.

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;%ProgramFiles%\Docker\Docker\resources\bin"
    )
)

echo [1/3] Trạng thái Container & Sức khỏe dịch vụ:
echo ----------------------------------------------------------------------
docker compose ps
echo ----------------------------------------------------------------------
echo.

echo [2/3] Kiểm tra Healthcheck cục bộ:
curl -s http://127.0.0.1:3000/api/health
echo.
echo.

echo [3/3] 60 dòng nhật ký gần nhất của ứng dụng:
echo ----------------------------------------------------------------------
docker compose logs --tail=60
echo ----------------------------------------------------------------------
echo.

echo ======================================================================
echo  LỰA CHỌN HỖ TRỢ KỸ THUẬT:
echo   [1] Xuất gói chẩn đoán lỗi (Diagnostic Bundle) để gửi hỗ trợ kỹ thuật
echo   [2] Thoát
echo ======================================================================
set /p DIAG_CHOICE="Nhập lựa chọn của bạn (1 hoặc 2): "

if "%DIAG_CHOICE%"=="1" (
    if not exist "%~dp0diagnostics" mkdir "%~dp0diagnostics"
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set LDT=%%I
    set DIAG_TIME=%LDT:~0,8%_%LDT:~8,6%
    if "%DIAG_TIME%"=="set DIAG_TIME=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set DIAG_TIME=%DIAG_TIME: =0%

    set "DIAG_FILE=%~dp0diagnostics\temple-diag-%DIAG_TIME%.log"
    echo Đang tạo file chẩn đoán lỗi (đã che các thông tin bảo mật)...
    (
        echo === TEMPLE LIVE STUDIO DIAGNOSTIC REPORT ===
        echo Time: %date% %time%
        echo OS Architecture: %PROCESSOR_ARCHITECTURE%
        echo Docker Version:
        docker --version
        echo Compose Version:
        docker compose version
        echo Container Status:
        docker compose ps
        echo Health Check:
        curl -s http://127.0.0.1:3000/api/health
        echo.
        echo === CONTAINER RECENT LOGS ===
        docker compose logs --tail=150
    ) > "%DIAG_FILE%" 2>&1

    echo.
    echo ĐÃ XUẤT FILE CHẨN ĐOÁN THÀNH CÔNG:
    echo %DIAG_FILE%
    echo Bạn có thể gửi file này cho đội ngũ kỹ thuật để được hỗ trợ nhanh chóng.
    echo.
)

pause
