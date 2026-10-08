// 在渲染出的页面里，给定坐标，输出该点最上层元素及其祖先链的背景，
// 以及指定元素的关键计算样式（用来问"这块的底色到底是谁给的"）。
// 用法: node at.mjs <css 路径或空> "x,y;x,y;..." [额外的元素选择器]
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const cssPath = process.argv[2];
const rawPoints = process.argv[3] ?? "400,20;180,300";
const extraSel = process.argv[4] ?? "";
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";
const css = cssPath ? fs.readFileSync(cssPath, "utf8") : null;
const points = rawPoints.split(";").filter(Boolean).map((p) => p.split(",").map(Number));

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const ctx = await browser.newContext({ colorScheme: process.env.SHOT_SCHEME ?? "light", viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript((s) => { try { localStorage.setItem("rx-theme", s); } catch (e) {} }, process.env.SHOT_SCHEME ?? "light");
const page = await ctx.newPage();
await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(600);
if (css) { await page.addStyleTag({ content: css }); await page.waitForTimeout(500); }

const out = await page.evaluate(({ points, extraSel }) => {
  const res = [];
  for (const [x, y] of points) {
    const chain = [];
    let e = document.elementFromPoint(x, y);
    while (e && e !== document.documentElement && chain.length < 8) {
      const cs = getComputedStyle(e);
      const cls = typeof e.className === "string" ? e.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
      chain.push(
        e.tagName.toLowerCase() + (cls ? "." + cls : "") +
        "  bg=" + cs.backgroundColor +
        (cs.backgroundImage !== "none" ? "  bgImage=" + cs.backgroundImage.replace(/\s+/g, " ").slice(0, 70) : "") +
        (cs.opacity !== "1" ? "  opacity=" + cs.opacity : "")
      );
      e = e.parentElement;
    }
    res.push({ pt: x + "," + y, chain });
  }
  let extra = null;
  if (extraSel) {
    const el = document.querySelector(extraSel);
    if (el) {
      const cs = getComputedStyle(el);
      extra = {
        sel: extraSel,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        backgroundImage: cs.backgroundImage.replace(/\s+/g, " ").slice(0, 120),
        backgroundSize: cs.backgroundSize,
        backgroundPosition: cs.backgroundPosition,
        backgroundRepeat: cs.backgroundRepeat,
        borderTop: cs.borderTop,
        borderRight: cs.borderRight,
        borderBottom: cs.borderBottom,
        borderLeft: cs.borderLeft,
        outline: cs.outline,
        boxShadow: cs.boxShadow,
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        position: cs.position,
        zIndex: cs.zIndex,
        display: cs.display,
        rect: (() => { const r = el.getBoundingClientRect(); return Math.round(r.x) + "," + Math.round(r.y) + " " + Math.round(r.width) + "x" + Math.round(r.height); })(),
        ancestors: (() => {
          const out = [];
          let p = el.parentElement;
          while (p && out.length < 10) {
            const ps = getComputedStyle(p);
            const r = p.getBoundingClientRect();
            const cls = typeof p.className === "string" ? p.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
            out.push(
              p.tagName.toLowerCase() + (cls ? "." + cls : "") +
              "  " + Math.round(r.x) + "," + Math.round(r.y) + " " + Math.round(r.width) + "x" + Math.round(r.height) +
              "  display=" + ps.display + " position=" + ps.position +
              " z=" + ps.zIndex +
              (ps.isolation !== "auto" ? " isolation=" + ps.isolation : "") +
              (ps.opacity !== "1" ? " opacity=" + ps.opacity : "") +
              (ps.transform !== "none" ? " transform=" + ps.transform.slice(0, 22) : "") +
              (ps.willChange !== "auto" ? " willChange=" + ps.willChange : "") +
              (ps.contain !== "none" ? " contain=" + ps.contain : "") +
              " overflow=" + ps.overflow
            );
            p = p.parentElement;
          }
          return out;
        })(),
      };
    }
  }
  return { res, extra };
}, { points, extraSel });

for (const p of out.res) {
  console.log("● (" + p.pt + ")");
  for (const c of p.chain) console.log("    " + c);
}
if (out.extra) {
  console.log("\n● " + out.extra.sel + " 的计算样式");
  for (const [k, v] of Object.entries(out.extra)) {
    if (k === "sel") continue;
    if (Array.isArray(v)) { console.log("    " + k + ":"); for (const line of v) console.log("        " + line); }
    else console.log("    " + k + ": " + v);
  }
}
await browser.close();
