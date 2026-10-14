# Codex Ink —— Reasonix Studio 的 Codex 观感覆盖层

把 Reasonix Studio 换成 Codex 桌面端的样子：**零彩色 chrome、墨白灰阶即层级**、
最左一条图标轨、通栏灰壳顶栏、大圆角输入卡。

上路方式有两条，可单用也可叠加：

1. **CSS 覆盖补丁**（`codex-ink.css` + `install.ps1`）——外观恒定、能力最全，
   在已安装的 Studio 上打一层补丁；
2. **主题包**（`theme-pack/`）——纯官方机制，Studio 2.29 起用上
   `link / brand / halo / labelAgent` 四个装饰角色 token。

不是 fork——原因见第一节。覆盖层已按 **2.39.0** 复核：引用的 114 条选择器
在 13 种页面状态（含窄窗 scene 折叠）下扫描，95 条命中（余下 19 条的每一条
都查清了原因，见第三节）；2.27 / 2.32 / 2.33 / 2.36 / 2.39 五代外壳布局差异
也都已适配。

**2.36 起分工变了**：**颜色归主题包，覆盖层只管样式。** 覆盖层不再自带调色板，
`theme-pack/` 从"可选"变成"配色的唯一来源"——装包即包的色，换包即换色。
想看到 Codex 的墨白，请把包一起装上：

```powershell
reasonix plugin install .\theme-pack --link --yes
# 然后在 Settings → Appearance 里选「Codex Ink 墨白」
```

不装包也能用，但那时界面用的是 Studio 自带调色板（琥珀强调色），
只有布局与密度是 Codex 的。理由与实测见第三节（验证数据）与第六节（逐项清单）。

---

## 一、为什么不走官方主题包（也不走插件）

**结论：主题包到今天仍只到 token 层，够不到结构；2.29 起装饰色这一块够到了。
所以这套皮肤是"覆盖层管样式 + 主题包管颜色"两层合用 —— 见下。**

> **2.36 起这句话有了新的分量**：本项目现在的分工是
> **颜色全部交给主题包，覆盖层只改样式**。也就是说本节论证的
> "主题包够不到结构"，正是覆盖层还存在的唯一理由；而它够得到的颜色，
> 覆盖层一点都不再插手。想看到 Codex 的墨白，包必须一起装。

2.27 时"官方说增加了对主题的支持"指的是这一条 release note：

> 新增主题作者指南和可直接安装的纯主题示例 Paper Dawn，替换掉旧桌面时代的指南和**含无效字段的模板**（#11578）

——是**文档与示例的补齐**，不是能力扩展。2.29 则是一次**真的能力扩展**：
`#12030`（我们提的 `#12008` 的 first slice）把 `--net` / `--deleg` 兼职的
装饰角色拆成了四个可主题化的 token。三条证据：

### 1. 白名单从 25 个 token 扩到 29 个

`internal/ext/theme/tokens.go` 是权威表。2.27.0 时是 20 个颜色 + 3 个圆角 +
2 个字体栈；2.29.0 起新增四个**装饰角色**：`link` / `brand` / `halo` /
`labelAgent`（→ `--link` / `--brand` / `--halo` / `--label-agent`），
共 **24 色 + 3 圆角 + 2 字体栈**。状态色仍然**故意不在表里**：

> Absent on purpose: ok/warn/err/net/deleg carry meaning rather than taste

### 2. 保留变量在真实 CSS 里仍被引用数百次

`desktop/frontend-next/src/ui/theme.ts` 里还有一份 `RESERVED`：
`--ok --warn --err --net --deleg --add --del --focus`。

数主样式表里的引用次数（2.29.0 的 `assets/index-CLMzK0YN.css`；
括号里是 2.36.0 的 `assets/index-Qtsjevt0.css`）：

| 变量 | 引用次数 | 主题包能改？ |
| --- | --- | --- |
| `--text` / `--border` / `--accent` / `--overlay` / `--surface` / `--raised` | 566 / 334 / 181 / 214 / 127 / 127 | 能 |
| `--err` / `--focus` / `--net` / `--warn` / `--ok` / `--deleg` / `--cat-1` | 150 / 123 / 79 / 62 / 78 / 17 / 8 | **不能** |
| `--link` / `--brand` / `--halo` / `--label-agent`（2.29 新增） | 5 / 11 / 7 / 5 | **能** |

这就是"装了主题包只有底色和字体变了"的量化原因：界面里绝大多数颜色，
挂在主题包碰不到的变量上。2.29 的拆分让链接 / 品牌 / 悬停光晕 / 代理名标签
这四类装饰色变得可主题化（约 30 条规则），但状态色与用量分类色仍不可达 ——
**这一条到 2.36 没变**：`tokens.go` 的词汇表仍是那 29 项，状态色仍写着
"carry meaning rather than taste"。所以用量五段色与运行 / 委派状态色
在装了包之后**仍然是官方色**，那不是本项目的遗漏，是官方有意为之。

### 3. 换插件形式也不行

插件清单的能力只有 `Skills / Agents / Commands / Hooks / MCPServers / Prompts /
Themes / Runtime`。扩展协议 v2 的 `ui` 能力是让扩展**发布自己的**载荷
（`host/ui/publish`：status / card / form / notification / panel / view），
不是给宿主换皮。换插件包壳这条路不存在。

---

## 二、所以走这条路：给已安装的 Studio 打 CSS 补丁

Studio 的前端就是磁盘上的一个目录——从宿主进程的命令行能直接看到：

```
reasonix-studio-host.exe -page "...\Reasonix Studio\resources\frontend-next\dist" -studio-version 2.36.0
```

在 `dist/index.html` 的官方样式表**之后**挂一层自己的 CSS，就能拿到全部能力
（布局、密度、保留变量、状态色、hover 分层）。代价只有一条：
**Studio 每次升级要重跑一次 `install.ps1`**。

### 装

```powershell
pwsh -File install.ps1
```

自动找 `%LOCALAPPDATA%\Programs\Reasonix Studio`；装在别处用
`pwsh -File install.ps1 -StudioDir "C:\path\to\Reasonix Studio"`。
**改完重启 Reasonix Studio 生效。**

### Studio 更新之后（要重打一次）

