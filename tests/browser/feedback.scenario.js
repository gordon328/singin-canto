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

  // bug 1：遮罩不盖住顶部安全区（状态栏那一条不变色）
  const sa = await b.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, topMax: 47, bottom: 34, bottomMax: 34, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
  if (sa.error) {
    // 本机 Chrome 不能模拟安全区：直接看样式表里遮罩的 top 是不是顶部安全区
    const rule = await b.ev(`[...document.styleSheets[0].cssRules].filter(r => r.selectorText === ".backdrop").map(r => r.style.top).join()`);
    b.check("backdrop-below-safe-area(css) " + rule, /safe-area-inset-top/.test(rule));
  } else {
    await b.sleep(200);
    await b.ev(click("#btnBackup")); await b.sleep(500);
    const top = await b.ev(`document.querySelector("#backdrop").getBoundingClientRect().top`);
    const strip = await b.ev(`(() => { const s = getComputedStyle(document.body, "::before"); return [s.height, s.zIndex]; })()`);
    b.check("backdrop-below-safe-area " + top + " " + strip, top === 47 && strip[0] === "47px");
    await F.closeSheet(b);
    await b.send("Emulation.setSafeAreaInsetsOverride", { insets: {} });
  }

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

  // bug 2：回到首页时按钮是初始状态（iPhone 上 :active 会卡住，这里用 forcePseudoState 模拟卡住）
  await b.send("DOM.enable"); await b.send("CSS.enable");
  const root = (await b.send("DOM.getDocument")).result.root.nodeId;
  const fab = (await b.send("DOM.querySelector", { nodeId: root, selector: "#btnAdd" })).result.nodeId;
  await b.ev(click("#btnAdd")); await b.sleep(700);
  await b.send("CSS.forcePseudoState", { nodeId: fab, forcedPseudoClasses: ["active", "hover"] });
  await b.ev(click("#importView [data-back]")); await b.sleep(700);
  const bg = `getComputedStyle(document.querySelector("#btnAdd")).backgroundColor`;
  const tf = `getComputedStyle(document.querySelector("#btnAdd")).transform`;
  const inverse = await b.ev(`(() => { const d = document.createElement("div"); d.style.color = "var(--inverse)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })()`);
  b.check("press-reset-after-nav " + (await b.ev(tf)) + " " + (await b.ev(bg)), (await b.ev(tf)) === "none" && (await b.ev(bg)) === inverse);
  await b.touch("touchStart", 10, 400); await b.touch("touchEnd", 10, 400); await b.sleep(150);
  b.check("press-works-after-touch " + (await b.ev(tf)), (await b.ev(tf)) !== "none");
  await b.send("CSS.forcePseudoState", { nodeId: fab, forcedPseudoClasses: [] });

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
