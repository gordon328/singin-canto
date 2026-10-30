// 皮肤（v0.33）：颜色全部来自 skins/<id>.js；组件里没有皮肤 id 判断、没有写死的颜色；首屏就是对的颜色；五种配色截图
const fs = require("fs"), path = require("path");
const F = require("./fixtures.js");
const SKIN = require("../../skins/skin.js");
const ids = require("../../skins/registry.js");
const defs = Object.fromEntries(ids.map(id => [id, require(`../../skins/${id}.js`)]));
const cssVar = n => `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(n)}).trim()`;
const setCheckin = o => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
  st.get("checkin").onsuccess = e => { const c = e.target.result || { key: "checkin", days: {}, restTokens: 1, bestStreak: 0 }; st.put({ ...c, ...${JSON.stringify(o)} }).onsuccess = () => { db.close(); res(); }; }; }; })`;
const LOOKS = [["lilac", false], ["lilac", true], ["night", false], ["mist", false], ["mist", true]];

module.exports = { name: "skins", async run(b) {
  // ---- 组件代码里没有皮肤 id 判断、没有写死的颜色 ----
  const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
  const body = html.replace(/<!-- 皮肤：开始 -->[\s\S]*?<!-- 皮肤：结束 -->/, "");
  b.check("head-skin-block-marked", body !== html);
  const ids_ = ids.filter(id => new RegExp(`["'\`]${id}["'\`]|data-skin="${id}"`).test(body));
  b.check("no-skin-ids-in-components " + ids_.join(","), ids_.length === 0);
  const css = [...body.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const colors = (css.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g) || []).filter(c => c !== "#000");
  b.check("no-hard-coded-colors-in-css " + colors.slice(0, 5).join(" "), colors.length === 0);
  b.check("no-data-theme", !/data-theme/.test(body));

  await F.seed(b);
  b.check("default-lilac", (await b.ev(`document.documentElement.dataset.skin`)) === "lilac" && (await b.ev(cssVar("--bg"))) === "#F7F6FB");

  // ---- 五种配色 ----
  for (const [id, dark] of LOOKS) {
    await b.dark(dark);
    await b.ev(setCheckin({ unlocked: ["lilac", "night", "mist"], theme: id }));
    await b.ev(`localStorage.setItem("yc-skin", ${JSON.stringify(id)})`);
    await b.nav("/"); await b.sleep(300);
    const c = SKIN.colorsFor(defs[id], dark), name = `${id}-${dark && defs[id].modes === "auto" ? "dark" : defs[id].modes === "dark-only" ? "dark" : "light"}`;
    const btn = await b.ev(`(() => { const e = document.querySelector("#today .today-btn"); if (!e) return null; const s = getComputedStyle(e); return [s.backgroundColor, s.color]; })()`);
    const rgb = hex => { const h = hex.replace("#", ""); return `rgb(${[0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(", ")})`; };
    b.check(`look-${name}`, (await b.ev(cssVar("--bg"))) === c.bg && (await b.ev(cssVar("--accent"))) === c.accent && (await b.ev(cssVar("--t1"))) === c.tones[0]
      && (await b.ev(`getComputedStyle(document.body).backgroundColor`)) === rgb(c.bg));
    b.check(`hero-btn-${name} ${JSON.stringify(btn)}`, !!btn && btn[0] === rgb(c.heroBtn) && btn[1] === rgb(c.heroBtnInk));
    b.check(`song-tile-${name}`, (await b.ev(`getComputedStyle(document.querySelector(".song .sq")).backgroundColor`)) === rgb(c.songTiles[0][0]));
    b.check(`no-overflow-${name}`, await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
    await b.shot(`skin-${name}`);
  }
  await b.dark(false);

  // ---- 夜曲不跟系统；晨雾跟系统（不用刷新） ----
  await b.ev(`localStorage.setItem("yc-skin", "night")`); await b.ev(setCheckin({ theme: "night" })); await b.nav("/");
  b.check("night-ignores-system", (await b.ev(cssVar("--bg"))) === "#10131B" && (await b.ev(`getComputedStyle(document.documentElement).colorScheme`)) === "dark");
  b.check("theme-color", (await b.ev(`[...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content).join()`)) === "#10131B,#10131B");
  await b.ev(`localStorage.setItem("yc-skin", "mist")`); await b.ev(setCheckin({ theme: "mist" })); await b.nav("/");
  const light = await b.ev(cssVar("--bg")); await b.dark(true); await b.sleep(200);
  b.check("follows-system", light === "#F3F5F4" && (await b.ev(cssVar("--bg"))) === "#111816");
  await b.dark(false);

  // ---- 首屏就是对的颜色：DOMContentLoaded 之前读到的 --bg ----
  const hook = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener("DOMContentLoaded", () => { window.__firstBg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(); }, { once: true, capture: true });` });
  await b.ev(`localStorage.setItem("yc-skin", "night")`); await b.nav("/");
  b.check("first-paint-skin " + (await b.ev("window.__firstBg")), (await b.ev("window.__firstBg")) === "#10131B");
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: hook.result.identifier });

  // ---- 记录里是不存在的皮肤：显示丁香，记录不动 ----
  await b.ev(setCheckin({ theme: "sakura", unlocked: ["lilac", "sakura"] })); await b.ev(`localStorage.setItem("yc-skin", "sakura")`); await b.nav("/");
  const ci = await b.ev(F.idbGet("meta", "checkin"));
  b.check("unknown-skin-falls-back", (await b.ev(`document.documentElement.dataset.skin`)) === "lilac" && ci.unlocked.includes("sakura") && ci.theme === "sakura");
  // 没解锁的皮肤也不能用
  await b.ev(setCheckin({ theme: "night", unlocked: ["lilac"] })); await b.nav("/");
  b.check("locked-skin-not-used", (await b.ev(`document.documentElement.dataset.skin`)) === "lilac" && (await b.ev(`localStorage.getItem("yc-skin")`)) === "lilac");

  // ---- 切换皮肤 0.3 秒过渡；减弱动态效果时没有 ----
  await b.ev(`applySkin("mist", { animate: true })`);
  b.check("fade-0.3s", await b.ev(`document.documentElement.classList.contains("skin-fade") && getComputedStyle(document.body).transitionDuration.split(",").every(x => x.trim() === "0.3s")`));
  await b.sleep(400);
  b.check("fade-ends", !(await b.ev(`document.documentElement.classList.contains("skin-fade")`)));
  await b.reducedMotion(true);
  await b.ev(`applySkin("lilac", { animate: true })`);
  b.check("no-fade-reduced-motion", !(await b.ev(`document.documentElement.classList.contains("skin-fade")`)) && (await b.ev(`document.documentElement.dataset.skin`)) === "lilac");
  await b.reducedMotion(false);
  b.check("no-errors", b.errors.length === 0);
} };
