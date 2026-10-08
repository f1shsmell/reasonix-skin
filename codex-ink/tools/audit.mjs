// 在 Node 侧提取 codex-ink.css 的选择器，再回页面逐条 querySelectorAll 计数。
// 命中 0 = 2.27 里已不存在的死规则。
// 用法: node audit.mjs <css 路径>
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const cssPath = process.argv[2];
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";
const css = fs.readFileSync(cssPath, "utf8");

// 提取顶层规则的选择器；@media / @supports 的头被跳过，其内部规则单独匹配。
const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
const sels = [];
const re = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = re.exec(clean))) {
  const sel = m[1].trim().replace(/\s+/g, " ");
  if (sel.startsWith("@") || sel === "") continue;
  sels.push(sel);
}

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem("rx-theme", "light"); } catch (e) {} });
const page = await ctx.newPage();
await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(600);
await page.addStyleTag({ content: css });
await page.waitForTimeout(300);

const counts = await page.evaluate((sels) => sels.map((s) => {
  try { return document.querySelectorAll(s).length; } catch (e) { return -1; }
}), sels);

console.log("选择器 " + sels.length + " 条");
const dead = [];
const alive = [];
sels.forEach((s, i) => { (counts[i] === 0 ? dead : alive).push([s, counts[i]]); });
console.log("\n== 命中 0（2.27 里没有对应元素）: " + dead.length);
for (const [s] of dead) console.log("   DEAD  " + s);
console.log("\n== 命中 >0: " + alive.length);
for (const [s, n] of alive) console.log("   " + String(n).padStart(5) + "  " + s);

await browser.close();