Studio 升级会把 `dist\index.html` 换成新版、并清掉 `dist\assets\` 里我们放的文件，
补丁于是失效。**重跑一次 install.ps1 就行** —— 它是幂等的，重复跑不会堆积，
对全新版本的 index.html 一样有效，assets 里残留的旧文件也会被覆盖成最新：

```powershell
pwsh -File C:\Dev\reasonix-skin\codex-ink\install.ps1
```

（也可以直接双击 `codex-ink\重新应用.cmd`，它跑的就是同一条命令。）

> **两个脚本编码坑**（都踩过并已修）：
> ① `install.ps1` / `uninstall.ps1` 是 **UTF-8 带 BOM** 的。Windows PowerShell 5.1
> 按**本地代码页**读无 BOM 的 `.ps1`，中文会乱码并让整个脚本语法错位 ——
> 症状是莫名其妙的 `Get-FileHash is not recognized` 之类。带 BOM 后
> `pwsh`（7）与 `powershell`（5.1）两条路都验过，都能跑。
> ② `重新应用.cmd` / `取消应用.cmd` 里**一个中文字都不能有**：cmd 按本地代码页
> 解析批处理，连 `rem` 注释里的中文都会被当成命令执行，`chcp 65001` 救不回来。
> 中文提示交给 `install.ps1` / `uninstall.ps1` 输出。

判断"要不要重打"最快的办法：看 `dist\index.html` 里还有没有那行
`codex-ink.css`：

```powershell
Select-String -Path "$env:LOCALAPPDATA\Programs\Reasonix Studio\resources\frontend-next\dist\index.html" -Pattern codex-ink
```

> **别再靠"最左那条图标轨在不在"判断了。** 2.27 / 2.32 时那条轨被外壳收成
> 0 宽，只有补丁生效才会露出来，所以能当指示灯；**2.33 起它是 Studio 的
> 正式功能**（`data-nav` 控制、默认开），不打补丁也在 —— 两版都有轨，
> 看不出区别。见第三节的版本对照表。

### 更新日志：Studio 每次升级，本项目跟着改了什么

按版本倒序。每一轮都是同一套流程：从官方 `studio` 分支取对应 tag 的源码 →
构建性能台 → Playwright 量计算样式与命中测试 → 改 `codex-ink.css`。
`install.ps1` 的注入方式**与版本无关**，这几轮升级从未为它改过一行。

**2.39.0**（本轮，2026-10-14）

这一轮改了四处，全在 `codex-ink.css`，外加主题包补一个 token、三个复核脚本跟着改。
**2.39 动了三处外壳**，每一处都让旧写法失去前提：

**① 桌面不再渲染 ☰（`.studio-menu`）→ ④ 的"让位"收回。**
2.36 时 ☰ 是 `.app` 下 `position:fixed` 的一层，覆盖层把 `.chrome` 拉成通栏后
面包屑会压在它身上，于是 ④ 给了 `padding-left: calc(var(--lights-w) + 52px)`。
2.39 把 ☰ 从 `Chrome.tsx` 搬到 `RailToggle.tsx`，并且按 `LAYOUT.md`：
*"The desktop sidebar's divider owns collapse, expansion and width adjustment"* ——
桌面侧栏的折叠/展开/调宽改由**分隔条**负责（抓手、Enter/Space、方向键、Home/双击），
`.studio-menu` **只在窄窗 `data-fold~="scene"` 的抽屉形态里挂载**。
实测：1600 / 1024 窗口下 `.studio-menu` 不在 DOM；560 窗口下在 `10,7 30x30`。
那条 52px 于是成了没有来由的空白 —— 收回 12px，另立一条
`html[data-fold~="scene"] .chrome` 只在抽屉形态让位（`data-fold` 挂在 `<html>` 上）。

**② 品牌区换成了两行 lockup → 被钉死的 26px 会把它裁掉。**
2.36 的品牌是 `.studio-brand-mark`（28px 方块）+ 文字，覆盖层 ⑭ 把方块
`display:none` 只留字，并把 `.studio-brand` 钉成 26px —— 那是"品牌 + 搜索收成
一行、与 `.chrome` 等高（10 + 26 + 8 = 44）"的算法。
2.39 换成 `.studio-brand-lockup`：`img.studio-brand-logo`（118×24 的
`logo-wordmark.svg`）+ 9px 副标题，24 + 9 + 1 = **34px**。26px 一钉，
两行各自被裁一刀 —— 实测图片落在 `y=50..74`、副标题落在 `y=75..84`，
而 `.studio-brand` 只有 `54..80`，**上下各切 4px**。
修法：放开到 34px，搜索图标随之从 `top:10px` 移到 `13px`（10 + (34−28)/2）。
侧栏头部因此由 167px 变成 **175px** —— 这是两行品牌的自然结果，其余落点不变。

> wordmark 本身**按使用者的选择保留官方那份彩色**（浅色是带品牌蓝的原色，
> 暗色官方自己 `brightness(0) invert(1)` 反白）。本层没有把它收灰阶，
> 也不再把 `.studio-brand-mark` 这类 2.39 已不存在的元素算作"还在管"。

**③ 主题包多了 `accentInk`，圆角/密度改成配方 → 两条硬编码要跟。**
`internal/ext/theme/tokens.go` 新增 `accentInk`（→ `--accent-ink`），
`theme.ts` 也给了默认值与一条 `accent ← 65% / fg` 的兜底派生；
`--r-xs/sm/md/lg` 同时改写成 `calc(… * var(--r-scale, 1))`，因子由**包**的
`recipes.corners`（square=0 / soft=1 / round=1.5）下发。
于是本层两处跟着改：

- `--accent-ink` 不再由本层自说自话（原来直接等于 `--accent`），改用**官方同一条
  公式** `color-mix(in srgb, var(--accent) 65%, var(--text))`。这样 2.36 及更早
  （官方只引用这个变量、不定义）拿到的仍是同一档深强调色，2.39 不装包时也
  对齐到同一语义，装了包则由包压过。
- `--r-lg: 18px` 改成 `calc(18px * var(--r-scale, 1))`：本层仍要提这一档
  （Codex 的大圆角是 18px，官方默认 12px），但把包的因子乘进去 ——
  包说 `square` 时圆角照样收成直角。**形状归包，档位归本层。**

**④ 复核工具跟上 2.39**

- `tools/audit-states.mjs` 新增两个**窄窗（560×900）状态**，并支持逐状态视口：
  2.39 起 ☰ 只在窄窗挂载，少了这一档，㉛ 那组 `::after` 规则会被误报成 DEAD。
- `tools/verify-tip.mjs` 同样改到窄窗跑（宽窗下 `.studio-menu` 是 `null`）。
- `tools/pack.mjs` 跟上 2.39 的 `theme.ts`：SURFACE 表加 `accentInk`、
  DERIVED 加同一条兜底、`recipes` 下发 `--r-scale` / `--d-scale`、
  `background.textGlow:"none"` 下发 `--flow-text-shadow`。
- `theme-pack/` 两个包补 `accentInk`（墨白=`accent` 同值；蓝调取深/亮蓝
  `#2A6FB1` / `#7ABFFF`），manifest 升到 **1.2.0**。

**⑤ 使用者反馈：窗格页签条的「色差」（同日修）**

装上之后使用者报"加主题包有色差、还会折叠"。量下来头一件就落在页签条上：

| | `.pane > .tabs` 的背景 |
| --- | --- |
| 2.36 官方 | `color-mix(in srgb, var(--surface) 94%, transparent)` + 一条 `--border` 底线 |
| **2.39 官方** | **`transparent`**（页签条与内容同一个面） |
| 本层（2.27 起） | `background: var(--page) !important` —— 压过官方（`!important` 赢过特异性） |

于是墨白包下：页签条 = `--page` `#FFFFFF`，紧挨着的 pane = `--surface` `#F6F6F6`
（实测 `rgb(255,255,255)` vs `rgb(246,246,246)`）—— **中间那条白带就是"色差"**，
页签条看着像一块盖在对话内容上的板。

这条规则是 2.27 时代留下的（那时页签条自带一条浅灰横带，本层想让它跟页面色一致），
在"页面色≈内容色"的包里看不出来，一装对比明显的包就露出来。2.39 官方把它改成透明，
本层也就不该再替它上色：

- ⑥ 段那条改成 `background: transparent !important`（跟随官方 2.39）；
- ⑳ 段的分组里去掉 `.tabs`（只留"没有那条底边线"与内边距）；
- ㉔ 里给 `[data-bg] .tabs` 的 80% 让路规则一并删掉 —— 它本来就是为"本层涂过色"
  而写的，现在页签条整体透明，透明就是最大的让路。

实测修后：浅色 `.pane` 与 `.pane > .tabs` 同为 `rgb(246,246,246)`、暗色同为
`rgb(15,15,15)`；盒子不变（页签条仍 `312,44 1288x41`），高饱和彩色仍只剩
浏览器按钮的 `--net` 蓝与远端 pip。

> **"遮挡 / 折叠"那一半同日查清了：是官方 2.39 自己的改动，与皮肤无关。**
> 把本层与主题包全部卸载、重启后仍复现，且能在源码里对上 ——
> 2.39 把 `.pane > .tabs` 的底色与底边线**一起**去掉了：
>
> | `.pane > .tabs` | 2.36 | 2.39 |
> | --- | --- | --- |
> | 背景 | `color-mix(in srgb, var(--surface) 94%, transparent)` | **`transparent`** |
> | 底边线 | `border-bottom-color: var(--border)` | **`transparent`** |
>
> 页签条与滚动区本来就是**零间隙**（实测页签条底边 `y=95` = 滚动区顶边 `y=95`）：
> 有那条 `--border` 线时，滚过去的内容会在一条线上被"切断"，读起来是分区的；
> 两条都去掉之后，内容就紧贴页签条下边缘滑过，看上去就是"视图标签遮住了对话内容"。
> 已作为独立反馈报给官方（`esengine/DeepSeek-Reasonix#13007`）。
> **本层不代它补线** —— 那是官方版面的事，皮肤不该去盖住官方的排版决定。

`preview/` 八张图全部按 2.39 重出。

**2.36.0**（2026-10-12）

这一轮与以往不同：**不只是"适配新版外壳"，而是把配色整个交还给主题包，
并把壁纸这条路打通。** 前者是本项目的新要求（覆盖层只改样式、不改颜色），
后者是 2.36 的 `data-bg` 机制与旧版覆盖层互相打架的结果。

改了三处文件：`codex-ink.css`（主体）、`tools/shot.mjs` + 新增 `tools/pack.mjs`
（截图要能连包一起装）、`tools/verify-tip.mjs`（选择器随 2.36 改了），
并新增 `tools/audit-states.mjs`（见 ⑤）。`preview/` 八张图全部按 2.36 重出。

**① 颜色交还给主题包（本项目新要求）**

覆盖层原先自带一份墨白调色板，还额外用 `!important` 钉住四级文字色。
2.36 的 `apply()` 不再把这四个 ink 变量**内联**写到 `<html>` 上，而是走 CSSOM
写进一条 `<style id="pack-theme">` 里的 `:root:root[data-pack] {}` 规则
（特异性 0,3,0）——于是包天然压过覆盖层的 (0,2,0)，覆盖层**不需要也不该**再提权。
实测：留着旧那段时 `--text` 被钉成本层旧值 `#1a1c1f`；删掉后变成包给的 `#12191C`。

删掉的：整份调色板（20 个色值）＋那段 `!important`。留下的只有包词汇表
（`internal/ext/theme/tokens.go`）里**没有对应项**的几样，且每一件都从包的 token
**派生**，换包照样跟着走：

| 留下的 | 从哪来 | 为什么交不出去 |
| --- | --- | --- |
| `--focus` / `--accent-ink` | `--accent` | 包的词汇表里没有"焦点环"这一项 |
| `--cx-bubble` | `--link` 12% / 32% | 没有 bubble 令牌；按"链接色的淡染"表达同一件事 |
| `--cx-line` | `--border` 67% | 没有"比 border 再淡半档"这一档 |
| `--shadow-float` | — | 是**影**不是色 |
| `.oobe` 底色 | — | 官方写死在 app.css 里，包够不到（见下） |

派生比例都是**量出来的**：`--cx-bubble` 取 `--link` 12% 落在 `rgb(231,243,255)`，
与使用者当年给的准确值 `rgb(232,243,254)` 逐通道差 ≤2；暗色取 32% 落在
`rgb(28,61,93)`，贴着 `#1e3a5c`。外壳三档同理（见 ②）。

