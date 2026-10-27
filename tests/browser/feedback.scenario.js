// M3 验收反馈：页面底色、状态栏遮罩、歌词输入框、换一组转圈、--danger、按下状态复位、导入页保存、确认窗
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const toast = `(document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText)`;
const cs = (sel, prop) => `getComputedStyle(document.querySelector(${JSON.stringify(sel)})).${prop}`;
module.exports = { name: "feedback", async run(b) {
  await F.seed(b);

  // bug 3：每个页面从一开始就有不透明底色
  b.check("pages-opaque", await b.ev(`["home","importView","syncView","playerView","proofView"].every(id => { const c = getComputedStyle(document.getElementById(id)).backgroundColor; return c !== "rgba(0, 0, 0, 0)" && c !== "transparent"; })`));

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

  // 状态栏方案 d：整屏变暗（含状态栏），遮罩一直不透明，变的是它自己的颜色（Safari 取到的永远是遮罩当时的颜色）；
  // 顶部色带在遮罩下面，跟着一起变暗
  const bd = `(() => { const e = document.querySelector("#backdrop"), s = getComputedStyle(e), r = e.getBoundingClientRect();
    return { pos: s.position, top: r.top, covers: r.bottom >= innerHeight, op: +s.opacity, bg: s.backgroundColor, tr: s.transitionProperty,
      tintZ: +getComputedStyle(document.querySelector("#topTint")).zIndex, z: +s.zIndex, hidden: e.hidden }; })()`;
  const scrim = await b.ev(`(() => { const d = document.createElement("div"); d.style.background = "var(--scrim)"; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; })()`);
  b.check("tint-exists", await b.ev(`getComputedStyle(document.querySelector("#topTint")).position === "fixed"`));
  await b.ev(click("#btnBackup")); await b.sleep(500);
  const o = await b.ev(bd);
  b.check("backdrop-full-dim " + JSON.stringify(o), o.pos === "fixed" && o.top === 0 && o.covers && o.op === 1 && o.bg === scrim && o.tintZ < o.z);
  b.check("no-shade", await b.ev(`!document.querySelector("#sheetShade")`));
  // M3.7：Safari 给状态栏取色不跟过渡走（v10 打开闪白、关闭闪暗），改成一下子变暗、一下子恢复
  b.check("backdrop-no-transition " + o.tr, o.tr === "all" ? (await b.ev(`getComputedStyle(document.querySelector("#backdrop")).transitionDuration`)) === "0s" : !/background|opacity/.test(o.tr));
  await b.ev(`document.querySelector("#backdrop").click()`); await b.sleep(20);
  b.check("close-undims-at-once", (await b.ev(bd)).hidden);
  await b.sleep(500);
  await b.ev(click("#btnBackup")); await b.sleep(20);
  b.check("open-dims-at-once", (await b.ev(bd)).bg === scrim);
  await b.ev(`document.querySelector("#backdrop").click()`); await b.sleep(500);

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

  // bug 2：按下效果由 JS 控制（.pressed），不用 CSS :active；跳转前先松开；回到首页时没有按下的元素
  b.check("no-css-active", await b.ev(`![...document.styleSheets[0].cssRules].some(function walk(r) { return /:active/.test(r.selectorText || "") || [...(r.cssRules || [])].some(walk); })`));
  const tf = `getComputedStyle(document.querySelector("#btnAdd")).transform`;
  const pdown = (sel, type) => `document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new PointerEvent(${JSON.stringify(type)}, { bubbles: true, clientX: 300, clientY: 880 }))`;
  await b.ev(pdown("#btnAdd", "pointerdown")); await b.sleep(150);
  b.check("press-on-down " + (await b.ev(tf)), await b.ev(`document.querySelector("#btnAdd").classList.contains("pressed")`) && (await b.ev(tf)) !== "none");
  await b.ev(pdown("#btnAdd", "pointerup"));
  b.check("release-on-up", !(await b.ev(`document.querySelector("#btnAdd").classList.contains("pressed")`)));
  await b.ev(pdown("#btnAdd", "pointerdown")); await b.ev(pdown("#btnAdd", "pointercancel"));
  b.check("release-on-cancel", !(await b.ev(`document.querySelector("#btnAdd").classList.contains("pressed")`)));
  // 按着就点了跳转：跳转开始前已经松开
  await b.ev(`(() => { const e = document.querySelector("#btnAdd"); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); e.click(); window.__pressedAtNav = null;
    requestAnimationFrame(() => { window.__pressedAtNav = e.classList.contains("pressed"); }); })()`);
  await b.sleep(50);
  b.check("released-before-nav", (await b.ev("window.__pressedAtNav")) === false);
  await b.sleep(700);
  await b.ev(`(() => { const e = document.querySelector("#importView [data-back]"); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); e.click(); })()`);
  await b.sleep(800);
  await b.ev(`document.querySelector("#btnAdd").classList.add("pressed")`);
  await b.ev(`window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))`);
  b.check("home-clean-after-back", await b.ev(`!document.querySelector("#home").hidden && !document.querySelector(".pressed")`));

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

  // M3.9：歌曲页有吸顶的顶栏（sticky），Safari 会拿它的背景色染状态栏，盖在上面的遮罩不起作用。
  // 弹层打开时顶栏的背景色变透明（底色改用背景图画，看起来不变），让 Safari 跳过它
  const barBg = `(() => { const s = getComputedStyle(document.querySelector("#playerView .bar")); return { c: s.backgroundColor, img: s.backgroundImage }; })()`;
  b.check("bar-normal " + JSON.stringify(await b.ev(barBg)), (await b.ev(barBg)).c !== "rgba(0, 0, 0, 0)" && (await b.ev(barBg)).img === "none");
  await b.ev(click("#btnMenu")); await b.sleep(20);
  const ob = await b.ev(barBg);
  b.check("bar-skipped-while-sheet " + JSON.stringify(ob), ob.c === "rgba(0, 0, 0, 0)" && /gradient/.test(ob.img));
  await b.ev(`document.querySelector("#backdrop").click()`); await b.sleep(20);
  b.check("bar-back-after-close " + JSON.stringify(await b.ev(barBg)), (await b.ev(barBg)).c !== "rgba(0, 0, 0, 0)" && (await b.ev(barBg)).img === "none");
  await b.sleep(400);

  b.check("feedback: 页面没有报错", b.errors.length === 0);
} };
