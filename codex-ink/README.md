# Codex Ink —— Reasonix Studio 的 Codex 观感覆盖层

把 Reasonix Studio 换成 Codex 桌面端的样子：**零彩色 chrome、墨白灰阶即层级**、
最左一条图标轨、通栏灰壳顶栏、大圆角输入卡。

上路方式有两条，可单用也可叠加：

1. **CSS 覆盖补丁**（`codex-ink.css` + `install.ps1`）——外观恒定、能力最全，
   在已安装的 Studio 上打一层补丁；
2. **主题包**（`theme-pack/`）——纯官方机制，Studio 2.29 起用上
   `link / brand / halo / labelAgent` 四个装饰角色 token。

不是 fork——原因见第一节。覆盖层已按 **2.29.0** 复核（62 个类名全部命中，
无死规则，见第三节）。

---

## 一、为什么不走官方主题包（也不走插件）

**结论：主题包到今天仍只到 token 层，够不到结构；2.29 起装饰色这一块够到了。**

2.27 时"官方说增加了对主题的支持"指的是这一条 release note：

> 新增主题作者指南和可直接安装的纯主题示例 Paper Dawn，替换掉旧桌面时代的指南和**含无效字段的模板**（#11578）

——是**文档与示例的补齐**，不是能力扩展。2.29 则是一次**真的能力扩展**：
`#12030`（我们提的 `#12008` 的 first slice）把 `--net` / `--deleg` 兼职的
装饰角色拆成了四个可主题化的 token。三条证据（按 2.29 更新）：

### 1. 白名单从 25 个 token 扩到 29 个

`internal/ext/theme/tokens.go` 是权威表。2.27.0 时是 20 个颜色 + 3 个圆角 +
2 个字体栈；2.29.0 起新增四个**装饰角色**：`link` / `brand` / `halo` /
`labelAgent`（→ `--link` / `--brand` / `--halo` / `--label-agent`），
共 **24 色 + 3 圆角 + 2 字体栈**。状态色仍然**故意不在表里**：

> Absent on purpose: ok/warn/err/net/deleg carry meaning rather than taste

### 2. 保留变量在真实 CSS 里仍被引用数百次

`desktop/frontend-next/src/ui/theme.ts` 里还有一份 `RESERVED`：
`--ok --warn --err --net --deleg --add --del --focus`。

数 2.29.0 主样式表 `assets/index-CLMzK0YN.css` 里的引用次数：

| 变量 | 引用次数 | 主题包能改？ |
| --- | --- | --- |
| `--text` / `--border` / `--accent` / `--overlay` / `--surface` / `--raised` | 566 / 334 / 181 / 214 / 127 / 127 | 能 |
| `--err` / `--focus` / `--net` / `--warn` / `--ok` / `--deleg` / `--cat-1` | 150 / 123 / 79 / 62 / 78 / 17 / 8 | **不能** |
| `--link` / `--brand` / `--halo` / `--label-agent`（2.29 新增） | 5 / 11 / 7 / 5 | **能** |

这就是"装了主题包只有底色和字体变了"的量化原因：界面里绝大多数颜色，
挂在主题包碰不到的变量上。2.29 的拆分让链接 / 品牌 / 悬停光晕 / 代理名标签
这四类装饰色变得可主题化（约 30 条规则），但状态色与用量分类色仍不可达。

### 3. 换插件形式也不行

插件清单的能力只有 `Skills / Agents / Commands / Hooks / MCPServers / Prompts /
Themes / Runtime`。扩展协议 v2 的 `ui` 能力是让扩展**发布自己的**载荷
（`host/ui/publish`：status / card / form / notification / panel / view），
不是给宿主换皮。换插件包壳这条路不存在。

---

## 二、所以走这条路：给已安装的 Studio 打 CSS 补丁

Studio 的前端就是磁盘上的一个目录——从宿主进程的命令行能直接看到：

```
reasonix-studio-host.exe -page "...\Reasonix Studio\resources\frontend-next\dist" -studio-version 2.29.0
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
> ② `重新应用.cmd` 里**一个中文字都不能有**：cmd 按本地代码页解析批处理，
> 连 `rem` 注释里的中文都会被当成命令执行，`chcp 65001` 救不回来。
> 中文提示交给 `install.ps1` 输出。

判断"要不要重打"最快的办法：打开 Studio，看**最左那条图标轨**在不在 ——
它被 Studio 外壳收成 0 宽，只有补丁生效时才会露出来。
或者直接看 `dist\index.html` 里还有没有那行 `codex-ink.css`。

### 还原

```powershell
pwsh -File uninstall.ps1
```

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

2.27.0 的 DOM 与上一轮（2.26）高度一致：覆盖层的 113 条规则里，
只有 3 组因上一轮改过 JSX 而落空（`.studio-brand .studio-search`、
`.crumb .reveal-action`、`.navbadge`），已按纯 CSS 方式重做或删除。

| 高饱和彩色元素 | 浅色 | 暗色 |
| --- | --- | --- |
| 改造前 | 154 处 / 7 种 | 35 处 / 6 种 |
| 改造后 | **0 处** | **1 处** |

（暗色剩的那 1 处是用户消息气泡 `#1e3a5c`——Codex 自己也用这一抹浅蓝。
统计只算真正画出来的元素，隐藏节点不计入。）