顺带修掉一处**从来没生效过**的规则：`.oobe .onb-go` 那一组。
`.onb-*` 是 `Onboarding.tsx` 的类，根是 `.onb-stage`；而 `.oobe` 是另一屏
（`Welcome.tsx`）的根，两者从不同时出现（`App.tsx` 是二选一渲染）——
2.27 / 2.33 / 2.36 三代都如此。而且它已经不需要了：2.36 的 studio.css 自己就把
`.onb-go` / `.onb-fix` / `.onb-getkey` / `.onb-pick` 接到了 `--text` / `--border` /
`--focus` 上，实测 `.onb-go` 计算值 `rgb(37,39,37)` 正是包下发的 `--text`。

**② 壁纸（插画包 / sky）要能看见（本项目新要求）**

覆盖层原先的 ㉔ 段是**反着写的**——把外壳涂满不透明色，理由是"氛围层只留给内容区"。
纯色主题下看不出问题，一装带图的包就**把壁纸整块盖掉**：实测外壳三块量到
`rgb(246,246,246)` / `rgb(252,252,252)` 全不透明，而同一页面去掉覆盖层后是
62% / 86% 的 alpha。

改成"让路"：外壳保留 Codex 的三档分层，但按包同样的方式做成半透明
（chrome / 侧栏 80%，浅色 86%——都是 studio.css 自己那两档），并清掉
`backdrop-filter`（磨砂会把壁纸糊成一片色，而 Codex 的外壳是平面色）。
`.tabs`、`.studio-rail-head`、`.compose` 也一并放开。

**全屏扫描**（把 `--bg-image` 换成"左半红 / 右半蓝"，再数整屏有多少像素还看得见图）：

| | 看得见壁纸的像素 | 几乎全被挡住的 40×40 块 |
| --- | --- | --- |
| 官方原样（无覆盖层） | 96.0% | 18 块（y=360 一条，是转录自己的卡片） |
| 装覆盖层（浅色） | **97.5%** | **0 块** |
| 装覆盖层（暗色） | **99.6%** | 0 块 |
| 装覆盖层（空态） | **99.6%** | 0 块 |

两条坑（都是量出来才发现的，已写进 `codex-ink.css`）：

1. **`auto` 模式下会被自己的后文翻盘。** 覆盖层别处也画这几个面，而且都带
   `!important`：㉑ 的 `:root[data-theme="light"] .rail`（0,3,0）、文末「顶栏」段的
   `:root .chrome`（0,2,0）。而 `:root[data-bg]` 只有 (0,2,0) —— **auto 模式**
   （不写 `data-theme`）下它与 `:root .chrome` 同权重、又排在前面，会被盖回不透明。
   修法：选择器一律写成 `:root:root[…]`，抬到 (0,4,0) 以上，不依赖源序。
2. **两层 0.86 相乘会把壁纸洗没。** `.studio-rail-head` 是 `.rail` 的**子元素**，
   把它和 `.rail` 并列在同一条 86% 规则里，它会得到 (0,5,0) 的权重、盖掉
   "透明"那条，于是两层半透明相乘 —— 实测该点 spread 只剩 3，肉眼就是块死白。
   修法：头部**透明**，让 `.rail` 只画一层（官方表里它本来就没有底色）。

**③ 外壳变了，三处真坏了（都是量出来的）**

| 症状 | 根因 | 修法 |
| --- | --- | --- |
| ☰ 与面包屑**交叠 16px**（整个文件夹图标） | 2.36 把 ☰ 从 `.chrome` 里搬出来，改成 `.app` 下 `position:fixed` 的一层（`left: calc(--lights-w + 10px)`）；而本层 ⑰ 又把 `.chrome` 拉成通栏，面包屑于是落回 x=12 | `.chrome` 的 `padding-left` 改成从窗口左边直接量：`calc(var(--lights-w) + 52px)`。实测 folder 由 `12,14` 移到 `52,14`，交叠 −12px |
| 左轨会**滑偏 / 留下空白轨** | 2.36 换了收放模型：`width: var(--nav-w)` 改成**定宽 + 平移**（`width: var(--nav-open)` + `translate: calc(var(--nav-w) - var(--nav-open))`）。只钉 `--nav-w` 的话，两者一旦不等，translate 就把图标轨滑走 | `--nav-w` 与 `--nav-open` **一起**钉 48px，translate 恒为 0 |
| 收起左轨时，反馈钮**悬空在屏幕左沿** | 2.34 起官方只在左轨不可见时才渲染 `.railfoot`，而本层 ㉕ 照着这个节奏放行它 —— 于是 ㉙ 那组"把反馈钮搬到左轨"的规则在左轨**不在**的时候也生效了，把按钮从 footer 里拽到 x=6 | ㉙ 整段（含它下面所有 `.railfoot .studio-feedback` 规则）都挂上同一个 `:has()` 前提 |

另外两处**跟着 2.36 改选择器**（不是坏，是搬了家）：

- ☰ 的悬停提示：`.chrome .studio-menu::after` → `.studio-menu::after`
  （元素移出了 `.chrome`）。顺带删掉 `position: relative` 那条 —— 它自己已经是
  `fixed`，写 `relative` 反而会把按钮拽进文档流。
- `tools/verify-tip.mjs` 里同样写死的 `.chrome .studio-menu` 一并改掉。

`.studio-collapse`（侧栏头部那个切换钮）2.36 已从 `Sidebar.tsx` 整个删掉，
本层那条 `display:none` 于是成了死规则 —— **但保留**，因为 2.27–2.35 还有这个
元素，删了会为老版本分叉。文件里已注明它在 2.36 上不生效。

**④ 恢复左轨的「会话」图标（按使用者要求）**

2.27 起本层一直有一条规则把左轨第一格藏掉：

```css
.navgrp:not(.foot) > .navbtn:first-child { display: none !important; }
```

当初的理由是"它唯一的作用是把设置面板关掉，而设置面板自己就有返回"。
**这个理由只描述了它的一半行为**：`Nav.tsx` 的 `TO` 表把它定义成
`["chat", "会话", null]`，2.36 的 `onClick` 是 `at === null ? onRail() : onHome()` ——
不在设置页时它是「切换侧栏」，在设置页里时才是「回到会话主页」。
（2.27–2.35 都是无条件的 `onHome()`，所以"切换侧栏"这一半是 2.36 新增的用法；
但"当前页指示"那一半一直成立，见下。）

还有两点当初没注意到：

1. 它是左轨的**当前页指示**。判定是 `aria-current={(sec ?? null) === at ? "page" : undefined}`
   逐格比对，chat 的 `sec` 为 `null`，所以 `at` 为 `null`（会话页，默认态）时
   标记的就是它；其余图标只在 `at` 等于各自 `sec` 时才亮。藏掉它，
   默认态下左轨就没有"当前在哪一页"的指示了。
2. 2.33–2.35 的 `TO` 表里**没有** `files`，所以那时左轨是 8 个图标
   （TO 5 + foot 3）；2.36 补上了 `files`，恢复 chat 后是 **10 个**（TO 7 + foot 3）。

按本项目「不藏功能入口」的原则（§六），这条隐藏规则已删除。
实测恢复后：`button.navbtn[aria-label=会话 aria-current=page]` 在 `6,52 36x36`，
命中测试 `(24,70)` 落在 `svg → button.navbtn` 上（真的可见可点），
light + dark 均 `errs=0`，其余盒子与基线一致。

**⑤ 验证方式也更新了**

- `tools/shot.mjs` 新增 `SHOT_PACK=<theme.json>`：颜色既然归包，单跑覆盖层就
  拍不出真实观感，截图必须连包一起装。
- 新增 `tools/pack.mjs`：`theme.ts` 的忠实复刻（SURFACE 映射 / DERIVED / WASHES /
  `:root:root[data-pack]` 那条规则），供任何脚本按官方方式装包。
- **`audit.mjs` 会误报**：它只跑一个浅色、无包的页面，于是暗色选择器、伪元素、
  `data-bg` 规则、各种状态型规则**必然**报 0。实测 48 条"命中 0"里只有 16 条
  在任何状态下都命中 0，其余 32 条都是误报。所以另加了
  **`tools/audit-states.mjs`**：它把同一份 CSS 跨 11 种页面状态
  （浅色/暗色、有图包/sky 包、空态、首次开屏、左轨 on/collapsed/off、
  点开浏览器）各数一遍、取最大命中，报出来的才是真死规则。
  **判断死规则请用它，不要直接读 `audit.mjs` 的输出。**

四版一致性（同一组探针，皮肤生效后，light + dark 均 `errs=0`）：

| 版本 | `.nav` | `.rail` | ☰ 命中 | ☰ 位置 |
| --- | --- | --- | --- | --- |
| 2.27 | `0,44 48x956`（static） | `48,44 264x956` | `path` | 在 `.chrome` 内 |
| 2.32 | `0,44 48x956`（static） | 同上 | `path` | 在 `.chrome` 内 |
| 2.33 | `0,44 48x956`（**fixed**） | 同上 | `path` | 在 `.chrome` 内 |
| 2.36 | `0,44 48x956`（fixed + translate 0） | 同上 | `studio-menu` | **`.app` 下的 fixed 层** |

**2.33.0**（2026-10-09）

