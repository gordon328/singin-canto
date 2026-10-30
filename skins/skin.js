/* 皮肤引擎（纯函数）：把皮肤文件里的颜色变成 CSS 变量、检查颜色、选皮肤。
   浏览器里是全局 SKIN；Node 测试里 require("./skins/skin.js")。
   规则见 docs/第二三阶段开发规格.md 7.10（皮肤系统）。组件只读 CSS 变量，不认识任何皮肤 id。 */
(function (root) {
  "use strict";
  const REQUIRED = ["bg", "surface", "surfacePress", "ink", "ink2", "muted", "rule", "accent", "accentPress", "accentSoft", "onAccent",
    "inverse", "onInverse", "danger", "heroTile", "heroBtn", "heroBtnInk", "songTiles", "tones", "shadowStrength"];
  const MODES = ["auto", "light-only", "dark-only"];

  // 驼峰 → CSS 变量名：surfacePress → --surface-press，ink2 → --ink-2，heroBtnInk → --hero-btn-ink
  const varName = k => "--" + k.replace(/([A-Z])/g, "-$1").replace(/(\d+)/g, "-$1").toLowerCase();
  const rgb = hex => { const h = hex.replace("#", ""); const f = h.length === 3 ? h.replace(/./g, "$&$&") : h; return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)); };
  const alpha = n => String(+n.toFixed(3)).replace(/^0\./, ".");
  const rgba = (hex, a) => `rgba(${rgb(hex).join(",")},${alpha(a)})`;
  const SKIP = new Set(["songTiles", "tones", "shadowStrength", "segCurrent"]);

  // 一套颜色 → CSS 变量声明（不带花括号）
  function cssVars(c) {
    const out = [];
    for (const [k, v] of Object.entries(c)) if (!SKIP.has(k) && typeof v === "string") out.push(`${varName(k)}:${v}`);
    c.tones.forEach((t, i) => out.push(`--t${i + 1}:${t}`));
    c.songTiles.forEach(([bg, ink], i) => out.push(`--sq${i + 1}-bg:${bg}`, `--sq${i + 1}-ink:${ink}`));
    out.push(`--sq-count:${c.songTiles.length}`);
    out.push(`--seg-current:${c.segCurrent || "color-mix(in srgb, var(--accent) 45%, var(--surface))"}`);
    // 阴影：强度 0 用明暗差代替阴影（深色）；大于 0 用 ink 色的阴影
    const s = +c.shadowStrength || 0;
    if (s > 0) {
      out.push(`--shadow-1:0 2px 10px ${rgba(c.ink, 0.05 * s)}`, `--shadow-2:0 10px 30px ${rgba(c.ink, 0.08 * s)}`, `--shadow-3:0 12px 34px ${rgba(c.ink, 0.12 * s)}`,
        `--cur-glow:0 8px 24px ${rgba(c.accent, 0.14 * s)}`, `--shadow-sheet:0 -8px 40px ${rgba(c.ink, 0.18 * s)},0 0 0 1px var(--rule)`,
        `--shadow-menu:var(--shadow-3)`, `--player-shadow:var(--shadow-3)`);
    } else {
      out.push("--shadow-1:none", "--shadow-2:none", "--shadow-3:none", "--cur-glow:0 0 0 transparent",
        "--shadow-sheet:0 -8px 40px rgba(0,0,0,.5),0 0 0 1px var(--rule)", "--shadow-menu:0 12px 34px rgba(0,0,0,.5),0 0 0 1px var(--rule)",
        "--player-shadow:0 0 0 1px var(--rule)");
    }
    out.push("--nav-dim:rgba(0,0,0,.10)"); // 切页时旧页面变暗一点，所有皮肤一样
    out.push(`color-scheme:${luminance(c.bg) < 0.4 ? "dark" : "light"}`);
    return out.join(";") + ";";
  }

  // 全部皮肤的样式表：自动皮肤跟系统深浅色，只有一套的不跟
  function stylesheet(defs) {
    let css = "";
    for (const d of Object.values(defs)) {
      const sel = `:root[data-skin="${d.id}"]`;
      if (d.modes === "dark-only") css += `${sel}{${cssVars(d.dark)}}\n`;
      else if (d.modes === "light-only") css += `${sel}{${cssVars(d.light)}}\n`;
      else css += `${sel}{${cssVars(d.light)}}\n@media (prefers-color-scheme: dark){${sel}{${cssVars(d.dark)}}}\n`;
    }
    return css;
  }

  // 现在实际显示的那一套颜色
  function colorsFor(def, systemDark) {
    if (def.modes === "dark-only") return def.dark;
    if (def.modes === "light-only") return def.light;
    return systemDark ? def.dark : def.light;
  }

  function luminance(hex) {
    const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

  // 颜色检查（规格 2.2）：返回问题列表，空数组 = 通过
  const PAIRS = [["ink", "bg", 4.5], ["ink", "surface", 4.5], ["onAccent", "accent", 4.5], ["onInverse", "inverse", 4.5], ["heroBtnInk", "heroBtn", 4.5],
    ["accent", "surface", 4.5], ["muted", "surface", 3]];
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  function check(def) {
    const p = [], sets = def.modes === "dark-only" ? ["dark"] : def.modes === "light-only" ? ["light"] : ["light", "dark"];
    if (!MODES.includes(def.modes)) p.push(`${def.id}: modes 不对：${def.modes}`);
    for (const m of sets) {
      const c = def[m], at = `${def.id} ${m}`;
      if (!c) { p.push(`${at}: 缺少这一套颜色`); continue; }
      for (const k of REQUIRED) if (!(k in c)) p.push(`${at}: 缺少 ${k}`);
      if (!Array.isArray(c.tones) || c.tones.length !== 6) p.push(`${at}: tones 要 6 个`);
      if (!Array.isArray(c.songTiles) || c.songTiles.length < 2 || !c.songTiles.every(t => Array.isArray(t) && t.length === 2)) p.push(`${at}: songTiles 至少 2 组 [底色, 文字色]`);
      for (const [a, b, min] of PAIRS) {
        if (!HEX.test(c[a] || "") || !HEX.test(c[b] || "")) { if (a in c && b in c) p.push(`${at}: ${a}/${b} 要写成 #RRGGBB`); continue; }
        const r = contrast(c[a], c[b]);
        if (r < min) p.push(`${at}: ${a}/${b} ${r.toFixed(2)} < ${min}`);
      }
      if (HEX.test(c.surface || "") && Array.isArray(c.tones)) c.tones.forEach((t, i) => {
        if (!HEX.test(t)) p.push(`${at}: 声调 ${i + 1} 要写成 #RRGGBB`);
        else if (contrast(t, c.surface) < 3) p.push(`${at}: 声调 ${i + 1}/surface ${contrast(t, c.surface).toFixed(2)} < 3`);
      });
    }
    return p;
  }

  // 要显示的皮肤：不存在或没解锁就用丁香
  function pick(id, unlocked, defs) {
    return id && defs[id] && (unlocked || []).includes(id) ? id : "lilac";
  }

  const SKIN = { REQUIRED, MODES, varName, cssVars, stylesheet, colorsFor, contrast, check, pick };
  root.SKIN = SKIN;
  if (typeof module !== "undefined" && module.exports) module.exports = SKIN;
})(typeof self !== "undefined" ? self : globalThis);
