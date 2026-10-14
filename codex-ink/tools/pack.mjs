// 把一个主题包**按 2.39 的方式**装进页面，供截图 / 度量脚本复用。
//
// 为什么需要它：覆盖层从 2.36 起只管样式，颜色全部由主题包下发。于是"皮肤长什么样"
// 这个问题，单跑覆盖层是答不出来的 —— 必须连包一起装上，截图才是真实观感。
//
// 本模块是 desktop/frontend-next/src/ui/theme.ts 的忠实复刻：
//   1. 按 SURFACE 表把包里的 token 名映射到前端自己的 CSS 变量；
//   2. 补 DERIVED（包没写 float/floatHi/codeBg/sunkBg/accentInk 时，跟随各自的来源层）；
//   3. 补 WASHES（brand-wash / label-agent-wash 由对应色 12% 混出）；
//   3b. 把 recipes（corners / density）下发成 --r-scale / --d-scale —— 2.39 新增，
//       与 token 写在同一条规则上；background.textGlow="none" 下发 --flow-text-shadow；
//   4. 写进一条 `<style id="pack-theme">` 里的 `:root:root[data-pack] {}` 规则
//      —— 特异性 (0,3,0)，正是它压得住覆盖层 (0,2,0) 的原因；
//   5. 给 <html> 打上 data-pack（有图时另加 data-bg，有 sky 时 data-sky）。
//
// 与 theme.ts 的差异只有一处，且不影响本项目的包：theme.ts 会按"对比度"设置
// 对四个 ink 变量做 oklch 偏移（STEPS），而性能台不设 rx-contrast（默认无偏移）。
import fs from "node:fs";

const SURFACE = {
  bg: ["--page"], bgSoft: ["--surface"], panel: ["--raised"], bgElev: ["--overlay"],
  border: ["--border"], borderSoft: ["--hair"],
  fg: ["--text"], fgDim: ["--muted"], fgFaint: ["--faint", "--ghost"], fgStrong: ["--text-strong"],
  accent: ["--accent"], accentFg: ["--accent-fg"], accentInk: ["--accent-ink"],
  link: ["--link"], brand: ["--brand"], halo: ["--halo"], labelAgent: ["--label-agent"],
  float: ["--float"], floatHi: ["--float-hi"], codeBg: ["--face-code"], sunkBg: ["--face-sunk"],
  synKeyword: ["--syn-key"], synString: ["--syn-str"], synNumber: ["--syn-num"], synFunction: ["--syn-fn"],
  radiusXs: ["--r-xs"], radiusSm: ["--r-sm"], radiusMd: ["--r-md"],
  fontUi: ["--ui"], fontMono: ["--mono"],
};

const DERIVED = [
  ["accentInk", { source: "accent", paint: (t) => `color-mix(in srgb, ${t.accent} 65%, ${t.fg ?? "var(--text)"})` }],
  ["float", { source: "panel", paint: (t) => t.panel }],
  ["floatHi", { source: "bgElev", paint: (t) => t.bgElev }],
  ["codeBg", { source: "bgSoft", paint: (t) => `color-mix(in srgb, ${t.bgSoft} 50%, ${t.bg ?? t.bgSoft})` }],
  ["sunkBg", { source: "bg", paint: (t) => t.bg }],
];

const WASHES = [["brand", "--brand-wash"], ["labelAgent", "--label-agent-wash"]];

// 配方：形状与节奏的档位，不是尺寸（2.39 起主题包可以声明）。
const CORNERS = { square: "0", soft: "1", round: "1.5" };
const DENSITY = { compact: "0.85", comfortable: "1" };

export function declarations(tokens, pack = {}) {
  const out = [];
  for (const [name, value] of Object.entries(tokens)) {
    for (const v of SURFACE[name] ?? []) out.push([v, value]);
  }
  for (const [token, from] of DERIVED) {
    if (tokens[token] || !tokens[from.source]) continue;
    for (const v of SURFACE[token]) out.push([v, from.paint(tokens)]);
  }
  if (tokens.accent) {
    out.push(["--accent-wash", `color-mix(in srgb, ${tokens.accent} 12%, ${tokens.bg ?? "transparent"})`]);
  }
  for (const [token, wash] of WASHES) {
    if (tokens[token]) out.push([wash, `color-mix(in srgb, ${tokens[token]} 12%, ${tokens.bg ?? "transparent"})`]);
  }
  const corners = pack.recipes?.corners ? CORNERS[pack.recipes.corners] : "";
  if (corners) out.push(["--r-scale", corners]);
  const density = pack.recipes?.density ? DENSITY[pack.recipes.density] : "";
  if (density) out.push(["--d-scale", density]);
  if (pack.background?.textGlow === "none") out.push(["--flow-text-shadow", "none"]);
  return out;
}

/** installPack 把 theme.json 装到已加载的页面上。scheme 决定用哪一档 token。 */
export async function installPack(page, themeJsonPath, scheme) {
  const pack = JSON.parse(fs.readFileSync(themeJsonPath, "utf8"));
  const decls = declarations(pack.tokens[scheme], pack);
  await page.evaluate(({ decls, id, sky }) => {
    const root = document.documentElement;
    let style = document.getElementById("pack-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "pack-theme";
      document.head.append(style);
    }
    const sheet = style.sheet;
    while (sheet.cssRules.length) sheet.deleteRule(0);
    sheet.insertRule(":root:root[data-pack] {}");
    const decl = sheet.cssRules[0].style;
    for (const [n, v] of decls) decl.setProperty(n, v);
    root.dataset.pack = id;
    if (sky) root.dataset.sky = "on";
  }, { decls, id: pack.id, sky: !!pack.sky });
  return pack;
}
