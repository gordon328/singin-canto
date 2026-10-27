// 底部弹层（样式、滑入、下拉关闭、减弱动态）和词卡改版
const F = require("./fixtures.js");
module.exports = { name: "sheet", async run(b) {
  await F.seed(b);
  await F.openSong(b, "t1");
  await b.ev(F.tapChar(0, 2)); await b.sleep(600);
  const st = await b.ev(`(() => { const s = getComputedStyle(document.querySelector("#sheet")); const g = document.querySelector("#sheet .grab").getBoundingClientRect();
    const scrim = getComputedStyle(document.documentElement).getPropertyValue("--scrim").trim().replace(/\\s/g, "");
    return { r: s.borderTopLeftRadius, g: [Math.round(g.width), Math.round(g.height)], bd: getComputedStyle(document.querySelector("#backdrop")).backgroundColor.replace(/\\s/g, ""), scrim }; })()`);
  b.check("sheet-style " + JSON.stringify(st), st.r === "34px" && st.g[0] === 40 && st.g[1] === 5 && st.bd === "rgba(0,0,0,0)");
  // 状态栏方案 c：遮罩透明（不变暗、不模糊），弹层靠自己的阴影/描边和页面分开（深色模式也要有）
  const sep = `(() => { const s = getComputedStyle(document.querySelector("#sheet")); return [s.boxShadow, getComputedStyle(document.querySelector("#backdrop")).backdropFilter]; })()`;
  const lightSep = await b.ev(sep); await b.dark(true); await b.sleep(200); const darkSep = await b.ev(sep); await b.dark(false); await b.sleep(200);
  b.check("sheet-separated " + JSON.stringify([lightSep, darkSep]), lightSep[0] !== "none" && darkSep[0] !== "none" && lightSep[1] === "none");
  b.check("sheet-open-anim", await b.ev(`document.querySelector("#sheet").classList.contains("open") && getComputedStyle(document.querySelector("#sheet")).transitionProperty.includes("transform")`));
  const sq = await b.ev(`(() => { const q = document.querySelector(".wc-square"); return q ? { t: q.innerText.replace(/\\s+/g, ""), bg: getComputedStyle(q).backgroundColor,
    soft: getComputedStyle(document.documentElement).getPropertyValue("--accent-soft").trim() } : null; })()`);
  b.check("word-square " + JSON.stringify(sq), !!sq && sq.t.includes("風") && sq.t.includes("褸") && sq.t.includes("fung1") && sq.bg === "rgb(236, 233, 253)");
  const tags = await b.ev(`[...document.querySelectorAll(".tone-tag")].map(e => e.innerText.trim())`);
  b.check("tone-tags " + JSON.stringify(tags), tags.length === 2 && tags[0] === "第 1 声 · 高平");
  const txt = await b.ev(F.sheetText);
  b.check("meaning-tip", txt.includes("风衣") && !!(await b.ev(`document.querySelector(".wc-tip") && document.querySelector(".wc-tip").innerText.includes("提示")`)));
  const btns = await b.ev(`(() => { const a = [...document.querySelectorAll("#sheetBody .btn")]; const say = a.find(e => e.innerText.includes("听标准发音")), orig = a.find(e => e.innerText.includes("播放原唱这句"));
    if (!say || !orig) return null; const r1 = say.getBoundingClientRect(), r2 = orig.getBoundingClientRect();
    return { p: say.classList.contains("primary"), s: orig.classList.contains("soft"), row: Math.abs(r1.top - r2.top) < 1, half: Math.abs(r1.width - r2.width) < 2 }; })()`);
  b.check("two-buttons " + JSON.stringify(btns), !!btns && btns.p && btns.s && btns.row && btns.half);
  b.check("add-dashed", (await b.ev(`getComputedStyle(document.querySelector("[data-addcard]")).borderTopStyle`)) === "dashed");
  await b.shot("wordcard-light"); await b.dark(true); await b.sleep(300); await b.shot("wordcard-dark"); await b.dark(false);
  await b.ev(`document.querySelector("[data-addcard]").click()`); await b.sleep(600);
  b.check("add-card-still-works", (await b.ev(F.sheetText)).includes("已在生词本 · 明天复习"));
  const g = await b.ev(`(() => { const r = document.querySelector("#sheet .grab").getBoundingClientRect(); return [r.left + r.width / 2, r.top + 2]; })()`);
  await b.touch("touchStart", g[0], g[1]);
  for (let i = 1; i <= 5; i++) { await b.touch("touchMove", g[0], g[1] + i * 40); await b.sleep(16); }
  await b.touch("touchEnd"); await b.sleep(600);
  b.check("drag-close", await b.ev(`document.querySelector("#sheet").hidden && document.querySelector("#backdrop").hidden`));
  await b.reducedMotion(true);
  await b.ev(F.tapChar(0, 0)); await b.sleep(500);
  b.check("reduced-motion", !(await b.ev(`getComputedStyle(document.querySelector("#sheet")).transitionProperty`)).includes("transform"));
  await b.reducedMotion(false);
  b.check("sheet: 页面没有报错", b.errors.length === 0);
} };