关键盒子与底色：

| | 改造前 | 改造后 |
| --- | --- | --- |
| 最左图标轨 `.nav` | `display:none`，0×0 | 48×956，8 个图标 |
| 顶栏 `.chrome` | 从 x=264 起（被侧栏推开），高 54 | **通栏 0..1600，高 44** |
| 侧栏头部 `.studio-rail-head` | 333px（品牌行 / 新建 / 搜索三行） | **167px**（品牌行 26px，搜索钉在右侧） |
| 侧栏脚 `.railfoot` | 124px（钱包 / 反馈 / 账户） | **整块隐藏**，会话列表铺到底 |
| 外壳三档 | nav 与 map 同调 | 浅 `246` / 侧栏 `252` / 内容 `255`；暗 `15` / `22` / `17` |
| 空态幽灵 logo | 30×30 | 64×64 |

图见 `preview/`：

| 文件 | 内容 |
| --- | --- |
| `before-light-top.png` / `before-dark-top.png` | 改造前的顶栏与侧栏 |
| `after-light-top.png` / `after-dark-top.png` | 改造后的同一区域 |
| `codex-ink-light.png` / `codex-ink-dark.png` | 整页 |

### 一个必须记住的坑：四级文字色只能 `!important`

`src/ui/theme.ts` 的 `apply()` 会把四个 ink 变量（`fg` / `fgStrong` / `fgDim` /
`fgFaint` → `--text` / `--text-strong` / `--muted` / `--faint` / `--ghost`）
**内联**写到 `<html>` 上：

```ts
for (const name of Object.keys(STEPS)) {   // fg, fgStrong, fgDim, fgFaint
  const authored = pack?.tokens[scheme]?.[name];
  const from = authored || base.getPropertyValue(SURFACE[name][0]).trim();
  if (!authored && from) root.style.setProperty(v, ink(from, name, scheme, contrast));
}
```

内联优先级高于任何选择器，所以外部样式表改这四个变量**只能提权**。
实测：套上覆盖层后 `--page` 从 `#efefec` 变成 `#ffffff`，而 `--text` 纹丝不动
（还是默认的 `#292b29`），加 `!important` 才生效——见 `codex-ink.css` 里
「四级文字色必须提权」那一段。

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

  **但它只在侧栏展开时可见可点**。收起侧栏后它会消失，两条原因叠在一起：

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

- **四级文字色被 `!important` 钉住**：装了官方主题包也会被覆盖层压住。
  覆盖层的定位本来就是"外观恒定"，其余变量仍然让给主题包。
  （2.29 起主题包的取值改由 `<style id="pack-theme">` 下发——同特异性下
  后加载即可胜出——但覆盖层的 `<link>` 静态挂在 head 里、位置在前，
  要压住主题包仍需提权，所以这里保留 `!important`。）
- **侧栏脚整块隐藏**（钱包与用量 / 发送反馈 / 账户行，连上下分隔线）：三个入口都还在别处——
  余额在底部状态条的按钮上，反馈在左轨图标轨里，账号与登录在左轨底部的设置里
  （进去第一项就是登录）。

---

## 五、目录

```
codex-ink/
  codex-ink.css     覆盖层正本（调色板 / 去彩 / 结构 / 收尾）—— 纯 CSS，无脚本
  install.ps1       打补丁（幂等，-Restore 可还原）
  uninstall.ps1     还原
  theme-pack/       主题包（官方机制）：插件清单 + 墨白 / 蓝调两个 theme.json
  preview/          改造前后截图
  tools/            复核用脚本（运行非必需）
```

主题包装法：`reasonix plugin install <本目录>\theme-pack --link --yes`，
然后在 Settings → Appearance 里选「Codex Ink 墨白」。需要 Studio 2.29+
（四个装饰角色 token 从 2.29 起生效；更早的版本会忽略它们）。

`tools/` 里的脚本用来复核这套改动：

