// 打印指定容器的 DOM 子树（标签 + 类 + 尺寸），用来在改动前看清结构。
// 用法: node dom.mjs <css 路径或空> <选择器> [深度]
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const cssPath = process.argv[2];
const rootSel = process.argv[3] ?? ".app";
const maxDepth = Number(process.argv[4] ?? 4);
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";
const css = cssPath ? fs.readFileSync(cssPath, "utf8") : null;

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const ctx = await browser.newContext({ colorScheme: process.env.SHOT_SCHEME ?? "light", viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(600);
if (css) { await page.addStyleTag({ content: css }); await page.waitForTimeout(600); }

const lines = await page.evaluate(({ rootSel, maxDepth }) => {
  const root = document.querySelector(rootSel);
  if (!root) return ["NOT FOUND: " + rootSel];
  const out = [];
  const walk = (el, d, prefix) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).join(".") : "";
    const attrs = [...el.attributes].filter((a) => a.name.startsWith("data-") || a.name.startsWith("aria-") || a.name === "title" || a.name === "id" || a.name === "role")
      .map((a) => a.name + "=" + a.value).join(" ");
    const vis = cs.display === "none" ? " HIDDEN" : "";
    // 这几个属性会创建 containing block，把 position:fixed 的子元素拉回自己内部
    const cb = [
      cs.position !== "static" ? "pos=" + cs.position : "",
      cs.transform !== "none" ? "xform=" + cs.transform.slice(0, 24) : "",
      cs.willChange !== "auto" ? "will=" + cs.willChange : "",
      cs.contain !== "none" ? "contain=" + cs.contain : "",
      cs.overflow !== "visible" ? "ovf=" + cs.overflow : "",
      cs.filter !== "none" ? "filter" : "",
    ].filter(Boolean).join(" ");
    out.push(prefix + el.tagName.toLowerCase() + (cls ? "." + cls : "") + (attrs ? " [" + attrs + "]" : "") +
      "  " + Math.round(r.x) + "," + Math.round(r.y) + " " + Math.round(r.width) + "x" + Math.round(r.height) + vis +
      (cb ? "   << " + cb : ""));
    if (d >= maxDepth) return;
    for (const c of el.children) walk(c, d + 1, prefix + "  ");
  };
  walk(root, 0, "");
  return out;
}, { rootSel, maxDepth });

console.log(lines.join("\n"));
await browser.close();
