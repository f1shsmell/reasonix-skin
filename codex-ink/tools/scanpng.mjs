// 整图扫描：报告一张 PNG 里所有高饱和彩色像素的颜色与位置区间。
// 用来判断"真实界面里还剩多少彩色"，不靠肉眼。
// 用法: node scanpng.mjs <png 路径> [最低饱和度=0.28]
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const png = process.argv[2];
const minSat = Number(process.argv[3] ?? 0.28);
const b64 = fs.readFileSync(png).toString("base64");

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const page = await browser.newPage();
await page.goto("about:blank");

const out = await page.evaluate(async ({ b64, minSat }) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  const buckets = new Map();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (a < 200) continue;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx === mn) continue;
      const l = (mx + mn) / 510;
      if (l <= 0.1 || l >= 0.94) continue;
      const sat = (mx - mn) / (255 - Math.abs(mx + mn - 255));
      if (sat < minSat) continue;
      const key = (r >> 4) + "," + (g >> 4) + "," + (b >> 4);
      let e = buckets.get(key);
      if (!e) { e = { n: 0, r: 0, g: 0, b: 0, x0: x, y0: y, x1: x, y1: y, sx: x, sy: y }; buckets.set(key, e); }
      e.n++; e.r += r; e.g += g; e.b += b;
      if (x < e.x0) e.x0 = x; if (x > e.x1) e.x1 = x;
      if (y < e.y0) e.y0 = y; if (y > e.y1) e.y1 = y;
    }
  }
  return {
    w: img.width, h: img.height,
    list: [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 20).map((e) => ({
      n: e.n,
      rgb: "rgb(" + Math.round(e.r / e.n) + ", " + Math.round(e.g / e.n) + ", " + Math.round(e.b / e.n) + ")",
      box: e.x0 + "," + e.y0 + " .. " + e.x1 + "," + e.y1,
      sample: e.sx + "," + e.sy,
    })),
  };
}, { b64, minSat });

console.log(png + "  " + out.w + "x" + out.h + "   高饱和色块（饱和度 >= " + minSat + "，按像素数排序）");
if (!out.list.length) console.log("   （无）");
for (const e of out.list) console.log("   " + String(e.n).padStart(7) + " px   " + e.rgb.padEnd(20) + e.box + "   样例点 " + e.sample);
await browser.close();
