// 定量度量：变量表 + 高饱和彩色扫描（只算真正画出来的元素）+ 关键盒子。
// 用法: node measure.mjs <css 路径或空> [标签]
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const cssPath = process.argv[2];
const tag = process.argv[3] ?? "measure";
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";
const css = cssPath ? fs.readFileSync(cssPath, "utf8") : null;

const VARS = ["--page","--surface","--raised","--overlay","--border","--hair","--text","--text-strong","--muted","--faint","--ghost","--accent","--accent-fg","--float","--float-hi","--face-code","--face-sunk","--net","--deleg","--ok","--warn","--err","--focus","--cat-1","--cat-2","--chrome-surface","--rail-surface","--r-sm","--r-md","--r-lg"];

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((s) => { try { localStorage.setItem("rx-theme", s); } catch (e) {} }, scheme);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
  if (css) { await page.addStyleTag({ content: css }); await page.waitForTimeout(400); await page.addStyleTag({ content: css }); await page.waitForTimeout(400); }

  const out = await page.evaluate((VARS) => {
    const cs = getComputedStyle(document.documentElement);
    const vars = {};
    for (const v of VARS) vars[v] = cs.getPropertyValue(v).trim();

    const rgb = (v) => {
      let m = v.match(/^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\)$/);
      if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
      m = v.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
      if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]];
      return null;
    };
    const PROPS = ["color", "backgroundColor", "borderTopColor", "borderLeftColor", "fill", "stroke", "outlineColor"];
    const tally = new Map();
    const samples = new Map();
    let scanned = 0, skipped = 0;
    for (const el of document.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      // 只算真正画出来的：display:none / 零盒子 / 不可见的整棵子树跳过，
      // 否则隐藏元素的计算色会把计数抬高，看不出真实残留。
      if (s.display === "none" || s.visibility === "hidden" || el.getClientRects().length === 0) { skipped++; continue; }
      scanned++;
      for (const p of PROPS) {
        const raw = s[p];
        if (!raw || raw === "none") continue;
        const c = rgb(raw);
        if (!c) continue;
        const [r, g, b, a] = c;
        if (a < 0.2) continue;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const l = (mx + mn) / 510;
        const sat = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
        if (sat > 0.28 && l > 0.1 && l < 0.94) {
          const key = `${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)}`;
          tally.set(key, (tally.get(key) || 0) + 1);
          if (!samples.has(key)) {
            const cls = typeof el.className === "string" ? el.className : "";
            samples.set(key, (el.tagName.toLowerCase() + (cls ? "." + cls.split(/\s+/).slice(0, 3).join(".") : "")).slice(0, 70) + " {" + p + "}");
          }
        }
      }
    }
    const colored = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ rgb: k, n, at: samples.get(k) }));

    const box = (s) => { const e = document.querySelector(s); if (!e) return "none"; const r = e.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; };
    return {
      vars, colored, scanned, skipped,
      boxes: {
        nav: box(".nav"), rail: box(".rail"), chrome: box(".chrome"), tabs: box(".tabs"),
        cols: box(".cols"), compose: box(".compose"), head: box(".studio-rail-head"), go: box(".go"),
      },
    };
  }, VARS);

  console.log("[" + tag + "/" + scheme + "] 高饱和彩色 " + out.colored.reduce((a, c) => a + c.n, 0) + " 处 / " + out.colored.length + " 种色   (扫描 " + out.scanned + " 个可见元素，跳过 " + out.skipped + " 个隐藏)  errs=" + errs.length);
  for (const c of out.colored) console.log("     rgb(" + c.rgb + ")  x" + String(c.n).padStart(3) + "   " + c.at);
  const v = out.vars;
  console.log("   text=" + v["--text"] + " muted=" + v["--muted"] + " page=" + v["--page"] + " surface=" + v["--surface"] + " raised=" + v["--raised"] + " chrome-surf=" + v["--chrome-surface"] + " rail-surf=" + v["--rail-surface"]);
  console.log("   net=" + v["--net"] + " deleg=" + v["--deleg"] + " ok=" + v["--ok"] + " err=" + v["--err"] + " focus=" + v["--focus"]);
  console.log("   boxes=" + JSON.stringify(out.boxes));
  await ctx.close();
}
await browser.close();
