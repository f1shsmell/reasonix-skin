@echo off
chcp 65001 >nul
setlocal
rem All-ASCII on purpose: cmd parses this file in the local code page, and
rem even a rem-line with CJK can be mis-read as a command. Real messages
rem come from install.ps1, which is UTF-8 **with BOM** so both PowerShell
rem 5.1 and PowerShell 7 read it correctly.
echo.
echo   Codex Ink - reapply the overlay to the installed Reasonix Studio
echo   (every Studio update overwrites it; just run this again)
echo.
set "PS="
where pwsh >nul 2>nul && set "PS=pwsh"
if not defined PS set "PS=powershell"
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
