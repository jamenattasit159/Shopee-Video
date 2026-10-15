@echo off
title Shopee Video Dashboard
cd /d "%~dp0"

echo ================================================================
echo       Shopee Affiliate Video Production System
echo ================================================================
echo Starting Dev Server on http://localhost:3000 ...
echo Opening browser in 3 seconds...
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo Server stopped with error.
    pause
)
