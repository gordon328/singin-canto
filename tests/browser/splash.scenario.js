// 开屏动画（v0.40，设计规范 5.17）：颜色只跟系统深色/浅色（不跟皮肤），第一帧就是对的底色；图标 = icons/splash-icon.svg 原样内联（96px，不加圆角/阴影）+ singin’ canto；
// 动画完整放完（1.45 秒）才淡出 0.25 秒，数据慢就停在完整画面等；减弱动态效果时没有动画、读完就淡出。
// 新图标和主屏幕名字 Singin’ Canto（manifest、apple-touch-icon、apple-mobile-web-app-title、sw 缓存）
const fs = require("fs"), path = require("path");
const F = require("./fixtures.js");
const ROOT = path.join(__dirname, "../..");
const NAME = "Singin’ Canto";
const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const LIGHT = { bg: "#F7F6FB", ink: "#221F33" }, DARK = { bg: "#15131F", ink: "#F1EFF8" };
const pngSize = f => { const b = fs.readFileSync(path.join(ROOT, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
// 在页面最早的时候记下：DOMContentLoaded 时开屏的样子；开屏开始淡出、消失的时间
const WATCH = `(() => { window.__sp = {};
  document.addEventListener("DOMContentLoaded", () => { const s = document.querySelector("#splash"), cs = e => getComputedStyle(e);
    const ic = s && s.querySelector(".sp-icon"), nm = s && s.querySelector(".sp-name");
    window.__sp.dcl = s && { bg: cs(s).backgroundColor, body: cs(document.body).backgroundColor, html: cs(document.documentElement).backgroundColor,
      color: cs(nm).color, text: nm.textContent, shown: cs(s).display !== "none" && cs(s).opacity === "1",
      icon: [ic.offsetWidth, ic.offsetHeight, ...[ic, ic.querySelector("svg")].flatMap(e => [cs(e).borderTopLeftRadius, cs(e).boxShadow, cs(e).outlineStyle, cs(e).borderTopStyle, cs(e).filter])].join(),
      font: [cs(nm).fontFamily.split(",")[0].replace(/"/g, ""), cs(nm).fontWeight, cs(nm).fontSize, cs(nm).letterSpacing].join(),
      tones: [0, 1, 2, 3, 4, 5].map(i => cs(s.querySelector(".tone-" + i)).animationDelay + "/" + cs(s.querySelector(".glow-" + i)).animationDelay).join(), glows: s.querySelectorAll(".glow").length,
      box: (r => [r.left + r.width / 2, r.top + r.height / 2, r.height, innerWidth, innerHeight].map(v => Math.round(v * 10) / 10).join())(s.querySelector(".sp-box").getBoundingClientRect()),
      name: (r => [r.left + r.width / 2, nm.offsetTop - ic.offsetTop - ic.offsetHeight].map(v => Math.round(v * 100) / 100).join())(nm.getBoundingClientRect()),
      toneOp: cs(s.querySelector(".tone")).opacity, glowOp: cs(s.querySelector(".glow")).opacity, anims: s.getAnimations({ subtree: true }).length }; window.__sp.t0 = performance.now(); }, { capture: true, once: true });
  new MutationObserver(() => { const s = document.querySelector("#splash"); if (!s) { if (window.__sp.seen) window.__sp.gone = window.__sp.gone || performance.now(); return; } window.__sp.seen = true;
    if (s.classList.contains("out") && !window.__sp.out) { window.__sp.out = performance.now(); const a = s.querySelector(".sp-name").getAnimations()[0]; window.__sp.outAt = a ? document.timeline.currentTime - a.startTime : null; } }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] }); })()`;
// 数据读得慢：打开数据库晚 2.5 秒
const SLOW_DB = `(() => { const open = indexedDB.open.bind(indexedDB); indexedDB.open = (...a) => { const r = open(...a), fake = {};
  for (const ev of ["success", "error", "upgradeneeded", "blocked"]) r["on" + ev] = e => setTimeout(() => fake["on" + ev] && fake["on" + ev].call(r, e), ev === "upgradeneeded" ? 0 : 2500);
  return new Proxy(r, { set(t, k, v) { if (/^on/.test(k)) { fake[k] = v; return true; } t[k] = v; return true; }, get(t, k) { const v = t[k]; return typeof v === "function" ? v.bind(t) : v; } }); }; })()`;

module.exports = { name: "splash", async run(b) {
  // ---- 图标和主屏幕名字 ----
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  b.check("manifest-name", man.name === NAME && man.short_name === NAME);
  b.check("manifest-icons " + JSON.stringify(man.icons), man.icons.map(i => [i.src, i.sizes, i.purpose].join()).join("|") === "icons/icon-192.png,192x192,any|icons/icon-512.png,512x512,any");
  b.check("manifest-colors", man.background_color.toUpperCase() === LIGHT.bg && man.theme_color.toUpperCase() === LIGHT.bg);
  b.check("icon-files", pngSize("icons/icon-192.png").join() === "192,192" && pngSize("icons/icon-512.png").join() === "512,512"
    && pngSize("icons/apple-touch-icon.png").join() === "180,180" && pngSize("icons/icon-1024.png").join() === "1024,1024" && fs.existsSync(path.join(ROOT, "icons/icon.svg")));
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  b.check("head-icon-title", (html.match(/rel="apple-touch-icon"/g) || []).length === 1 && html.includes(`<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`)
    && html.includes(`<meta name="apple-mobile-web-app-title" content="${NAME}">`) && !/<img[^>]+icons\//.test(html));
  const svgFile = fs.readFileSync(path.join(ROOT, "icons/splash-icon.svg"), "utf8").trim();
  b.check("inline-svg-verbatim", html.includes('<div class="sp-icon">' + svgFile + "</div>"));
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  b.check("sw-caches-icons", ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "splash-icon.svg"].every(f => sw.includes(`"./icons/${f}"`)));

  await F.seed(b);
  const hook = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH });
  const load = async () => { await b.nav("/"); await b.sleep(900); return b.ev("window.__sp"); };

  // ---- 系统浅色：第一帧底色、画面、时间线 ----
  let sp = await load();
  b.check("light-first-frame " + JSON.stringify(sp.dcl), !!sp.dcl && sp.dcl.shown && sp.dcl.bg === rgb(LIGHT.bg) && sp.dcl.html === rgb(LIGHT.bg) && sp.dcl.body === rgb(LIGHT.bg)
    && sp.dcl.color === rgb(LIGHT.ink) && sp.dcl.text === "singin’ canto");
  b.check("icon-96-no-radius-shadow " + sp.dcl.icon, sp.dcl.icon === "96,96,0px,none,none,none,none,0px,none,none,none,none");
  // 整体：水平居中、可见区域正中再往上 24px；高 = 96 + 20 + 24。名字框往右 0.25px（让实际字形居中），离图标 20px
  b.check("layout " + sp.dcl.box + " / " + sp.dcl.name, sp.dcl.box === "215,442,140,430,932" && sp.dcl.name === "215.24,20");
  b.check("name-font " + sp.dcl.font, sp.dcl.font === "Outfit,600,24px,0.24px");
  b.check("tones-left-to-right " + sp.dcl.tones, sp.dcl.tones === "0.2s/0.2s,0.31s/0.31s,0.42s/0.42s,0.53s/0.53s,0.64s/0.64s,0.75s/0.75s" && sp.dcl.glows === 6 && sp.dcl.toneOp === "0.18" && sp.dcl.glowOp === "0" && sp.dcl.anims >= 14);
  // 淡出开始时，开屏动画（从它真正开始放算起）已经放到 1.45 秒
  b.check("plays-full-1.45s " + Math.round(sp.outAt), sp.outAt >= 1440 && sp.outAt < 1700);
  b.check("fade-0.25s " + Math.round(sp.gone - sp.out), sp.gone - sp.out >= 200 && sp.gone - sp.out < 600);
  b.check("removed-and-skin-back", !(await b.ev(`!!document.querySelector("#splash")`)) && !(await b.ev(`document.documentElement.classList.contains("booting")`)));
  // 首页在开屏下面已经准备好：淡出后没有进场动画
  b.check("home-ready-under", (await b.ev(`document.querySelector("#home").getAnimations({ subtree: true }).length`)) === 0 && (await b.ev(`!!document.querySelector("#streak .wk-day")`)));
  // 从后台切回来不播
  await b.ev(`document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))`); await b.sleep(200);
  b.check("no-replay-from-background", !(await b.ev(`!!document.querySelector("#splash")`)));

  // ---- 系统深色 ----
  await b.dark(true); sp = await load();
  b.check("dark-first-frame " + JSON.stringify(sp.dcl), sp.dcl.bg === rgb(DARK.bg) && sp.dcl.html === rgb(DARK.bg) && sp.dcl.body === rgb(DARK.bg) && sp.dcl.color === rgb(DARK.ink));
  await b.dark(false);

  // ---- 不跟皮肤：用夜曲（深色皮肤）、系统浅色，开屏还是浅色 ----
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
    st.get("checkin").onsuccess = e => { st.put({ ...(e.target.result || { key: "checkin", days: {} }), unlocked: ["lilac", "night"], theme: "night" }).onsuccess = () => { db.close(); res(); }; }; }; })`);
  await b.ev(`localStorage.setItem("yc-skin", "night")`); sp = await load();
  b.check("night-skin-still-system-light " + JSON.stringify(sp.dcl), sp.dcl.bg === rgb(LIGHT.bg) && sp.dcl.html === rgb(LIGHT.bg) && sp.dcl.color === rgb(LIGHT.ink));
  b.check("skin-bg-after-splash", (await b.ev(`getComputedStyle(document.documentElement).backgroundColor`)) !== rgb(LIGHT.bg));
  await b.ev(`localStorage.setItem("yc-skin", "lilac")`);

  // ---- 数据读得慢：停在完整画面，读完再淡出 ----
  const slow = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: SLOW_DB });
  await b.send("Page.navigate", { url: "http://localhost:8080/" }); await b.sleep(2000); // 不用 b.nav：它会等开屏消失
  const still = await b.ev(`(() => { const s = document.querySelector("#splash"); return !!s && !s.classList.contains("out") && getComputedStyle(s.querySelector(".sp-name")).opacity === "1"
    && [...s.querySelectorAll(".tone, .glow")].every(e => getComputedStyle(e).opacity === "1"); })()`);
  b.check("slow-data-holds-full-frame", still);
  await b.sleep(1500); sp = await b.ev("window.__sp");
  b.check("slow-data-fades-after-load " + Math.round(sp.out - sp.t0), !!sp.out && sp.out - sp.t0 >= 2300);
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: slow.result.identifier });

  // ---- 减弱动态效果：没有动画，直接完整画面，读完就淡出 ----
  await b.reducedMotion(true); sp = await load();
  b.check("reduced-motion-static " + JSON.stringify([sp.dcl.anims, sp.dcl.toneOp]), sp.dcl.anims === 0 && sp.dcl.toneOp === "1" && sp.dcl.glowOp === "1" && sp.dcl.shown);
  b.check("reduced-motion-no-wait " + Math.round(sp.out - sp.t0), sp.out - sp.t0 < 1000 && sp.gone - sp.out >= 200);
  await b.reducedMotion(false);

  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: hook.result.identifier });
  b.check("no-errors", b.errors.length === 0);
} };
