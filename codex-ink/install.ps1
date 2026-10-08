<#
  Codex Ink — 给已安装的 Reasonix Studio 打覆盖补丁（可还原）

  官方主题包（Theme Pack）只能设 25 个 token，碰不到内核保留的
  --ok / --warn / --err / --net / --deleg / --add / --del / --focus，
  也碰不到布局与密度 —— 实测这些保留变量在 2.27.0 的生产 CSS 里被引用约 580 次。
  要做成"Codex 观感"就得落到前端资源上，而这个脚本做的就是这件事。

  本版本是**纯 CSS**：只放一样东西进
  <Studio>\resources\frontend-next\dist\assets\ ：

    codex-ink.css   覆盖层（全部改动都在这里）

  再在 dist\index.html 的 </head> 前挂一行 <link>（官方样式表之后，同特异性下后者胜）。

  历史：早先还注入过一个 codex-ink.js（顶栏那个"打开项目文件夹"按钮），
  已按使用者要求撤掉 —— 原因记在 codex-ink.css 的 ㉚ 段：官方 API 只能
  "打开父目录并选中该项"，做不出"进入项目目录"。本脚本仍会顺手清掉旧版本
  在 assets\ 里留下的 codex-ink.js。

  不改动官方原文件本身，随时可用 -Restore 完全还原。

  用法：
    pwsh -File install.ps1                          # 自动找 Studio
    pwsh -File install.ps1 -StudioDir "C:\path"     # 手动指定
    pwsh -File install.ps1 -Restore                 # 还原

  改完要重启 Reasonix Studio 才生效。
#>
[CmdletBinding()]
param(
  [string]$StudioDir = "",
  [switch]$Restore
)

$ErrorActionPreference = "Stop"

function Find-Studio {
  $cands = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Reasonix Studio"),
    (Join-Path ${env:ProgramFiles} "Reasonix Studio"),
    (Join-Path ${env:ProgramFiles(x86)} "Reasonix Studio")
  )
  foreach ($c in $cands) {
    if ($c -and (Test-Path (Join-Path $c "resources\frontend-next\dist\index.html"))) { return $c }
  }
  return $null
}

if (-not $StudioDir) { $StudioDir = Find-Studio }
if (-not $StudioDir) { throw "找不到 Reasonix Studio 安装目录，请用 -StudioDir 指定。" }

$dist      = Join-Path $StudioDir "resources\frontend-next\dist"
$index     = Join-Path $dist "index.html"
$assets    = Join-Path $dist "assets"
$mark      = "codex-ink"
$srcCss    = Join-Path $PSScriptRoot "codex-ink.css"
$targetCss = Join-Path $assets "codex-ink.css"
$staleJs   = Join-Path $assets "codex-ink.js"   # 旧版本留下的，装/卸都顺手清掉

if (-not (Test-Path $index)) { throw "不是有效的 Studio 发行目录：$index 不存在" }

$html = Get-Content $index -Raw

if ($Restore) {
  # 按标记行删，而不是靠备份 —— 这样 Studio 升级覆盖过 index.html 之后也能正确清掉。
  $kept = ($html -split "`n") | Where-Object { $_ -notmatch [regex]::Escape($mark) }
  Set-Content -Path $index -Value (($kept -join "`n").TrimEnd("`r", "`n") + "`n") -NoNewline
  Write-Host "已从 index.html 移除覆盖层（含旧版本可能留下的 script）"
  foreach ($f in @($targetCss, $staleJs)) {
    if (Test-Path $f) { Remove-Item $f -Force; Write-Host ("已删除 assets\" + (Split-Path $f -Leaf)) }
  }
  Write-Host "还原完成 —— 重启 Reasonix Studio 生效。"
  return
}

if (-not (Test-Path $srcCss)) { throw "同目录下找不到 codex-ink.css（应与本脚本放在一起）" }

Copy-Item $srcCss $targetCss -Force
Write-Host "已写入 assets\codex-ink.css"

if (Test-Path $staleJs) {
  Remove-Item $staleJs -Force
  Write-Host "已清理旧版本留下的 assets\codex-ink.js"
}

# URL 上挂一个随内容变的版本号：dist/_headers 给 /assets/* 声明了
# Cache-Control: immutable，host 如果认这个头，改了文件也永远拿不到新的。
$ver = (Get-FileHash $srcCss -Algorithm SHA256).Hash.Substring(0, 8).ToLower()

# 要保留 </head> 自身的缩进：直接 replace "</head>" 会把它的前导空格留在
# 新插入的那一行前面，还原之后 index.html 就与原始内容差两个空格（哈希对不上）。
$indent = ""
if ($html -match "(?m)^([ \t]*)</head>") { $indent = $Matches[1] }
$link = $indent + '<link rel="stylesheet" crossorigin href="./assets/codex-ink.css?v=' + $ver + '">'

if ($html -match [regex]::Escape($mark)) {
  # 已经挂过：先把自己那一行（以及旧版本的 script 行）摘掉，再统一插到 </head> 前面，
  # 这样重复执行也不会堆积。
  $html = [regex]::Replace($html, "(?m)^[ \t]*<link[^>]*codex-ink\.css[^>]*>[ \t]*\r?\n", "", 1)
  $html = [regex]::Replace($html, "(?m)^[ \t]*<script[^>]*codex-ink\.js[^>]*>[ \t]*</script>[ \t]*\r?\n", "", 1)
}

if ($html -notmatch "</head>") { throw "index.html 里找不到 </head>，无法插入" }
$html = [regex]::Replace($html, "(?m)^[ \t]*</head>", ($link + "`n" + $indent + "</head>"), 1)
Set-Content -Path $index -Value $html -NoNewline
Write-Host "已在 index.html 挂上覆盖层（v=$ver）"

Write-Host ""
Write-Host "装好了。重启 Reasonix Studio 生效。"
Write-Host "还原：pwsh -File install.ps1 -Restore"
