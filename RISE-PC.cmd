@echo off
setlocal
cd /d "%~dp0"
set "RISE_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "RISE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%RISE_NODE%" -e "process.exit(Number(process.versions.node.split('.')[0]) < 24 ? 1 : 0)"
if errorlevel 1 goto failed
if not exist dist\index.html "%RISE_NODE%" scripts\build-rise.mjs
if errorlevel 1 goto failed
if "%~1"=="--check" exit /b 0
"%RISE_NODE%" bridge\start.mjs
if errorlevel 1 goto failed
exit /b 0
:failed
echo RISE could not start. Check the message above. Node.js 24 or later is required.
pause
exit /b 1