升级本身先把补丁抹了：`dist\index.html` 整个换成新版、`dist\assets\` 里我们放的
`codex-ink.css` 也被清掉 —— 重跑一次 `install.ps1` 即恢复（`v=2dc86e87`，
与源文件 SHA256 一致）。除此之外改了四处，全在 `codex-ink.css`：

1. **类名零改名**：覆盖层引用的 99 个类名与 2.33 主样式表
   `assets/index-Qz3Px4FQ.css`、JS bundle 对照后全部命中（未命中的 5 个只在
   注释里）。真正变的是**外壳的布局层**。
   （注：这 99 个是 2.33 那轮的数；2.36 这一轮改为按**选择器**数，见本节顶。）
2. **图标轨从"被收成 0 宽"变成 Studio 的正式功能**：2.27/2.32 里外壳把 `.nav`
   写成 `display:none`，是补丁把它放出来的；2.33 起它本身就是左边缘一条全高
   固定层（`position:fixed; inset:0 auto 0 0`），会盖住通栏顶栏左端的 ☰ ——
   命中测试由 `path` 变成 `nav.nav`。补 `.nav { top: var(--chrome-h) }`，
   并把 `padding-top` 收回 8px，图标落点与旧版一致（44 + 8 = 52）。
3. **列序与显式放置沿用 2.32 的修法**：2.33 的 studio 层仍给
   `.main { grid-column:3 }` / `.side { grid-column:4 }` 显式放置（只是不再显式
   放 `.nav`），皮肤那两条 `.nav { grid-column:1 }` / `.main { grid-column:3 }`
   钉子继续生效，三版一致，无需再改。
4. **`--nav-w: 48px` 只在 `[data-nav]` 不是 `off` 时钉**：2.33 用
   `data-nav="off"`（同时把 `.nav` 标 `inert`、宽度交回 `--nav-w:0`）表达
   "这一格此刻不该出现"。无条件钉 48px 会把用户选的「收起 / 关闭」变成一条
   空白轨，或一条看得见却点不动的轨。
5. **左轨自带反馈入口，皮肤不再代搬**：2.33 的 `Nav.tsx` 自己就把 feedback 钮
   放进了 `.navgrp.foot` 第一格（还带官方的 `FeedbackBadge` 未读数）。皮肤 ㉙ 段
   若照旧从 `.railfoot` 搬一个过来，同一格里就是两个反馈图标 + 两个徽标 ——
   实测皮肤搬来的在 `6,871 36x36`、官方的在 `6,876 36x36`，交叠 `36x31`
   （即"打开侧栏时反馈图标重叠"）。故该段加判据：

   ```css
   .app:has(.nav):not(:has(.nav [data-action="feedback.open"])) .railfoot { … }
   ```

   判据不能看 `data-nav`（2.32 已有，区分不出两代），也不能只判"没有 feedback
   入口"（2.33 关掉左轨时 `.nav` 会被摘出 DOM，会留下一个孤钮）。

三版一致性（同一组探针，皮肤生效后，light + dark 均 `errs=0`）：

| 版本 | `.nav` | `.rail` | ☰ 命中 |
| --- | --- | --- | --- |
| 2.27 | `0,44 48x956`（static） | `48,44 264x956` | `path` |
| 2.32 | `0,44 48x956`（static） | 同上 | `path` |
| 2.33 | `0,44 48x956`（**fixed**） | 同上 | `path` |

**2.32.0**（2026-10）

外壳换了 `.cols` 的列序（改成 rail 优先）并改用**显式放置**：studio 层把 `.nav`
钉进第 2 轨、`.main` 钉进第 3 轨。皮肤又把列序改回
`[--nav-w][--rail-w][1fr][--side-w]`，于是图标轨落进 264px 的侧栏轨、与 fixed
的 `.rail` 整体重叠（实测 `.nav` 由 `0,44 48x956` 变成 `48,44 264x956`）。
补 `.nav { grid-column:1 }` 与 `.main { grid-column:3 }` 两条。

**2.29.0**（2026-10）

类名与关键变量零变化，覆盖层无需改选择器。但这一版给主题包开了口子：
装饰角色拆成 `link` / `brand` / `halo` / `labelAgent` 四个可主题化 token，
取值改由 `<style id="pack-theme">` 下发 —— `theme-pack/` 自此可用，
所以主题包要求 Studio 2.29+（更早的版本会忽略这四个 token）。

**2.27.0**（2026-10）

DOM 与上一轮（2.26）高度一致。清掉 3 组因官方改过 JSX 而落空的死规则
（`.studio-brand .studio-search`、`.crumb .reveal-action`、`navbadge`），
并按纯 CSS 方式重做。

### 还原

```powershell
pwsh -File uninstall.ps1
```

（也可以直接双击 `codex-ink\取消应用.cmd`，它跑的就是同一条命令。
Studio 装在非默认路径时得走命令行把目录递进去 —— 两个 `.cmd` 都会把额外参数
原样透传给 `.ps1`：`取消应用.cmd -StudioDir "D:\Reasonix Studio"`。）

脚本不改动官方文件本身，只往 `dist/assets/` 放一个新文件、往 `index.html`
挂一行 link，随时可完全摘掉。

---

## 三、验证数据

用官方 `studio` 分支源码构建的性能台（`vite build --config vite.perf.config.ts`
→ `dist-perf` → `vite preview`）渲染真实 App，Playwright 出图 + 量计算样式。

**2.29.0 复核**（2026-10）：把覆盖层引用的类名（剥注释后 62 个）与 2.29 的
主样式表 `assets/index-CLMzK0YN.css` 及 JS bundle 对照——全部命中，无死规则；
关键变量 `--nav-w` / `--rail-w` / `--side-w` / `--shadow-float` 也都在。
覆盖层无需为 2.29 改选择器。

**2.39.0 复核**（2026-10-14）：覆盖层引用的 **114 条选择器**，跨 **13 种页面状态**
（2.36 那 11 种之外补了窄窗 scene 折叠与它的暗色 —— 2.39 起 ☰ 只在那一种形态里挂载）
逐条数命中 —— **95 条至少在一个状态下命中**。余下 **19 条**全部查清：

| 命中 0 的 | 为什么 | 算死规则吗 |
| --- | --- | --- |
| `.studio-collapse` ×2 | 2.36 起 `Sidebar.tsx` 就没有这个元素了 | 是（保留给 2.27–2.35） |
| `.studio-brand-mark` | 2.39 起品牌区换成图片 lockup，这个方块不存在了 | 是（保留给 2.27–2.36） |
| `:root .studio-brand-accent` | 同上（前端里已无此类）；官方自己改在 `:root[data-pack]` 下接 `--brand` | 是（保留给 2.36 及更早） |
| `.rail .wsmeta, .rail .rmtsub` | 两者 2.39 仍由 `Workspaces.tsx` / `RemoteHosts.tsx` 渲染 —— 只是探针里没有"多工作区 / 远端主机"的会话树 | 否，需状态 |
| `.oobe` | 开场仪式那一屏；性能台的 `welcomeSeen()` 直接返回 `true`，走不到 | 否，需首启 |
| `.flow .opt[data-on]` | 要一张提问卡；探针里没走到那个回合 | 否，需状态 |
| `.ptab[aria-selected="true"]` | 官方 studio.css 把 `.panetabs` 整条藏了（**2.39 删掉了 `display:none` 那条，但默认仍关着**：session tabs 是 Settings → Appearance 里的 opt-in） | 是（官方自己关的） |
| ㉕/㉙ 的 `.railfoot` 那一组 ×12 | 判据就是"左轨不在屏幕上"，所以左轨在时**应当**不命中 | 否，按设计 |

**2.36.0 复核**（2026-10-12，历史）：114 条选择器 / 11 种状态，98 条命中、
16 条命中 0：

| 命中 0 的 | 为什么 | 算死规则吗 |
| --- | --- | --- |
| `.studio-collapse` ×2 | 2.36 已从 `Sidebar.tsx` 删掉这个元素 | 是（保留给 2.27–2.35） |
| `.oobe` | 开场仪式那一屏；性能台的 `welcomeSeen()` 直接返回 `true`，走不到 | 否，需首启 |
| `.flow .opt[data-on]` | 要一张提问卡；探针里没走到那个回合 | 否，需状态 |
| `.ptab[aria-selected="true"]` | 官方 studio.css 用 `display:none !important` 把 `.panetabs` 整条藏了（2.27/2.33/2.36 三代都藏） | 是（官方自己关的） |
| ㉕/㉙ 的 `.railfoot` 那一组 ×12 | 判据就是"左轨不在屏幕上"，所以左轨在时**应当**不命中 | 否，按设计 |

> **`audit.mjs` 会误报，别直接信它的"命中 0"。** 它只跑一个浅色、无包的页面，
> 于是暗色选择器、伪元素（`::after`）、`:hover` / `:focus-within`、`data-bg` 规则、
> 以及各种状态型规则**必然**报 0。2.36 这一轮它报 48 条，实际在任何状态下都
> 命中 0 的只有 16 条 —— 三分之二是误报。判断死规则前先把页面摆到该在的状态。

真正变的是**外壳的布局层**，五代改法各不相同：

| | 2.27 | 2.32 | 2.33 | 2.36 | 2.39 |
| --- | --- | --- | --- | --- | --- |
| `.cols` 列序 | `0 var(--rail-w) …` | `var(--rail-w) var(--nav-w) …` | `var(--nav-w) var(--rail-w) …` | 同 2.33 | 同 2.33 |
| 图标轨 `.nav` | `display:none !important` | `grid-column:2`（流内第 2 轨） | `position:fixed; inset:0 auto 0 0`（左边缘固定层） | 定宽 + 平移：`width:var(--nav-open)` + `translate:calc(var(--nav-w) - var(--nav-open))`，z-index 13，去掉 `overflow:hidden` | 同 2.36 |
| 侧栏 `.rail` | `inset:0 auto 0 0` | 同 2.27 | `inset:0 auto 0 var(--nav-w)` | 同 2.33 | 同 2.33；但折叠改由**分隔条**负责（`RailToggle` 只在窄窗挂载），窄/中窗下 `.rail` 由官方自动折到 1px |
| 顶栏 `.chrome` | `margin-left: var(--rail-w)` | 同 2.27 | `margin-left: calc(var(--nav-w) + var(--rail-w))` | 同 2.33，但 `padding-left` 改为给固定的 ☰ 让位 | 同 2.33；**不再给 ☰ 让位**（桌面没有 ☰ 了） |
| ☰ `.studio-menu` | 在 `.chrome` 内 | 同 2.27 | 同 2.27 | **移出 `.chrome`**，成 `.app` 下 `position:fixed` 的一层 | **只在窄窗 `data-fold~="scene"` 的抽屉形态里挂载**（`RailToggle.tsx`，z-index 40 → 39） |
| 品牌区 `.studio-brand` | 方块 + 两行字 | 同 | 同 | `.studio-brand-mark` 方块 + 字 | **图片 lockup**：`img.studio-brand-logo`（118×24）+ 9px 副标题 = 34px |

皮肤因此补了五处（都写在 `codex-ink.css` 里，且对别的版本无副作用）：

1. **2.32 换列序的同时也换了显式放置**（studio 层把 `.nav` 钉进第 2 轨、
   `.main` 钉进第 3 轨）。皮肤又把列序改回 `[--nav-w][--rail-w][1fr][--side-w]`，
   于是图标轨落进 264px 的侧栏轨、与 fixed 的 `.rail` 整体重叠（实测 `.nav`
   由 `0,44 48x956` 变成 `48,44 264x956`）。补 `.nav { grid-column:1 }` 与
   `.main { grid-column:3 }`。
2. **2.33 把图标轨改成全高贴边层**，会盖住通栏顶栏左端的 ☰（命中测试由
   `path` 变成 `nav.nav`）。补 `.nav { top: var(--chrome-h) }`，并按旧版把
   `padding-top` 收回 8px —— 图标落点与旧版一致（44 + 8 = 52）。
3. **`--nav-w: 48px` 只在 `[data-nav]` 不是 `off` 时钉。** 2.33 起外壳用
   `data-nav="off"` 表达"这一格此刻不该出现"（2.36 里它等价于
   `navRail.shown === false`：用户选「收起」时侧栏一展开它就变 off）；
   照旧无条件钉 48px，会把用户选的「收起 / 关闭」变成一条空白轨，
   或一条看得见却点不动的轨。**2.36 起还要一起钉 `--nav-open`** —— 见下条。
4. **2.36 的图标轨要钉两个变量。** 收放模型从"改宽度"变成"定宽 + 平移"：
   `--nav-w` 决定 `.cols` 里留多宽，`--nav-open` 决定这一层本身多宽、
   以及 `translate` 的基准。只钉前者，两者一旦不等（官方改开合宽度、
   或将来加密度档），translate 就会把图标轨滑偏一截。两个一起钉 48px，
   `translate` 恒为 `0px`。
5. **2.36 的 ☰ 要让出位置。** 它从 `.chrome` 里搬出来成了 `.app` 下的 fixed 层
   （`left: calc(var(--lights-w) + 10px)`），而皮肤把 `.chrome` 拉成了通栏 ——
   面包屑于是落回 x=12，正好压在 ☰（10..40）上。实测交叠 **16px**（整个文件夹
   图标）。官方的算法 `max(20px, calc(--lights-w + 50px - --nav-w - --rail-w))`
   建立在"`.chrome` 从 x=312 起"的前提上，通栏后要改成从窗口左边直接量：
   `padding-left: calc(var(--lights-w) + 52px)`。

五代一致性（同一组探针，皮肤生效后）：

| 版本 | `.nav` | `.rail` | ☰ 命中 | ☰ 位置 |
| --- | --- | --- | --- | --- |
| 2.27 | `0,44 48x956`（static，padding-top 8） | `48,44 264x956` | `path` | 在 `.chrome` 内 |
| 2.32 | `0,44 48x956`（static，padding-top 8） | 同上 | `path` | 在 `.chrome` 内 |
| 2.33 | `0,44 48x956`（**fixed**，padding-top 8） | 同上 | `path` | 在 `.chrome` 内 |
| 2.36 | `0,44 48x956`（fixed，`translate: 0px`） | 同上 | **`studio-menu`** | **`.app` 下的 fixed 层（10,7 30x30）** |
| 2.39 | `0,44 48x956`（fixed，`translate: 0px`） | 同上 | **宽窗无元素；窄窗 `studio-menu`** | 窄窗（560px）为 `10,7 30x30`；桌面改由侧栏分隔条折叠 |

左轨三种模式下（2.36 实测，皮肤生效）：

| `rx-nav-rail` | `.app[data-nav]` | `.nav` | `.rail` | `.railfoot` |
| --- | --- | --- | --- | --- |
| `on`（默认） | `on` | `0,44 48x956`，translate `0px` | `48,44 264x956` | 官方不渲染（左轨已在） |
| `collapsed` + 侧栏开 | `off` | `-48,44 48x956`，translate `-48px` | `0,44 264x956` | `0,876 264x124`，反馈钮**留在侧栏里**（`14,916 236x32`） |
| `off` | `off` | 不在 DOM 里 | `0,44 264x956` | 同上 |

2.27.0 的 DOM 与上一轮（2.26）高度一致：覆盖层的 113 条规则里，
只有 3 组因上一轮改过 JSX 而落空（`.studio-brand .studio-search`、
`.crumb .reveal-action`、`.navbadge`），已按纯 CSS 方式重做或删除。

| 高饱和彩色元素 | 浅色 | 暗色 |
| --- | --- | --- |
| 改造前 | 154 处 / 7 种 | 35 处 / 6 种 |
| 2.33 改造后 | **0 处** | **1 处** |

（暗色剩的那 1 处是用户消息气泡 `#1e3a5c`——Codex 自己也用这一抹浅蓝。
统计只算真正画出来的元素，隐藏节点不计入。）

