// 采样 PNG 的像素值：把图片画进 canvas 再逐点读，用来确认"某块到底是什么颜色"。
// 用法: node pixel.mjs <png 路径> [devicePixelRatio=2]
// 采样点写在下面 POINTS（逻辑坐标，脚本按 dpr 换算）。
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const png = process.argv[2];
const dpr = Number(process.argv[3] ?? 2);

// [逻辑 x, 逻辑 y, 说明]
const POINTS = [
  [10, 20, "顶栏最左（左轨正上方）"],
  [400, 43, "顶栏底线 x=400（应为 1px 发丝线）"],
  [10, 43, "顶栏底线 x=10（左轨上方，不该有线）"],
  [400, 44, "顶栏下方第一行"],
  [400, 20, "顶栏中左"],
  [1100, 20, "顶栏中右"],
  [1500, 20, "顶栏最右"],
  [24, 100, "左轨上部"],
  [24, 500, "左轨中部"],
  [24, 900, "左轨下部"],
  [180, 60, "侧栏头部（品牌行）"],
  [180, 300, "侧栏中部"],
  [180, 700, "侧栏下部"],
  [700, 500, "主区"],
  [1100, 60, "页签条右侧"],
  [48, 22, "顶栏与左轨交界（x=48）"],
  [47, 300, "左轨右缘内"],
  [49, 300, "侧栏左缘内"],
];

const b64 = fs.readFileSync(png).toString("base64");
const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const page = await browser.newPage();
await page.goto("about:blank");

const out = await page.evaluate(async ({ b64, dpr, points }) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const at = (x, y) => {
    const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
  };
  const rows = points.map(([x, y, label]) => [label, x, y, at(x * dpr, y * dpr)]);
  return { w: img.width, h: img.height, rows };
}, { b64, dpr, points: POINTS });

console.log(`${png}  ${out.w}x${out.h}  (dpr=${dpr})`);
for (const [label, x, y, v] of out.rows) console.log(`   ${v.padEnd(18)} @ (${x},${y})  ${label}`);
await browser.close();
