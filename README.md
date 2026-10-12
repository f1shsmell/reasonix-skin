# reasonix-skin

给 [Reasonix Studio](https://github.com/esengine/DeepSeek-Reasonix) 换皮的皮肤 / 覆盖层工作区。

当前只有一套：**Codex Ink** —— 把 Studio 换成 Codex 桌面端的观感（零彩色 chrome、墨白灰阶即层级、最左一条图标轨、通栏灰壳顶栏）。

![Codex Ink 浅色](codex-ink/preview/codex-ink-light.png)

![Codex Ink 深色](codex-ink/preview/codex-ink-dark.png)

## 快速上手

**两层合用**：覆盖层管样式，主题包管颜色。**两条都要装**才是完整的 Codex Ink。

```powershell
git clone https://github.com/f1shsmell/reasonix-skin
cd reasonix-skin/codex-ink

# 路线一：官方主题包（颜色；纯官方机制，Studio 2.29+）
reasonix plugin install .\theme-pack --link --yes
# 装完在 Settings → Appearance 里选「Codex Ink 墨白」

# 路线二：CSS 覆盖层（样式：布局 / 密度 / 圆角 / 壁纸；Studio 每次升级后重跑一次）
pwsh -File install.ps1
```

> **2.36 起分工变了**：覆盖层不再自带调色板，颜色**全部**由主题包下发 ——
> 装包即包的色、换包即换色。**只装覆盖层不装包**也能用，但那时界面是
> Studio 自带调色板（琥珀强调色），只有布局与密度是 Codex 的。
> 理由与实测见 [`codex-ink/README.md`](codex-ink/README.md) 第三、六节。

`install.ps1 -Restore` 或 `uninstall.ps1` 可还原覆盖层。

## 目录

| 路径 | 内容 |
| --- | --- |
| `codex-ink/` | Codex Ink 正本：`codex-ink.css`、`install.ps1` / `uninstall.ps1`、`theme-pack/`、`preview/`、`tools/` |
| `codex-ink/README.md` | **完整文档**——为什么走覆盖层而不是插件、token 能力边界（2.36 复核）、覆盖层逐项做了什么、复核脚本用法 |

路由、token 能力边界、逐条改动与复核方法都写在那份文档里，这里不重复。

## 许可

MIT，见 [LICENSE](LICENSE)。色值取自 Codex 实机截图逐像素测量（经社区插件 [`rindbeans/codex-ui`](https://github.com/rinDBeans/codex-ui)，MIT）。
