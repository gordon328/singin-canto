// M3 验收反馈：页面底色、状态栏遮罩、歌词输入框、换一组转圈、--danger、按下状态复位、导入页保存、确认窗
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const toast = `(document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText)`;
const cs = (sel, prop) => `getComputedStyle(document.querySelector(${JSON.stringify(sel)})).${prop}`;
module.exports = { name: "feedback", async run(b) {
  await F.seed(b);

  // bug 3：每个页面从一开始就有不透明底色
  b.check("pages-opaque", await b.ev(`["home","importView","syncView","playerView","proofView","settingsView"].every(id => { const c = getComputedStyle(document.getElementById(id)).backgroundColor; return c !== "rgba(0, 0, 0, 0)" && c !== "transparent"; })`));

  // 改进 8：--danger
  const danger = `getComputedStyle(document.documentElement).getPropertyValue("--danger").trim().toUpperCase()`;
  b.check("danger-light", (await b.ev(danger)) === "#C2413A");
  await b.dark(true); await b.sleep(150);
  b.check("danger-dark", (await b.ev(danger)) === "#FF8A80");
  await b.dark(false); await b.sleep(150);

  // 改进 7：换一组的图标转一圈；减弱动态效果时不转
  const spinName = `(() => { const a = document.querySelector("#btnToneNext svg").getAnimations(); return a.map(x => x.animationName).join(); })()`;
  await b.ev(click("#btnToneNext")); await b.sleep(50);
  b.check("tone-spin", (await b.ev(spinName)) === "spin");
  await b.sleep(600);
  await b.reducedMotion(true);
  await b.ev(click("#btnToneNext")); await b.sleep(50);
  b.check("tone-spin-reduced-motion", (await b.ev(spinName)) === "");
  await b.reducedMotion(false); await b.sleep(400);

  // M3.11 状态栏新思路：顶部附近不能出现有颜色的 fixed 元素（去掉 #topTint，遮罩也不用 fixed）。
  // 弹窗的暗色层放进当前页面的根元素里，absolute 铺满整页、跟着页面走，和弹窗一起淡入淡出
  const topFixed = `[...document.querySelectorAll("body *")].filter(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.position === "fixed" && r.height > 0 && r.top <= 60 && r.bottom > 0 && s.visibility !== "hidden" && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor); }).map(e => e.id || e.className)`;
  const dim = `(() => { const e = document.querySelector("#backdrop"), s = getComputedStyle(e), p = e.parentElement, r = e.getBoundingClientRect(), pr = p.getBoundingClientRect();
    return { parent: p.id, pos: s.position, fits: Math.abs(r.top - pr.top) < 1 && Math.abs(r.height - pr.height) < 1 && r.height >= innerHeight, op: +s.opacity, bg: s.backgroundColor, tr: s.transitionProperty, hidden: e.hidden }; })()`;
  const scrim = await b.ev(`(() => { const d = document.createElement("div"); d.style.background = "var(--scrim)"; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; })()`);
  b.check("no-top-tint", !(await b.ev(`!!document.querySelector("#topTint")`)));
  await F.openSong(b, "t1");
  await b.ev(click("#btnMenu")); await b.sleep(30);
  const opening = await b.ev(dim);
  b.check("dim-fades-in " + JSON.stringify(opening), opening.op < 1 && !opening.hidden);
  await b.sleep(500);
  const o = await b.ev(dim);
  b.check("dim-in-page " + JSON.stringify(o), o.parent === "playerView" && o.pos === "absolute" && o.fits && o.op === 1 && o.bg === scrim && /opacity/.test(o.tr));
  b.check("no-colored-fixed-at-top " + JSON.stringify(await b.ev(topFixed)), JSON.stringify(await b.ev(topFixed)) === "[]");
  await b.ev(`document.querySelector("#backdrop").click()`); await b.sleep(60);
  const closing = await b.ev(dim);
  b.check("dim-fades-out " + JSON.stringify(closing), closing.op < 1 && closing.op > 0 && !closing.hidden);
  await b.sleep(500);
  b.check("dim-hidden-after-close", (await b.ev(dim)).hidden);
  await b.ev("window.scrollTo(0, document.scrollingElement.scrollHeight)"); await b.sleep(300);
  await b.ev(click("#btnMenu")); await b.sleep(500);
  const os = await b.ev(dim);
  b.check("dim-covers-scrolled " + JSON.stringify(os), os.fits && os.op === 1 && JSON.stringify(await b.ev(topFixed)) === "[]");
  await F.closeSheet(b);
  await b.ev(click("#playerView [data-back]")); await b.sleep(900);

  // bug 5：歌词输入框固定高度，文字不溢出
  await b.ev(click("#btnAdd")); await b.sleep(700);
  const taH = `document.querySelector("#fLyrics").getBoundingClientRect().height`;
  const h0 = await b.ev(taH);
  await b.ev(`(() => { const t = document.querySelector("#fLyrics"); t.value = Array.from({ length: 40 }, (_, i) => "第" + i + "句測試").join("\\n"); t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.sleep(100);
  const h1 = await b.ev(taH);
  const lh = await b.ev(`parseFloat(getComputedStyle(document.querySelector("#fLyrics")).lineHeight)`);
  const below = await b.ev(`document.querySelector("#lyricsInfo").getBoundingClientRect().top >= document.querySelector("#fLyrics").getBoundingClientRect().bottom`);
  b.check(`lyrics-box-fixed ${h0} ${h1} ${lh}`, Math.abs(h0 - (lh * 7 + 28)) < 1 && h1 === h0 && below
    && (await b.ev(cs("#fLyrics", "overflowY"))) === "auto" && (await b.ev(cs("#fLyrics", "clipPath"))) !== "none");
  await b.ev(click("#importView [data-back]")); await b.sleep(700);

  // bug 2：按下效果由 JS 控制（.is-pressed），不用 CSS :active；跳转前先松开；回到首页时没有按下的元素
  b.check("no-css-active", await b.ev(`![...document.styleSheets[0].cssRules].some(function walk(r) { return /:active/.test(r.selectorText || "") || [...(r.cssRules || [])].some(walk); })`));
  const tf = `getComputedStyle(document.querySelector("#btnAdd")).transform`;
  const pdown = (sel, type) => `document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new PointerEvent(${JSON.stringify(type)}, { bubbles: true, clientX: 300, clientY: 880 }))`;
  await b.ev(pdown("#btnAdd", "pointerdown")); await b.sleep(150);
  b.check("press-on-down " + (await b.ev(tf)), await b.ev(`document.querySelector("#btnAdd").classList.contains("is-pressed")`) && (await b.ev(tf)) !== "none");
  await b.ev(pdown("#btnAdd", "pointerup"));
  b.check("release-on-up", !(await b.ev(`document.querySelector("#btnAdd").classList.contains("is-pressed")`)));
  await b.ev(pdown("#btnAdd", "pointerdown")); await b.ev(pdown("#btnAdd", "pointercancel"));
  b.check("release-on-cancel", !(await b.ev(`document.querySelector("#btnAdd").classList.contains("is-pressed")`)));
  // 按着就点了跳转：跳转开始前已经松开
  await b.ev(`(() => { const e = document.querySelector("#btnAdd"); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); e.click(); window.__pressedAtNav = null;
    requestAnimationFrame(() => { window.__pressedAtNav = e.classList.contains("is-pressed"); }); })()`);
  await b.sleep(50);
  b.check("released-before-nav", (await b.ev("window.__pressedAtNav")) === false);
  await b.sleep(700);
  await b.ev(`(() => { const e = document.querySelector("#importView [data-back]"); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); e.click(); })()`);
  await b.sleep(800);
  await b.ev(`document.querySelector("#btnAdd").classList.add("is-pressed")`);
  await b.ev(`window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))`);
  b.check("home-clean-after-back", await b.ev(`!document.querySelector("#home").hidden && !document.querySelector(".is-pressed")`));

  // bug 4：导入页保存按钮不灰掉；缺东西时提示并滚到那一步；连点只存一首
  await b.ev(click("#btnAdd")); await b.sleep(700);
  b.check("save-not-disabled", (await b.ev(`document.querySelector("#btnSave").disabled`)) === false);
  await b.ev(click("#btnSave")); await b.sleep(150);
  b.check("save-missing-both " + (await b.ev(toast)), (await b.ev(toast)) === "还差：音频文件、歌词");
  await b.ev(`(() => { const t = document.querySelector("#fLyrics"); t.value = "[00:01.00]第一句測試\\n[00:03.00]第二句測試"; t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev("window.scrollTo(0, document.body.scrollHeight)"); await b.sleep(100);
  await b.ev(click("#btnSave")); await b.sleep(700);
  const audioCard = `document.querySelector("#fAudio").closest(".card")`;
  const top = await b.ev(audioCard + ".getBoundingClientRect().top");
  b.check(`save-missing-audio ${top} ${await b.ev(toast)}`, (await b.ev(toast)) === "还差：音频文件" && top >= 60 && top <= 140
    && (await b.ev(audioCard + ".classList.contains('need')")));
  await b.ev(`(() => { const dt = new DataTransfer(); dt.items.add(${F.silentWav(5, "測試.wav")}); const i = document.querySelector("#fAudio"); i.files = dt.files; i.dispatchEvent(new Event("change")); })()`);
  await b.sleep(800);
  const before = await b.ev(F.idbCount("songs"));
  await b.ev(`(() => { const s = document.querySelector("#btnSave"); s.click(); s.click(); })()`); await b.sleep(1200);
  b.check("save-once " + before + "→" + (await b.ev(F.idbCount("songs"))), (await b.ev(F.idbCount("songs"))) === before + 1 && await b.ev(`!document.querySelector("#playerView").hidden`));

  b.check("feedback: 页面没有报错", b.errors.length === 0);
} };
