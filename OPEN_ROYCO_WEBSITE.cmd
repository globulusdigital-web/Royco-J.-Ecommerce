@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 (
  set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if not exist "%NODE_EXE%" if "%NODE_EXE%"=="%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  echo Node.js was not found. Install Node.js 22 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo Building Royco Jewellers...
  "%NODE_EXE%" "node_modules\vite\bin\vite.js" build
  if errorlevel 1 (
    echo The website build failed. Run npm install and try again.
    pause
    exit /b 1
  )
)

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4173/api/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
if errorlevel 1 (
  echo Starting the Royco storefront and backend...
  start "Royco Jewellers Server" /min "%NODE_EXE%" "local-server\app.mjs"
  timeout /t 4 /nobreak >nul
)

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4173/api/health' -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
if errorlevel 1 (
  echo The Royco server could not start on port 4173.
  pause
  exit /b 1
)

if /I "%ROYCO_NO_BROWSER%"=="1" exit /b 0

set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME_EXE%" (
  start "" "%CHROME_EXE%" "http://127.0.0.1:4173"
) else (
  echo Google Chrome was not found; opening the website in your default browser.
  start "" "http://127.0.0.1:4173"
)

endlocal
