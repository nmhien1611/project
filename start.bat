@echo off
title NGSHOP - Khoi dong he thong
color 0A

echo.
echo  ==========================================
echo    NGSHOP - Fullstack E-Commerce
echo  ==========================================
echo.

REM Kiem tra Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [LOI] Khong tim thay Node.js!
    echo  Vui long tai tai: https://nodejs.org
    pause
    exit /b 1
)

REM Kiem tra MySQL
echo  [*] Kiem tra MySQL...
sc query MySQL80 >nul 2>&1
if %errorlevel% neq 0 (
    net start MySQL80 >nul 2>&1
    net start MySQL   >nul 2>&1
)
echo  [OK] MySQL san sang

REM Kiem tra node_modules
if not exist "backend\node_modules" (
    echo  [*] Cai dat dependencies...
    cd backend && call npm install && cd ..
    echo  [OK] Dependencies da cai dat
)

REM Khoi dong Backend (port 3001) - chi xu ly API
echo  [*] Khoi dong Backend API (port 3001)...
start "NGSHOP Backend - API" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 /nobreak >nul

REM Khoi dong Frontend (port 5500) - chi serve giao dien
echo  [*] Khoi dong Frontend (port 5500)...
start "NGSHOP Frontend - UI" cmd /k "cd /d %~dp0frontend && node server.js"

timeout /t 2 /nobreak >nul

REM Mo trinh duyet vao frontend
start http://localhost:5500/index.html

echo.
echo  ==========================================
echo   Backend API : http://localhost:3001/api
echo   Frontend UI : http://localhost:5500
echo  ==========================================
echo.
echo  2 cua so server dang chay rieng biet.
echo  Dong cua so nay de ket thuc.
echo.
pause


// d:\NMHien\start.bat//
