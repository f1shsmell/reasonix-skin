// 样式溯源：列出所有能匹配到某个元素的 CSS 规则（选择器 + 声明），按文档顺序。
// 用来问"这个颜色到底哪条规则给的"。
// 用法: node trace.mjs <css 路径或空> <选择器> [只含此子的规则关键字]
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const cssPath = process.argv[2];
const sel = process.argv[3];
const filter = process.argv[4] ?? "";
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";
const css = cssPath ? fs.readFileSync(cssPath, "utf8") : null;

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const ctx = await browser.newContext({ colorScheme: process.env.SHOT_SCHEME ?? "dark", viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(600);
if (css) { await page.addStyleTag({ content: css }); await page.waitForTimeout(500); }

const out = await page.evaluate(({ sel, filter }) => {
  const els = [...document.querySelectorAll(sel)];
  if (!els.length) return { error: "no element for " + sel };
  const el = els[0];
  const hits = [];
  const walk = (rules, media) => {
    for (const r of rules) {
      if (r.cssRules) { walk(r.cssRules, media ? media + " & " + r.conditionText : r.conditionText); continue; }
      if (!r.selectorText) continue;
      if (filter && !r.style.cssText.includes(filter) && !r.selectorText.includes(filter)) continue;
      let ok = false;
      try { ok = el.matches(r.selectorText); } catch (e) {}
      if (ok) hits.push({ by: "selector", sel: r.selectorText, css: r.style.cssText, media: media || "" });
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, ""); } catch (e) {} }
  const cs = getComputedStyle(el);
  return {
    count: els.length,
    cls: typeof el.className === "string" ? el.className : "",
    computed: { color: cs.color, background: cs.backgroundColor, display: cs.display },
    hits,
  };
}, { sel, filter });

if (out.error) { console.log(out.error); }
else {
  console.log("匹配 " + out.count + " 个 ." + out.cls + "   computed color=" + out.computed.color + " bg=" + out.computed.background + " display=" + out.computed.display);
  console.log("能匹配的规则 " + out.hits.length + " 条（文档顺序）：");
  for (const h of out.hits) console.log("   " + (h.media ? "[" + h.media + "] " : "") + h.sel + "  { " + h.css + " }");
}
await browser.close();