**2.36 起这张表不再由覆盖层决定**：颜色归主题包，所以"压掉多少彩色"取决于
装了哪个包。下面这组是**装 `theme-pack/codex-ink`（墨白）+ 覆盖层**，
在 2.36 性能台上实测的残留（性能台自带的 bench 包与墨白不同色，故数字与
上面的历史值不可直接比）：

| 场景 | 高饱和彩色 | 都是什么 |
| --- | --- | --- |
| 浅色 · 墨白包 | 29 处 / 3 种 | 浏览器按钮的 `--net` 蓝、反馈未读徽标、用户气泡（都是**信息**，按设计保留） |
| 暗色 · 墨白包 | 5 处 / 1 种 | 品牌强调字（`--brand` 在暗色下是 `#FFFFFF`，但 2.36 的 bench 包给了别的色） |
| 浅色 · 无包 | 22 处 / 1 种 | 只剩浏览器按钮的 `--net` 蓝 |
| 暗色 · 无包 | 5 处 / 1 种 | 同上 |

关键盒子与底色：

| | 改造前 | 改造后 |
| --- | --- | --- |
| 最左图标轨 `.nav` | `display:none`，0×0 | 48×956，10 个图标（2.33–2.35 是 8 个，那时「会话」被隐藏，见 changelog ④） |
| 顶栏 `.chrome` | 从 x=312 起（被侧栏推开），高 54 | **通栏 0..1600，高 44**；左内边距 12px（2.36 时为给 ☰ 让位而是 52px，2.39 桌面已无 ☰） |
| 侧栏头部 `.studio-rail-head` | 333px（品牌行 / 新建 / 搜索三行） | **167px**（品牌行 26px，搜索钉在右侧）；**2.39 起品牌是两行 lockup，头部随之到 175px** |
| 侧栏脚 `.railfoot` | 124px（钱包 / 反馈 / 账户） | **整块隐藏**，会话列表铺到底（2.27–2.33）；**2.34 起官方只在左轨不可见时才渲染它**，那时皮肤也照旧放行（见 §四） |
| 外壳三档 | nav 与 map 同调 | 浅 `246` / 侧栏 `252` / 内容 `255`；暗 `15` / `22` / `17`（由包的 `--page` / `--surface` / `--overlay` 混出，换包跟着走） |
| 空态幽灵 logo | 30×30 | 64×64 |
| 品牌 wordmark | —（2.36 及更早是方块 + 文字） | **2.39 起是官方那张图片 lockup**（118×24 + 9px 副标题），按使用者选择保留原色 |

图见 `preview/`：

| 文件 | 内容 |
| --- | --- |
| `before-light-top.png` / `before-dark-top.png` | 改造前的顶栏与侧栏 |
| `after-light-top.png` / `after-dark-top.png` | 改造后的同一区域 |
| `codex-ink-light.png` / `codex-ink-dark.png` | 整页 |

### 一个必须记住的坑：四级文字色（2.36 起已经不用提权了）

2.27–2.35 时 `src/ui/theme.ts` 的 `apply()` 会把四个 ink 变量
（`fg` / `fgStrong` / `fgDim` / `fgFaint` → `--text` / `--text-strong` /
`--muted` / `--faint` / `--ghost`）**内联**写到 `<html>` 上：