| 脚本 | 作用 |
| --- | --- |
| `measure.mjs` | 变量表 + 高饱和彩色扫描（只算真正画出来的元素）+ 关键盒子 |
| `audit.mjs` | 逐条统计覆盖层选择器在真实页面里命中多少元素，找出死规则 |
| `dom.mjs` | 打印某个容器的 DOM 子树（类名 + 盒子 + 隐藏标记） |
| `shot.mjs` | 出图（`SHOT_FULL=1` 整页，`SHOT_QUERY=` 换形态） |
| `trace.mjs` | 列出能匹配某元素的 CSS 规则，用来问"这个颜色哪条规则给的" |
| `pixel.mjs` | 采样 PNG 的像素值——"这块到底是什么颜色"，判断有没有色差用这个，不要靠肉眼 |
| `at.mjs` | 给定坐标输出该点最上层元素链与各自背景，并打印某元素的关键计算样式 |
| `scanpng.mjs` | 整图扫描高饱和彩色像素，按颜色聚簇报位置——用来验证"界面真的灰阶了吗"，包括真实 Studio 的截图 |
| `verify-tip.mjs` | 验证顶栏 ☰ 的悬停提示：展开/收起两种状态下 `::after` 的文案、以及 hover 时的透明度与位置 |

它们需要一份 2.27.0 源码的 `frontend-next` 与 Playwright：

```bash
git clone --depth 1 --branch studio https://github.com/esengine/DeepSeek-Reasonix repo
cd repo/desktop/frontend-next
pnpm install --frozen-lockfile
# pnpm 11 会拦下 esbuild 的构建脚本；直接调 vite 绕开
node node_modules/vite/bin/vite.js build --config vite.perf.config.ts
node node_modules/vite/bin/vite.js preview --config vite.perf.config.ts --port 4399 --strictPort

# 另开一个终端，指向 clone 出来的 frontend-next
RX_REPO="$PWD" node ../../codex-ink/tools/measure.mjs ../../codex-ink/codex-ink.css
```

截图脚本用 `?pref=zh&ws=2&sess=6&turns=1`（性能台自带 MockPort，不需要内核）；
空态加 `&panes=0`，首次开屏加 `&onboarding`。

---

## 六、这个覆盖层做了什么

| 类别 | 处理 |
| --- | --- |
| 调色板 | 自带一份 Codex 墨白（浅 `#fff`/`#f6f6f6`，深 `#111`/`#0f0f0f`），不装主题包也是 Codex |
| 信息色一律保留 | `--cat-1..5` / `--io-*`（用量五段的蓝/橙/绿/黄/粉）、`--net` / `--deleg`（运行 / 委派状态与 `.hostlab` / `.hl .src` 等 host 标签）、`--syn-*`（语法高亮）、`--ok` / `--warn` / `--err`。这些是**信息**不是装饰——压灰会让人分不出哪段是哪段 |
| 装饰角色（2.29） | `--link` / `--brand` / `--halo` / `--label-agent` 给出与 theme-pack 一致的取值：链接保留 Codex 蓝 `#339cff`，品牌色 / 悬停光晕 / 代理名标签收进灰阶 |
| 语义色 | `--ok` / `--warn` / `--err` **保留**——Codex 自己也用红绿 |
| 强调色 | 改成 **Codex 蓝 `#339cff`**（官方是琥珀 `oklch(78% .135 78)`）：链接、焦点、选中、主按钮都跟着它走 |
| 硬编码彩色 | **只**收回真正装饰性的那几处（品牌字色 `.studio-brand-accent`）。运行态、转录符号、用量图表、上下文色标这些**全部还原成官方色**——它们是信息，压灰会看不出区别 |
| 首次开屏 | `.oobe` 恒定近黑，主按钮换成近白（不能走 `var(--accent)`，浅色下是墨黑看不见） |
| 浮层影 | 换成 Codex 实测的菜单影（细描边 + 克制投影），去掉默认 16px/40px 柔光 |
| 结构 | 图标轨放回来、顶栏通栏、侧栏头部收成一行并与顶栏齐平、面包屑会话名归位、侧栏的应用级入口收进设置 |
| 不藏功能入口 | 曾把顶栏的 `.phone-action`（**设备访问／手机直连**）连同侧栏入口一起隐藏，前者已恢复。教训：为了"形似 Codex"而藏入口，除非别处同样可达**且使用者明确同意** |
| 密度 | 会话行高 30px、标题单行省略、去掉计数 |
| 空态 | 幽灵 logo 与标题放大一号 |
| 顶栏提示 | ☰（展开/隐藏侧栏）官方只有 `aria-label`、没有 `title`，用 `::after` + `[aria-pressed]` 补了一个**随状态切换**的悬停提示 |

色值来源：Codex 实机截图逐像素测量（经 DSH 社区插件
[`rindbeans/codex-ui`](https://github.com/rinDBeans/codex-ui)，MIT）。
