// 真实渲染截图：在 2.27.0 源码构建的 perf 台上出图。
// 用法: node shot.mjs <codex-ink.css 路径或空> <输出目录> [标签]
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const cssPath = process.argv[2];
const outDir = process.argv[3] ?? "shots";
const tag = process.argv[4] ?? "shot";
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";
const FULL = process.env.SHOT_FULL === "1";
const CLIP = Number(process.env.SHOT_CLIP ?? 560);

fs.mkdirSync(outDir, { recursive: true });
const css = cssPath ? fs.readFileSync(cssPath, "utf8") : null;

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const made = [];

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    colorScheme: scheme,
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript((s) => {
    try { localStorage.setItem("rx-theme", s); } catch (e) {}
  }, scheme);
  if (process.env.SHOT_SHELL) {
    await ctx.addInitScript(() => {
      const noop = async () => {};
      window.reasonixHost = {
        shell: "electron", platform: "win32", titleBar: true,
        minimiseWindow: noop, toggleMaximiseWindow: noop,
        isWindowMaximised: async () => false, closeWindow: noop,
        openExternal: noop, pathForFile: () => "",
        saveText: async () => "", saveBytes: async () => "", pickFolder: async () => "",
        revealPath: async () => null, revealWorkspace: async () => null,
      };
    });
  }

  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);

  if (css) {
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(400);
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(400);
  }
  // SHOT_JS 指向 codex-ink.js，让截图里也有那个需要脚本的按钮
  if (process.env.SHOT_JS) {
    await page.addScriptTag({ content: fs.readFileSync(process.env.SHOT_JS, "utf8") });
    await page.waitForTimeout(500);
  }

  const probe = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const g = (s) => { const e = document.querySelector(s); if (!e) return "none"; const r = e.getBoundingClientRect(); return Math.round(r.x) + "," + Math.round(r.y) + " " + Math.round(r.width) + "x" + Math.round(r.height); };
    const col = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).backgroundColor : "none"; };
    return {
      theme: document.documentElement.dataset.theme,
      vars: ["--page","--surface","--raised","--text","--accent","--net","--ok"].map((v) => v + "=" + cs.getPropertyValue(v).trim()).join(" "),
      box: { nav: g(".nav"), rail: g(".rail"), chrome: g(".chrome"), tabs: g(".tabs"), compose: g(".compose"), head: g(".studio-rail-head"), railfoot: g(".railfoot"), empty: g(".panes-empty .mk") },
      bg: { nav: col(".nav"), rail: col(".rail"), chrome: col(".chrome"), tabs: col(".tabs") },
    };
  });
  console.log("[" + tag + "/" + scheme + "] errs=" + errs.length + " " + probe.vars);
  console.log("   box: " + JSON.stringify(probe.box));
  console.log("   bg:  " + JSON.stringify(probe.bg));
  if (errs.length) console.log("   ERRORS: " + errs.slice(0, 3).join(" | "));

  if (FULL) {
    const f = path.join(outDir, tag + "-" + scheme + ".png");
    await page.screenshot({ path: f, fullPage: true });
    made.push(f);
  }
  // SHOT_CROP="x,y,w,h" 出一张局部放大图（dpr=2，坐标按逻辑像素给）
  if (process.env.SHOT_CROP) {
    const [cx, cy, cw, ch] = process.env.SHOT_CROP.split(",").map(Number);
    const fc = path.join(outDir, tag + "-" + scheme + "-crop.png");
    await page.screenshot({ path: fc, clip: { x: cx, y: cy, width: cw, height: ch } });
    made.push(fc);
  }
  const f2 = path.join(outDir, tag + "-" + scheme + "-top.png");
  await page.screenshot({ path: f2, clip: { x: 0, y: 0, width: 1600, height: CLIP } });
  made.push(f2);
  await ctx.close();
}

await browser.close();
console.log("done: " + made.join(", "));
