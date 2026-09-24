@echo off
chcp 65001 >nul
title Icon Crawler Web UI
cls

echo ============================================
echo    Icon Crawler Web UI Launcher
echo ============================================
echo.

REM Check Python environment
if exist ".venv\Scripts\python.exe" (
    set PYTHON=.venv\Scripts\python.exe
    echo [OK] Found virtual environment Python
) else (
    echo [ERROR] Virtual environment not found!
    echo Please run: uv sync
    pause
    exit /b 1
)

echo.
echo [1/2] Starting Web server...
echo.

REM Start server
cd /d "%~dp0"
start /B "" .venv\Scripts\uvicorn src.web.main:create_app --factory --host 127.0.0.1 --port 8000

echo [2/2] Waiting for server to be ready...

REM Wait for server
:wait_loop
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% == 0 goto server_ready
timeout /t 1 /nobreak >nul
goto wait_loop

:server_ready
echo.
echo ============================================
echo    Web UI started successfully!
echo ============================================
echo.
echo Access URL: http://127.0.0.1:8000
echo.

REM Open browser
start "" "http://127.0.0.1:8000"

echo Opening browser...
echo.
echo Tip: Close this window to stop the service
echo.
pause

REM Stop server
taskkill /F /IM python.exe /IM uvicorn.exe >nul 2>&1
exit /b 0