```ts
for (const name of Object.keys(STEPS)) {   // fg, fgStrong, fgDim, fgFaint
  const authored = pack?.tokens[scheme]?.[name];
  const from = authored || base.getPropertyValue(SURFACE[name][0]).trim();
  if (!authored && from) root.style.setProperty(v, ink(from, name, scheme, contrast));
}
```

内联优先级高于任何选择器，所以那时外部样式表改这四个变量**只能提权**。
实测：套上覆盖层后 `--page` 从 `#efefec` 变成 `#ffffff`，而 `--text` 纹丝不动
（还是默认的 `#292b29`），加 `!important` 才生效。

**2.36 改掉了这个写法** —— 整份取值走 CSSOM 写进一条
`<style id="pack-theme">` 里的 `:root:root[data-pack] {}` 规则：

```ts
const style = place(owned);            // <style id="pack-theme">
sheet.insertRule(`${SELECTOR} {}`);    // SELECTOR = ":root:root[data-pack]"
for (const [name, value] of paint) decl.setProperty(name, value);
```

那条规则的特异性是 **(0,3,0)**，覆盖层的 `:root[data-theme="light"]` 只有
(0,2,0) —— 于是**包天然胜出**。覆盖层因此不再需要、也不该再用 `!important`
去钉这四个变量；2.36 这一轮把整段删掉了。实测：留着旧那段时 `--text` 被钉成
覆盖层的旧值 `#1a1c1f`；删掉后变成包给的 `#12191C`。

> 这也是"颜色归主题包"能成立的技术前提。只要 2.36 还走内联，覆盖层就必须提权，
> 一提权包就永远改不动那四个色 —— 两件事是同一个开关。

### 第二个坑：shorthand 会悄悄重置你分开写的 `background-*`

同一条 `studio.css` 里还有 `:root[data-theme="light"] .chrome { background: … !important }`。
它是 **shorthand**，特异性 (0,2,0) 又高过 `.chrome` (0,1,0)，于是把单独声明的
`background-size` / `background-position` / `background-repeat` 一律重置回默认值：

```
backgroundSize: auto        backgroundPosition: 0% 0%      backgroundRepeat: repeat
```

后果是"只想画最底下 1px"的那条渐变**铺满整条顶栏**，从 x=48 起整片叠上 7% 的黑——
顶栏量到 `rgb(229,229,229)`（246 × 0.93），而左轨是 `rgb(246,246,246)`，
肉眼就是**顶栏和左轨有色差**。

修法：整条 `background` 一起写（shorthand 里 size/position/repeat 都跟着走），
并站到同特异性 (0,2,0) 的选择器上，让源序替你说话——见 `codex-ink.css` 里
「顶栏：底色 + 底部一条线」。

> 教训：覆盖别人的样式表时，**别把 shorthand 属性拆开单独写**。
> 对方只要有一条同属性的 shorthand，就会把你拆开的那些悄悄抹回默认值。

### 第三个坑：`getBoundingClientRect()` 说"在"，不等于"画出来了"

这个陷阱在同一个补丁里咬过两次，值得单列一条。

判断元素是否真的可见，**要用命中测试**（`document.elementsFromPoint(x, y)`），
不能只看 `getBoundingClientRect()` —— 后者给的是**布局**位置，元素被祖先的
`overflow` 裁掉时它照样报得好好的：

| | `getBoundingClientRect()` | 该点的 `elementsFromPoint` |
| --- | --- | --- |
| 面包屑上搬来的 `workbench.reveal` 按钮 | `50,11 22x22` | `.crumb > .chrome > .app` —— 按钮**不在列表里** |
| 左轨的反馈按钮（还是 `absolute` 时） | `6,871 36x36` | `nav.nav` —— 按钮**不在列表里** |

两处都是被祖先的 `overflow: hidden` 裁掉：前者挂在 `.pane` 那条低层级分支上；
后者是因为 `.rail` 是 `position: fixed` + `overflow: hidden`，而按钮要落在它左边界之外
（左轨在 x=6，`.rail` 从 x=48 起）。

修法也是同一条：**把它的 containing block 挪到裁剪元素之外**。反馈按钮改用
`position: fixed`（containing block 是视口，祖先的 overflow 裁不到）就好了；
面包屑那个没救——层级不对，且那个按钮在另一条分支上。

### 第四个坑：`!important` 救不了"被自己的后文翻盘"

2.36 加壁纸时踩到的一个变体：同一条规则既要在**显式主题**下生效，
又要在 **auto 模式**（`<html>` 上根本没有 `data-theme`）下生效，而后者权重会掉一档。

具体：覆盖层里画外壳的那几条都带 `!important`，且分别站在
`:root[data-theme="light"] .rail`（0,3,0）与 `:root .chrome`（0,2,0）上；
新加的壁纸规则写成 `:root[data-bg] :is(.chrome, .nav)` 只有 (0,2,0) ——
auto 模式下它与 `:root .chrome` **同权重**，而后者排在文件更后面，于是把它盖回不透明。
显式主题下权重更高，看不出问题；**只有 auto 模式会坏**，而那是默认设置。

修法：选择器写成 `:root:root[data-bg] …`（多写一个 `:root` 抬到 (0,4,0)），
不去赌源序。实测这一改之后 light / dark / auto 三种模式全屏扫描都一致。

> 教训：**`!important` 只解决"别人权重更高"，不解决"自己和别人同权重"**。
> 同一份样式表里后写的规则会赢过先写的，所以覆盖层自己的规则之间也会互相翻盘 ——
> 改一处之前，先数清楚有没有别处也在画同一个面。

同一条坑的第二个变体：**别把子元素和它的父元素并列在同一条规则里**。
`.studio-rail-head` 是 `.rail` 的子元素，两者并列写进那条 86% 半透明规则后，
头部会拿到 (0,5,0) 的权重、反过来盖掉"透明"那条 —— 于是两层 0.86 相乘，
把壁纸洗没（实测该点 spread 只剩 3，肉眼就是块死白）。修法：头部**透明**，
让 `.rail` 只画一层（官方表里它本来就没有底色）。

---

## 四、已知边界：这些 CSS 做不到

打的是**纯 CSS** 补丁，不动官方源码。原先列的五条里：

- **一条后来做成了**（反馈按钮 + 未读数，见本节末）；
- **一条做成过、又按使用者要求撤掉了**（顶栏「打开项目文件夹」按钮，理由见本节末）；
- 剩下三条确实做不到：

1. **侧栏「项目 / 最近」两节 + 扁平最近列表**——`TreeSession` 没有时间戳字段
   （只有 `path/name/title/turns`），排不了序，得先给内核的 tree 加时间。
2. **视图页签并进顶栏同一行**——`view` 状态在 `Pane` 组件内部，得提到 `App`。
3. **左轨账号位换成别的图标**——要换 SVG path，CSS 画不出官方风格的图标。

### 一条原先"做不到"、后来做成了的

- **反馈按钮 + 未读数**（左轨底部）：左轨里加不了新元素，但侧栏脚里本来就有一个
  **真的** `data-action="feedback.open"` 按钮（内部带着 `<i class="fbk-badge">` 未读数）。
  把 `.railfoot` 收成 0 高、只让这一个按钮绝对定位跑到左轨那一列 —— 功能是真的，
  未读数跟着走。见 `codex-ink.css` ㉙。

  **2.33 起这一条由官方接管了**：`Nav.tsx` 自己就把 feedback 钮放进了左轨
  `.navgrp.foot` 的第一格（还带着官方的 `FeedbackBadge` 未读数）。所以 ㉙ 整段
  加了版本判据 —— 左轨里已经有 `data-action="feedback.open"` 就一律不搬，
  `.railfoot` 交回 ㉕ 段整块隐藏。不判的后果是同一格里两个反馈图标 + 两个徽标：
  实测皮肤搬来的在 `6,871 36x36`、官方的在 `6,876 36x36`，交叠 `36x31`，
  截图里就是"图标重叠"。

  **它只在侧栏展开时可见可点**（2.27–2.32）。收起侧栏后它会消失，两条原因叠在一起：

  1. `studio.css` 在收起态给 `.rail` 写了 `opacity: 0`，而 opacity 是**乘算**的
     绘制效果，后代覆盖不回来 —— 按钮虽然是 `position: fixed`、
     `getBoundingClientRect()` 照样报 `6,871 36x36`，整棵子树却一起透明。
  2. React 收起时还给侧栏加了 **`inert`**：`<div className="rail" inert={collapsed}>`
     （`Sidebar.tsx:182`，注释写着"inert 是「看不见就够不着」那一半"）。
     inert 让子树**照常绘制、但退出命中测试** —— 画得出来，点不动，也不出 hover 提示。

  第 1 条纯 CSS 能修（收回 `.rail` 的 opacity、改让 `.railscroll` 淡出；实测
  收起态与展开态的左轨底部截图逐像素一致）。**第 2 条修不了**：CSS 没有任何东西
  能取消 inert，它优先于 `pointer-events`（实测按钮本来就是 `auto`，点上去照样
  落到 `nav.nav`）。以下逐个试过、全部无效：宽度改回 264、`overflow: visible`、
  `z-index: 99`、`transform: translateZ(0)`、`will-change`、`isolation: isolate`、
  把 `.railfoot` 改成 `position: fixed`。**唯一有效的是把 `.railfoot` 移出 `.rail`
  子树**（改 DOM）—— 而 CSS 不能移动节点。

  所以"收起侧栏后仍能点发送反馈"只剩一条路：约 15 行 JS，把 inert 从 `.rail`
  挪到 `.railscroll`（真正被藏起来的正文仍进不了 Tab 顺序，语义不变）。
  **使用者选的是保持纯 CSS**，于是收起时它不显示 —— 不是被隐藏，是本来够不着。

