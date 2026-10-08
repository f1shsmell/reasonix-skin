# 还原：把 Codex Ink 覆盖层从已安装的 Reasonix Studio 上摘掉。
# 用法: pwsh -File uninstall.ps1            （自动找 Studio）
#       pwsh -File uninstall.ps1 -StudioDir "C:\path\to\Reasonix Studio"
[CmdletBinding()]
param(
  [string]$StudioDir = ""
)

$opts = @{ Restore = $true }
if ($StudioDir) { $opts.StudioDir = $StudioDir }
& (Join-Path $PSScriptRoot "install.ps1") @opts
