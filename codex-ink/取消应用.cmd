@echo off
chcp 65001 >nul
setlocal
rem All-ASCII on purpose: cmd parses this file in the local code page, and
rem even a rem-line with CJK can be mis-read as a command. Real messages
rem come from uninstall.ps1, which is UTF-8 **with BOM** so both PowerShell
rem 5.1 and PowerShell 7 read it correctly.
rem
rem Extra args are passed straight through, e.g. -StudioDir "D:\Reasonix Studio"
echo.
echo   Codex Ink - take the overlay back off the installed Reasonix Studio
echo   (nothing official was touched; this only removes our link + assets)
echo.
set "PS="
where pwsh >nul 2>nul && set "PS=pwsh"
if not defined PS set "PS=powershell"
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1" %*
echo.
pause
