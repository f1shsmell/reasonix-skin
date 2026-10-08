// 验证：侧栏宽度落到 @container 阈值以下时，官方哪条规则把筛选计数藏起来。
// 用法: node verify-count.mjs <css>
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";

const REPO = process.env.RX_REPO ?? os.tmpdir().replace(/\\/g, "/") + "/rx-upstream/desktop/frontend-next";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const css = fs.readFileSync(process.argv[2], "utf8");
const BASE = process.env.SHOT_URL ?? "http://localhost:4399/perf.html";
const QUERY = process.env.SHOT_QUERY ?? "pref=zh&ws=2&sess=6&turns=1";

const read = (page) => page.evaluate(() => {
  const b = document.querySelector(".studio-session-segments button[data-value='all'] b");
  const rail = document.querySelector(".rail");
  const head = document.querySelector(".studio-rail-head");
  const btn = document.querySelector(".studio-session-segments button[data-value='all']");
  const kbd = document.querySelector(".studio-search kbd");
  const headW = head ? head.getBoundingClientRect().width : -1;
  const cs = head ? getComputedStyle(head) : null;
  return {
    railW: rail ? Math.round(rail.getBoundingClientRect().width) : -1,
    headW: Math.round(headW),
    // 容器查询量的是内容盒的 inline-size，所以要把左右 padding 减掉
    headContent: cs ? Math.round(headW - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) : -1,
    pad: cs ? cs.paddingLeft + "/" + cs.paddingRight : "-",
    containerType: cs ? cs.containerType : "-",
    count: b ? (b.textContent || "").trim() : "(没有 <b> 元素)",
    countDisplay: b ? getComputedStyle(b).display : "-",
    btnW: btn ? Math.round(btn.getBoundingClientRect().width) : -1,
    kbdDisplay: kbd ? getComputedStyle(kbd).display : "-",
  };
});

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
console.log("rail  head  内容盒  padding   container-type   计数  display     按钮宽");
for (const railW of [264, 240, 200]) {
  const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem("rx-theme", "light"); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(BASE + "?" + QUERY, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: css });
  // 容器查询量的是 .studio-rail-head 的内容盒，而它的宽度并不跟着 --rail-w 走，
  // 所以要真正把它压窄，得直接改它自己。
  await page.addStyleTag({
    content:
      ":root, .app, .cols { --rail-w: " + railW + "px !important; }\n" +
      ".rail, .railscroll { width: " + railW + "px !important; }\n" +
      ".studio-rail-head { width: " + railW + "px !important; }",
  });
  await page.waitForTimeout(700);
  const r = await read(page);
  console.log(
    String(r.railW).padStart(4) + "  " + String(r.headW).padStart(4) + "  " +
    String(r.headContent).padStart(6) + "  " + r.pad.padEnd(8) + "  " +
    String(r.containerType).padEnd(15) + "  " +
    r.count.padEnd(5) + " " + r.countDisplay.padEnd(11) + " " + String(r.btnW).padStart(5)
  );
  await ctx.close();
}
await browser.close();
