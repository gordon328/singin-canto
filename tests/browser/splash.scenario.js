// 启动画面（v0.38）：读数据期间显示当前皮肤的底色 + 图标 +「唱学粤语」，数据读完就淡出（0.3 秒），没有最短显示时间；
// 深色和各个皮肤都不闪白；manifest 的颜色和启动画面一致
const fs = require("fs"), path = require("path");
const F = require("./fixtures.js");
const night = require("../../skins/night.js"), lilac = require("../../skins/lilac.js");
const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
// 在页面最早的时候记下：DOMContentLoaded 时启动画面的样子；启动画面开始淡出、消失的时间
const WATCH = `(() => { window.__sp = {};
  document.addEventListener("DOMContentLoaded", () => { const s = document.querySelector("#splash"); window.__sp.dcl = s && { bg: getComputedStyle(s).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor, html: getComputedStyle(document.documentElement).backgroundColor,
    img: !!s.querySelector("img"), text: s.innerText.trim(), color: getComputedStyle(s).color, shown: getComputedStyle(s).display !== "none" && getComputedStyle(s).opacity === "1" }; window.__sp.t0 = performance.now(); }, { capture: true, once: true });
  new MutationObserver(() => { const s = document.querySelector("#splash"); if (!s) { if (window.__sp.seen) window.__sp.gone = window.__sp.gone || performance.now(); return; } window.__sp.seen = true;
    if (s.classList.contains("out") && !window.__sp.out) window.__sp.out = performance.now(); }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] }); })()`;

module.exports = { name: "splash", async run(b) {
  // manifest：启动前系统显示的颜色 = 默认皮肤（丁香浅色）的底色
  const man = JSON.parse(fs.readFileSync(path.join(__dirname, "../../manifest.json"), "utf8"));
  b.check("manifest-colors " + [man.background_color, man.theme_color], man.background_color.toUpperCase() === lilac.light.bg && man.theme_color.toUpperCase() === lilac.light.bg);

  await F.seed(b);
  const hook = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH });
  // 丁香浅色
  await b.nav("/");
  let sp = await b.ev("window.__sp");
  b.check("lilac-splash " + JSON.stringify(sp.dcl), !!sp.dcl && sp.dcl.shown && sp.dcl.bg === rgb(lilac.light.bg) && sp.dcl.img && sp.dcl.text === "唱学粤语" && sp.dcl.color === rgb(lilac.light.ink)
    && sp.dcl.body === rgb(lilac.light.bg));
  b.check("removed-after-boot", !(await b.ev(`!!document.querySelector("#splash")`)) && !!sp.out && !!sp.gone);
  b.check("fade-0.3s " + JSON.stringify([sp.out, sp.gone]), sp.gone - sp.out >= 250 && sp.gone - sp.out < 700);
  b.check("no-min-time " + Math.round(sp.out - sp.t0), sp.out - sp.t0 < 1500);
  // 丁香深色、夜曲：第一帧就是深色，不闪白
  await b.dark(true); await b.nav("/");
  sp = await b.ev("window.__sp");
  b.check("lilac-dark-splash " + JSON.stringify(sp.dcl), sp.dcl.bg === rgb(lilac.dark.bg) && sp.dcl.body === rgb(lilac.dark.bg) && sp.dcl.html === rgb(lilac.dark.bg));
  await b.dark(false);
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
    st.get("checkin").onsuccess = e => { st.put({ ...(e.target.result || { key: "checkin", days: {} }), unlocked: ["lilac", "night"], theme: "night" }).onsuccess = () => { db.close(); res(); }; }; }; })`);
  await b.ev(`localStorage.setItem("yc-skin", "night")`); await b.nav("/");
  sp = await b.ev("window.__sp");
  b.check("night-splash " + JSON.stringify(sp.dcl), sp.dcl.bg === rgb(night.dark.bg) && sp.dcl.html === rgb(night.dark.bg) && sp.dcl.color === rgb(night.dark.ink));
  // 减弱动态效果：直接消失
  await b.reducedMotion(true); await b.nav("/");
  sp = await b.ev("window.__sp");
  b.check("reduced-motion-no-fade " + JSON.stringify([sp.out, sp.gone]), !(await b.ev(`!!document.querySelector("#splash")`)) && (!sp.out || sp.gone - sp.out < 100));
  await b.reducedMotion(false);
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: hook.result.identifier });
  b.check("no-errors", b.errors.length === 0);
} };
