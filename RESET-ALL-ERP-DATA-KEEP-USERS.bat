@echo off
setlocal EnableExtensions
title NFL Pulse ERP - RESET ALL OPERATIONAL DATA
cd /d "%~dp0"

echo ============================================================
echo   NFL PULSE ERP - FULL OPERATIONAL DATA RESET
echo ============================================================
echo.
echo THIS WILL DELETE:
echo   - ALL imported data
echo   - ALL manually entered Orders / Styles / PO / Breakdowns
echo   - ALL T&A / Planning / Gantt data stored with orders/styles
echo   - ALL Cutting / Printing / Embroidery / Sewing / Shipment data
echo   - ALL Import batches / rows / projections / mutations
echo   - ALL Buyer master values
echo   - ALL Factory / Section / Floor / Line / Machine Pool masters
echo   - ALL Reference dropdown values
echo   - ALL Tasks and Audit logs
echo.
echo THIS WILL KEEP:
echo   - Users
echo   - Roles
echo   - Permissions
echo   - User-role / role-permission setup
echo   - Login accounts
echo.
echo IMPORTANT: THIS CANNOT BE UNDONE.
echo.
set /p CONFIRM=Type RESET and press Enter to continue: 
if /I not "%CONFIRM%"=="RESET" (
  echo.
  echo Cancelled. No data was deleted.
  pause
  exit /b 0
)

if not exist "apps\api\package.json" (
  echo.
  echo [ERROR] Put this BAT file in the project ROOT beside the apps folder.
  pause
  exit /b 1
)

if not exist "apps\api\.env" (
  echo.
  echo [ERROR] apps\api\.env is missing.
  pause
  exit /b 1
)

echo.
echo [1/3] Stopping local API/Web processes on ports 3000 and 4000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul

set "SQLFILE=%TEMP%\nfl_pulse_full_operational_reset.sql"

> "%SQLFILE%" echo BEGIN;
>>"%SQLFILE%" echo TRUNCATE TABLE
>>"%SQLFILE%" echo   "ImportBatch",
>>"%SQLFILE%" echo   "ReferenceValue",
>>"%SQLFILE%" echo   "Task",
>>"%SQLFILE%" echo   "AuditLog",
>>"%SQLFILE%" echo   "Order",
>>"%SQLFILE%" echo   "Buyer",
>>"%SQLFILE%" echo   "MachinePool",
>>"%SQLFILE%" echo   "Line",
>>"%SQLFILE%" echo   "Floor",
>>"%SQLFILE%" echo   "Section",
>>"%SQLFILE%" echo   "JobSequence",
>>"%SQLFILE%" echo   "Factory"
>>"%SQLFILE%" echo RESTART IDENTITY CASCADE;
>>"%SQLFILE%" echo COMMIT;

echo [2/3] Deleting operational data...
pushd apps\api
call npx prisma db execute --schema prisma/schema.prisma --file "%SQLFILE%"
if errorlevel 1 (
  popd
  echo.
  echo [ERROR] Reset failed. No further action taken.
  echo Send a screenshot of the error above.
  pause
  exit /b 1
)
popd

del /q "%SQLFILE%" >nul 2>nul

echo [3/3] Reset complete.
echo.
echo ============================================================
echo   RESET COMPLETE
echo ============================================================
echo.
echo Users / roles / permissions are still present.
echo Factory / Floor / Line / Buyer / operational data are now empty.
echo.
echo Next:
echo   1. Start NFL Pulse ERP normally.
echo   2. Import your CLEAN factory reports.
echo   3. New Factory/Floor/Line/Buyer masters will be rebuilt from the import rules.
echo.
pause
exit /b 0
