// 验证顶栏 ☰ 的悬停提示：两种状态下的文案、以及 hover 时到底出不出来。
// 用法: node verify-tip.mjs <css>
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const css = fs.readFileSync(process.argv[2], "utf8");
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem("rx-theme", "light"); } catch (e) {} });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(600);
await page.addStyleTag({ content: css });
await page.waitForTimeout(500);

const read = () => page.evaluate(() => {
  const el = document.querySelector(".chrome .studio-menu");
  const cs = getComputedStyle(el, "::after");
  const b = el.getBoundingClientRect();
  const rail = document.querySelector(".rail").getBoundingClientRect();
  return {
    pressed: el.getAttribute("aria-pressed"),
    label: el.getAttribute("aria-label"),
    content: cs.content,
    bg: cs.backgroundColor,
    fg: cs.color,
    btn: Math.round(b.x) + "," + Math.round(b.y) + " " + Math.round(b.width) + "x" + Math.round(b.height),
    railW: Math.round(rail.width),
  };
});

const a = await read();
console.log("展开态  aria-pressed=" + a.pressed + "  .rail 宽=" + a.railW + "  按钮 " + a.btn);
console.log("        ::after content = " + a.content + "   bg=" + a.bg + "  color=" + a.fg);
console.log("        原生 aria-label = " + a.label);

await page.click(".chrome .studio-menu");
await page.waitForTimeout(500);
const b = await read();
console.log("收起态  aria-pressed=" + b.pressed + "  .rail 宽=" + b.railW);
console.log("        ::after content = " + b.content);
console.log("        原生 aria-label = " + b.label);

await page.hover(".chrome .studio-menu");
await page.waitForTimeout(300);
const h = await page.evaluate(() => {
  const el = document.querySelector(".chrome .studio-menu");
  const cs = getComputedStyle(el, "::after");
  const btn = el.getBoundingClientRect();
  return { opacity: cs.opacity, top: cs.top, left: cs.left, padding: cs.padding, font: cs.fontSize, z: cs.zIndex, btnRight: Math.round(btn.right), btnBottom: Math.round(btn.bottom) };
});
console.log("悬停时  opacity=" + h.opacity + "  top=" + h.top + "  left=" + h.left + "  padding=" + h.padding + "  font=" + h.font + "  z=" + h.z);
console.log("        (按钮右/下边缘 " + h.btnRight + "," + h.btnBottom + "，提示在它正下方居中)");
console.log("pageerror: " + errs.length + (errs.length ? "  " + errs.slice(0, 2).join(" | ") : ""));
await browser.close();
