@echo off
setlocal EnableExtensions
title NFL Pulse ERP v0.4.35 - PLANNING SCALE & LINE CLEANUP
cd /d "%~dp0"

echo ==================================================
echo   NFL PULSE ERP v0.4.35 - PLANNING SCALE & LINE CLEANUP
echo ==================================================
echo.

if not exist "apps\api\package.json" (
  echo [ERROR] Put this BAT in the project ROOT beside apps.
  pause
  exit /b 1
)
if not exist "apps\api\.env" (
  echo [ERROR] apps\api\.env missing. Copy your working .env there.
  pause
  exit /b 1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul

pushd apps\api
if exist "dist\tsconfig.tsbuildinfo" del /q "dist\tsconfig.tsbuildinfo" >nul 2>nul

echo [1/9] Installing/updating API dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto FAIL

echo [2/9] Generating Prisma client...
call npx prisma generate
if errorlevel 1 goto FAIL

echo [3/9] Syncing database schema...
call npx prisma db push
if errorlevel 1 goto FAIL

echo [4/9] Seeding exact NFL/NCL floor-line master...
call npm run prisma:seed
if errorlevel 1 goto FAIL

echo [5/9] Cleaning approved master dropdowns...
call npm run prisma:master-cleanup
if errorlevel 1 goto FAIL

echo [6/9] Compiling API...
call npm run build
if errorlevel 1 goto FAIL
popd

echo [7/9] Starting API...
start "NFL Pulse API v0.4.35" cmd /k "cd /d ""%~dp0apps\api"" && npm run dev"

set /a COUNT=0
:WAITAPI
timeout /t 2 /nobreak >nul
set /a COUNT+=1
curl.exe -s --max-time 2 http://localhost:4000/api/health | findstr /i "ok" >nul 2>nul
if not errorlevel 1 goto APIREADY
if %COUNT% GEQ 20 goto FAILAPI
goto WAITAPI

:APIREADY
echo [OK] API healthy.
echo [8/9] Installing/updating Web dependencies...
pushd apps\web
call npm install --no-audit --no-fund
if errorlevel 1 goto FAILWEB
popd

echo [9/9] Starting Web...
start "NFL Pulse Web v0.4.35" cmd /k "cd /d ""%~dp0apps\web"" && npm run dev"
timeout /t 7 /nobreak >nul
start "" "http://localhost:3000/modules/ie-overview"
exit /b 0

:FAIL
popd
echo.
echo [ERROR] API setup/master-clean/build failed. Send the red error lines above.
pause
exit /b 1

:FAILAPI
echo.
echo [ERROR] API compiled but did not become healthy on port 4000.
pause
exit /b 1

:FAILWEB
popd
echo.
echo [ERROR] Web dependency setup failed.
pause
exit /b 1
