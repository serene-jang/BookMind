@echo off
setlocal
set "ROOT=%~dp0.."

if not exist "%ROOT%\index.html" (
  echo index.html not found in project root.
  pause
  exit /b 1
)

start "" "%ROOT%\index.html"
exit /b 0
