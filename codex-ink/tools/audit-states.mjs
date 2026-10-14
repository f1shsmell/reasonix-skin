// 把 audit.mjs 报的"命中 0"逐条**放到它该在的条件下**再数一遍。
//
// 为什么需要它：audit.mjs 只跑一个浅色、无包、有会话的页面，于是下面几类选择器
// **必然**报 0，但那不代表规则是死的：
//   · 暗色选择器      —— 它跑的是浅色
//   · 伪元素 ::after  —— querySelectorAll 天生匹配不到伪元素
//   · 伪类 :hover 等  —— 要真去悬停 / 聚焦才会命中
//   · data-bg 规则    —— 要装带图的包才打这个标记
//   · 状态型规则      —— 空态 / 首次开屏 / 左轨 off / 多窗格各是另一套 DOM
//
// 实测（2.36.0）：audit.mjs 报 48 条"命中 0"，其中只有 16 条在任何状态下都命中 0，
// 其余 32 条都是误报。**判断死规则前先跑本脚本。**
//
// 用法: node audit-states.mjs <css 路径>
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const cssPath = process.argv[2];
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const css = fs.readFileSync(cssPath, "utf8");

// 抽出顶层选择器（与 audit.mjs 同样的拆法）
const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
const sels = [];
{
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const sel = m[1].trim().replace(/\s+/g, " ");
    if (sel.startsWith("@") || sel === "") continue;
    sels.push(sel);
  }
}

// 每种页面状态一个 context。`click` 的是要真点出来、query 参数表达不了的状态。
// `size` 是可选的视口尺寸（默认 1600x1000）——窄窗会触发 `data-fold~="scene"`，
// 那是 2.39 起唯一还挂载 `.studio-menu` 的形态（桌面侧栏改由分隔条折叠），
// 少了这一档，㉛ 那组 ::after 规则会被误报成 DEAD。
const STATES = [
  { name: "浅色·有会话", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1" },
  { name: "暗色·有会话", scheme: "dark", query: "pref=zh&ws=2&sess=6&turns=1" },
  { name: "浅色·带图包", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1&pack=photo" },
  { name: "暗色·带图包", scheme: "dark", query: "pref=zh&ws=2&sess=6&turns=1&pack=photo" },
  { name: "浅色·sky 包", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1&pack=sky" },
  { name: "浅色·空态", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1&panes=0" },
  { name: "浅色·首次开屏", scheme: "light", query: "pref=zh&onboarding" },
  { name: "浅色·左轨关", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1", nav: "off" },
  { name: "浅色·左轨收起", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1", nav: "collapsed" },
  { name: "浅色·点收起侧栏", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1", click: ".studio-menu" },
  { name: "浅色·点开浏览器", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1", click: ".browser-action" },
  { name: "窄窗·scene 折叠", scheme: "light", query: "pref=zh&ws=2&sess=6&turns=1", size: [560, 900] },
  { name: "窄窗·scene 暗色", scheme: "dark", query: "pref=zh&ws=2&sess=6&turns=1", size: [560, 900] },
];

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const best = new Array(sels.length).fill(0);

for (const st of STATES) {
  const ctx = await browser.newContext({
    colorScheme: st.scheme,
    viewport: { width: st.size?.[0] ?? 1600, height: st.size?.[1] ?? 1000 },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(({ scheme, nav }) => {
    try {
      localStorage.setItem("rx-theme", scheme);
      if (nav) localStorage.setItem("rx-nav-rail", nav);
    } catch (e) {}
  }, { scheme: st.scheme, nav: st.nav });

  const page = await ctx.newPage();
  await page.goto(BASE + "?" + st.query, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(700);
  await page.addStyleTag({ content: css });
  await page.waitForTimeout(400);
  if (st.click) {
    try {
      await page.click(st.click, { timeout: 3000 });
      await page.waitForTimeout(600);
    } catch (e) {
      console.log(`   （${st.name}：点 ${st.click} 失败，跳过）`);
    }
  }

  const counts = await page.evaluate((sels) => sels.map((s) => {
    try {
      // 伪元素查不到，退回到宿主选择器；伪类同理（近似，可能偏保守）。
      const base = s
        .split(",")
        .map((one) =>
          one
            .trim()
            .replace(/::(after|before|first-line|placeholder|selection|marker|backdrop)\b/g, "")
            .replace(/:(hover|focus-within|focus-visible|focus|active|visited)\b/g, "")
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean)
        .join(", ");
      if (!base) return 0;
      return document.querySelectorAll(base).length;
    } catch (e) {
      return -1;
    }
  }), sels);

  counts.forEach((n, i) => { if (n > best[i]) best[i] = n; });
  await ctx.close();
}

const dead = [], alive = [];
sels.forEach((s, i) => (best[i] > 0 ? alive : dead).push(s));

console.log(`选择器 ${sels.length} 条；跨 ${STATES.length} 种页面状态取最大命中`);
console.log(`\n== 任何状态下都命中 0（真死规则，或需要本脚本没覆盖的状态）: ${dead.length}`);
for (const s of dead) console.log("   DEAD  " + s);
console.log(`\n== 至少一种状态下命中 >0: ${alive.length}`);
console.log("   （audit.mjs 在单一浅色页面上会把这些也报成 0，属误报）");

await browser.close();