### 一条做成过、又撤掉了的：顶栏「打开项目文件夹」

**这一处必须动事件**：CSS 没有事件机制（没有 `:click`，`:target` 只改样式不触发动作，
也没有能唤起文件管理器的 URL）——"换图标"是纯外观没错，但"点击打开"是行为，跟图标无关。
所以当时注入过一段 65 行的 `codex-ink.js`：在官方那个装饰 `<svg>` 上盖一层透明热区，
点击时调宿主自己的动词。实测点击后宿主确实收到了
`revealWorkspace("~/projects/DeepSeek-Reasonix")`。

**撤掉的原因是语义对不上**：那个动词在主进程里是 `shell.showItemInFolder(found.target)`，
Windows 上就是 `explorer /select` —— **打开父目录并选中该项**，
所以点 `C:\Dev\reasonix-skin` 会停在 `C:\Dev`，做不到"进入项目目录"。三条路都试过：

| 想让资源管理器 | 现有 API | 结果 |
| --- | --- | --- |
| 停在父目录 + 选中项目 | `revealWorkspace` → `shell.showItemInFolder` | ✅ 能做（与官方右键菜单那一项行为完全一致） |
| 进入项目目录本身 | `openExternal("file:///…")` | ❌ 被 `externalTarget` 拦掉，它只放行 http/https（注释写明"链接来自模型输出，不能把 scheme 的选择权交给它"） |
| 进入目录 | `shell.openPath` | ❌ 整个 `app.asar` 里 0 命中，没暴露 |

顺带记一笔纯 CSS 那边的尝试：工作台面板头部有个常驻的 `data-action="workbench.reveal"`
按钮（`title` 就是"在系统文件管理器中显示工作区"，传的是 `reveal("")` = 工作区根），
本想把它搬到面包屑上就不用脚本。但它被官方这条关着：
`.pane:has(>.pbody[data-dock]) .workbench-body:not([data-files]) .workbench-explorer { display:none }`。
用 `!important` 把 `display` 掰回 `block` 后，它的 `getBoundingClientRect()` 确实落在
`50,11 22x22`，可**它仍不参与绘制**——该点堆叠实测只有 `.crumb > .chrome > .app`。
它那条分支挂在外层低层级里，再被折叠容器裁一刀，既看不见也点不着。完整推演见
`codex-ink.css` ㉚ 的注释。

顺带把 **HTML 那条路**也堵死了，一并记下——这是最容易想当然的一条：
主窗口有 `guard()` 两道锁，

```js
contents.on("will-navigate", (event, url) => {
  if (!url.startsWith(origin + "/")) event.preventDefault();   // ① 只放行同源
});
contents.setWindowOpenHandler(() => ({ action: "deny" }));     // ② 新窗口一律拒，没有 fallback
```

所以往 index.html 里插 `<a href="file:///C:/…">` 撞①、`target="_blank"` 撞②，
**两者都是静默无反应**。（内置浏览器那套 handler 是有 fallback 的：`if (allowed(to)) onPopup(to)`；
主窗口这套没有。）源码注释写得很直白：
"anywhere else is refused rather than followed … a link leaves through the platform opener or not at all."

其余 HTML/CSS 手段也逐条不成立：`<input type="file" webkitdirectory>` 弹的是应用内的
"选择文件夹"对话框（而且是"选"不是"开"）；`<details>` 只能折叠；`<dialog>` 要 `showModal()`（JS）；
`:target`/`:hover`/`:focus` 只改样式、没有任何触发动作的能力；`<iframe>`/`<object>` 指向
`file://` 被 Chromium 的跨源策略挡死。

唯一真能做到"**不加脚本 + 直达根目录**"的路是**改主进程那一行**：在 `guard` 拒绝 `file://` 之前
把它交给 `shell.openPath`，再往 index.html 插一个 `<a href="file:///C:/…">`。但代价是改
`app.asar`（宿主本体，Studio 每次升级要重打，且比 CSS 补丁危险），而且路径写死、换工作区就不对了
（要跟着当前工作区走又得回到一小段脚本）。**未采纳。**

现在那个文件夹图标维持官方原样的**装饰**，整套补丁回到 100% 纯 CSS。

### 附：筛选条上的数字为什么会消失

现象：侧栏「会话」下面那排（全部 / 进行中 / 置顶 / 归档）的数字不见了。

这是**官方自己的响应式行为**，不是补丁的问题。`studio.css` 里有：

```css
.studio-rail-head { padding: 23px 22px 5px; container-type: inline-size }

@container (width <= 219px) {
  .studio-new-task kbd, .studio-search kbd, .studio-quicknav small,
  .studio-session-segments b { display: none }    /* ← 计数就是这个 .studio-session-segments b */
}
```

判断基准是**侧栏头部的内容盒宽度**（`container-type: inline-size` 量的就是内容盒），阈值 219px。
实测（改 `.studio-rail-head` 自身宽度，注意改 `--rail-w` 是没用的——它的宽度不跟着变量走）：

| `.studio-rail-head` 内容盒 | 计数 `<b>` |
| --- | --- |
| 240px（默认侧栏 264px 时） | `display: block` |
| 216px（侧栏 240px 时） | `display: none` |
| 176px（侧栏 200px 时） | `display: none` |

所以把侧栏往右拖宽到 **≥ 244px**（默认就是 264px）、或把「界面大小」缩放调回 100%，数字就回来了。
顺带一提：本补丁把 `.studio-rail-head` 的左右 padding 从 22px 收到 12px，
相当于把触发门槛从"侧栏 ≤ 263px"放宽到"侧栏 ≤ 243px" —— 恢复默认宽度即可。
真要让它**任何宽度都显示**，加一条
`.studio-session-segments b { display: inline !important }` 覆盖掉那个 `@container` 即可
（但窄侧栏下会挤，官方隐藏它正是为了给会话名让位）。

排查工具：`tools/verify-count.mjs`（把侧栏压到不同宽度，看计数还在不在）。

两条取舍，说明一下：

- **颜色归主题包，覆盖层不再钉任何颜色**（2.36 起）。以前覆盖层用 `!important`
  把四级文字色钉住，装了主题包也会被压住；现在整份调色板都交了出去，
  装包即包的色、换包即换色。留在覆盖层里的只有包词汇表表达不了的几样，
  且都从包的 token 派生（见 §三 与文件开头）。代价说清楚：
  **不装包就没有 Codex 的墨白**，只有布局与密度是 Codex 的 ——
  那时用的是 Studio 自带调色板（琥珀强调色）。
- **侧栏脚**（钱包与用量 / 发送反馈 / 账户行，连上下分隔线）：左轨在屏幕上时
  整块隐藏 —— 三个入口都还在别处（余额在底部状态条的按钮上，账号与登录在左轨
  底部的设置里，反馈在左轨 `.navgrp.foot`）。**但 2.34 起官方自己也只在左轨
  不可见时才渲染它**（`{!navShown && <div className="railfoot">…}`），
  那时它是这几个入口**唯一**的去处，所以皮肤跟着放行、不再无条件隐藏。
  反馈按钮分版本：**2.27–2.32** 由皮肤从侧栏脚"搬"到左轨底部（`codex-ink.css` ㉙，
  因为那两版官方左轨没有反馈入口）；**2.33 起官方自己就在左轨** `.navgrp.foot`
  第一格放了 feedback 钮，皮肤便不再搬（否则一格两个图标重叠）；
  **2.34 起还要加一条判据** —— 左轨被用户收起 / 关掉时 `.railfoot` 是会渲染的，
  若 ㉙ 那组规则不挂前提，就会把反馈钮拽出侧栏钉到 x=6，而那里此刻没有左轨，
  屏幕上是一枚悬空的图标（实测 collapsed 档下确实如此）。

---

## 五、目录

```
codex-ink/
  codex-ink.css     覆盖层正本（外壳分层 / 结构 / 密度 / 壁纸 / 收尾）—— 纯 CSS，无脚本
  install.ps1       打补丁（幂等，-Restore 可还原）
  uninstall.ps1     还原
  重新应用.cmd      双击跑 install.ps1（Studio 更新后重打用）
  取消应用.cmd      双击跑 uninstall.ps1（摘掉覆盖层用）
  theme-pack/       主题包（官方机制）：插件清单 + 墨白 / 蓝调两个 theme.json
                    —— **2.36 起它是配色的唯一来源**
  preview/          改造前后截图
  tools/            复核用脚本（运行非必需）
```

主题包装法：`reasonix plugin install <本目录>\theme-pack --link --yes`，
然后在 Settings → Appearance 里选「Codex Ink 墨白」。需要 Studio 2.29+
（四个装饰角色 token 从 2.29 起生效；更早的版本会忽略它们）。

> **Windows 上 `--link` 可能失败。** 实测 2.39 + Windows 10 下它报
> `dependency failure (*os.LinkError)` —— 创建符号链接要开发者模式或管理员权限。
> 去掉 `--link` 走复制模式即可：`reasonix plugin install <目录>\theme-pack --yes`，
> 安装结果一样（`mode: copy`），只是**改完包要重新装一次**。
> 目标已存在时先 `reasonix plugin remove codex-ink --yes` 再装
> （`--replace` 在同一环境下同样会撞 `*os.LinkError`）。

