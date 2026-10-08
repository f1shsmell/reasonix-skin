// 验证用量可视化那五段的配色（上下文详情里的色标 + 进度条分段 + 图例）。
// 用法: node verify-ctx.mjs <css>
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
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((s) => { try { localStorage.setItem("rx-theme", s); } catch (e) {} }, scheme);
  const page = await ctx.newPage();
  await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: css });
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const parts = ["system", "tools", "user", "reply", "output"];
    const read = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).backgroundColor : "(无)";
    };
    const root = getComputedStyle(document.documentElement);
    return {
      cat: [1, 2, 3, 4, 5].map((n) => root.getPropertyValue("--cat-" + n).trim()).join("  "),
      io: root.getPropertyValue("--io-up").trim() + " / " + root.getPropertyValue("--io-down").trim(),
      bar: parts.map((p) => read(".ctxbar>i[data-p=" + p + "]")).join("  "),
      lg: parts.map((p) => read(".ctxlg .r i[data-p=" + p + "]")).join("  "),
      card: parts.map((p) => read('.chrome-context-card [data-part="' + p + '"]')).join("  "),
      haveBar: !!document.querySelector(".ctxbar"),
      haveLg: !!document.querySelector(".ctxlg"),
    };
  });
  console.log("[" + scheme + "]");
  console.log("   --cat-1..5      " + r.cat);
  console.log("   --io-up/down    " + r.io);
  console.log("   .ctxbar 分段    " + (r.haveBar ? r.bar : "(这个视图里没有 .ctxbar)"));
  console.log("   .ctxlg 图例     " + (r.haveLg ? r.lg : "(这个视图里没有 .ctxlg)"));
  console.log("   卡片 [data-part] " + r.card);
  await ctx.close();
}
await browser.close();