`tools/` 里的脚本用来复核这套改动：

| 脚本 | 作用 |
| --- | --- |
| `measure.mjs` | 变量表 + 高饱和彩色扫描（只算真正画出来的元素）+ 关键盒子 |
| `audit.mjs` | 逐条统计覆盖层选择器在真实页面里命中多少元素（**单页面，会误报，见下**） |
| `audit-states.mjs` | 同上，但跨 13 种页面状态各数一遍取最大命中 —— **判断死规则用这个**（2.39 起含两个窄窗 scene 折叠状态，因为 ☰ 只在那里挂载） |
| `pack.mjs` | 把一个 `theme.json` 按 2.36 的方式装进页面（`theme.ts` 的忠实复刻），供其它脚本复用 |
| `dom.mjs` | 打印某个容器的 DOM 子树（类名 + 盒子 + 隐藏标记） |
| `shot.mjs` | 出图（`SHOT_FULL=1` 整页，`SHOT_QUERY=` 换形态，`SHOT_PACK=` 连包一起装） |
| `trace.mjs` | 列出能匹配某元素的 CSS 规则，用来问"这个颜色哪条规则给的" |
| `pixel.mjs` | 采样 PNG 的像素值——"这块到底是什么颜色"，判断有没有色差用这个，不要靠肉眼 |
| `at.mjs` | 给定坐标输出该点最上层元素链与各自背景，并打印某元素的关键计算样式 |
| `scanpng.mjs` | 整图扫描高饱和彩色像素，按颜色聚簇报位置——用来验证"界面真的灰阶了吗"，包括真实 Studio 的截图 |
| `verify-tip.mjs` | 验证顶栏 ☰ 的悬停提示：展开/收起两种状态下 `::after` 的文案、以及 hover 时的透明度与位置。**必须在窄窗跑**（2.39 起 ☰ 只在 `data-fold~="scene"` 挂载） |
| `verify-count.mjs` | 把侧栏压到不同宽度，看筛选条上的计数还在不在 |
| `verify-ctx.mjs` | 核对用量五段色（`--cat-1..5` / `--io-*`）没被压灰 |

它们需要一份对应版本的 `frontend-next` 与 Playwright：

```bash
# 取对应 tag 的源码（本项目按 studio-v2.39.0 复核）
git clone --depth 1 --branch studio-v2.39.0 https://github.com/esengine/DeepSeek-Reasonix repo
cd repo/desktop/frontend-next
pnpm install --frozen-lockfile
# pnpm 11 会拦下 esbuild 的构建脚本；直接调 vite 绕开
node node_modules/vite/bin/vite.js build --config vite.perf.config.ts
node node_modules/vite/bin/vite.js preview --config vite.perf.config.ts --port 4399 --strictPort

# 另开一个终端，指向 clone 出来的 frontend-next
RX_REPO="$PWD" node ../../codex-ink/tools/measure.mjs ../../codex-ink/codex-ink.css
# 连包一起量（2.36 起颜色归包，这一步才看得到真实观感）
RX_REPO="$PWD" SHOT_PACK=../../codex-ink/theme-pack/codex-ink/theme.json \
  node ../../codex-ink/tools/shot.mjs ../../codex-ink/codex-ink.css shots
```

截图脚本用 `?pref=zh&ws=2&sess=6&turns=1`（性能台自带 MockPort，不需要内核）；
空态加 `&panes=0`，首次开屏加 `&onboarding`，带图/带 sky 的包用
`&pack=photo` / `&pack=sky`。

> **性能台有两条已知限制**（不影响上述结论，但别被它误导）：
> ① `vite preview` 不认识 `/themes/{id}/{asset}` 这条路由（它在 Go 服务端，
> `internal/frontend/serve/themes.go:22`），所以 `&pack=photo` 的背景图是 **404**、
> `body::before` 其实什么都没画。要验证"外壳让不让路"，得自己塞一张已知能解码的图
> （本项目用一张 data-URI 的双色 SVG），否则量到的是"没图"的普通外壳。
> ② 性能台的 `welcomeSeen()` 直接返回 `true`，走不到开场仪式那一屏（`.oobe`）。

---

## 六、这个覆盖层做了什么

**2.36 起分工**：颜色归主题包，这一层只管样式。下面这张表按这个分工分两段。

### 样式（这一层负责）

| 类别 | 处理 |
| --- | --- |
| 外壳分层 | 三档取自包的 `--page` / `--surface` / `--overlay`：chrome = `--surface`，侧栏 = 浅色 `--page` 65% + `--surface` 35%、暗色 `--page` 70% + `--overlay` 30%，内容 = `--page`。包为墨白时落到浅 `246 / 252 / 255`、暗 `15 / 22 / 17` —— 正是改造前实测的那三档 |
| 壁纸 | 包带图（`data-bg`）时外壳**让路**：chrome / 侧栏 80%（浅色 86%）半透明、清掉 `backdrop-filter`，`.tabs` / `.studio-rail-head` / `.compose` 一并放开。全屏扫描 97.5%（浅色）/ 99.6%（暗色、空态）看得见图，无整块遮挡 |
| 结构 | 图标轨回到最左并钉住 `--nav-w` + `--nav-open`（2.36 的收放模型）、下移到顶栏之下；顶栏通栏（2.39 起左内边距回到 12px —— 桌面已没有要躲的 ☰，窄窗抽屉形态才让位）；侧栏头部收成一行、搜索钉右侧；面包屑会话名归位；侧栏的应用级入口收进设置 |
| 密度 | 会话行高 30px、标题单行省略、去掉计数 |
| 圆角 | 大面 `--r-lg` 取 **18px × 包的 `--r-scale`**（Codex 的大圆角；2.39 起乘上包的 corners 配方），行填 8px |
| 浮层影 | 换成 Codex 实测的菜单影（细描边 + 克制投影），去掉默认 16px/40px 柔光 |
| 空态 | 幽灵 logo 与标题放大一号 |
| 品牌区 | **2.39 起是官方的图片 lockup**（118×24 wordmark + 9px 副标题），按使用者选择保留原色，本层只把它从"被 26px 裁掉"修回完整两行（34px） |
| 顶栏提示 | ☰（展开/隐藏侧栏）官方只有 `aria-label`、没有 `title`，用 `::after` + `[aria-pressed]` 补了一个**随状态切换**的悬停提示。（2.36 起它是 `.app` 下的 fixed 层；**2.39 起只在窄窗抽屉形态挂载**，桌面侧栏改由分隔条折叠） |
| 不藏功能入口 | 曾把顶栏的 `.phone-action`（**设备访问／手机直连**）连同侧栏入口一起隐藏，前者已恢复。**左轨的「会话」图标同理**：2.27–2.35 被本层 `display:none` 藏掉，2.36 起恢复（见 changelog ④）。教训：为了"形似 Codex"而藏入口，除非别处同样可达**且使用者明确同意** |

### 颜色（主题包负责）

| 类别 | 处理 |
| --- | --- |
| 调色板 | **不在这一层**。`theme-pack/` 经官方机制下发（`:root:root[data-pack]`，(0,3,0)），装包即包的色。不装包就是 Studio 自带调色板 |
| 信息色一律保留 | `--cat-1..5` / `--io-*`（用量五段的蓝/橙/绿/黄/粉）、`--net` / `--deleg`（运行 / 委派状态与 `.hostlab` / `.hl .src` 等 host 标签）、`--syn-*`（语法高亮）、`--ok` / `--warn` / `--err`。这些是**信息**不是装饰——压灰会让人分不出哪段是哪段。它们本就不在包的词汇表里（`tokens.go` 注明 "Absent on purpose"），这一层也不动 |
| 装饰角色 | `--link` / `--brand` / `--halo` / `--label-agent` 由**包**设（2.29 起的装饰角色 token）：theme-pack 里链接保留 Codex 蓝 `#339cff`，品牌色 / 悬停光晕 / 代理名标签收进灰阶 |
| 硬编码装饰色 | studio.css 浅色下把品牌强调字写死成 `#526a9f`（包够不到，不在令牌体系内）。本层不再自己指定颜色，改成把它接到包的 `brand` 令牌上 —— "零彩色 chrome"由**包**表达，本层只负责"这个元素该用 brand 这一档" |
| 派生色 | 包词汇表里没有的那几样，从包的 token 派生：`--focus` ← `--accent`，`--cx-bubble` ← `--link`（12% / 32%），`--cx-line` ← `--border`（67%）。**`--accent-ink` 2.39 起不再由本层另立**：官方新增了 `accentInk` token（包能设、有默认值、theme.ts 还带一条兜底），本层改用官方同一条公式 `color-mix(in srgb, var(--accent) 65%, var(--text))` |
| 首次开屏 | `.oobe` 是**恒定**近黑（官方注释："the ground is dark whatever the app theme is … a ceremony rather than a screen of the app"）。官方把它写死在 app.css 里、包够不到，本层只把它从带蓝的近黑收成中性近黑 `#0d0d0d`。首次**设置**屏（`.onb-*`）不归本层管 —— 2.36 的 studio.css 自己就接到了 `--text` / `--border` / `--focus` |

色值来源：Codex 实机截图逐像素测量（经 DSH 社区插件
[`rindbeans/codex-ui`](https://github.com/rinDBeans/codex-ui)，MIT）。
