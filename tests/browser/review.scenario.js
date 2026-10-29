// M2 最终审查发现的问题：删除词汇包、手势被系统打断、长词词卡、切页时浮动条、连点返回
const F = require("./fixtures.js");
const visible = id => `!!document.querySelector("#${id}") && !document.querySelector("#${id}").hidden`;
module.exports = { name: "review", async run(b) {
  await F.seed(b);
  // 切页时浮动播放条不能跑到屏幕外面（要么先藏起来，要么就在屏幕里）
  await b.ev(`document.querySelector('.song[data-id="t1"]').click()`); await b.sleep(280);// 跳转前先等按钮弹回（两帧 + 120ms），再取切页动画中间
  const mid = await b.ev(`(() => { const p = document.querySelector("#playerView .player"); return { op: getComputedStyle(p).opacity, top: p.getBoundingClientRect().top, h: innerHeight }; })()`);
  await b.sleep(700);
  const end = await b.ev(`(() => { const p = document.querySelector("#playerView .player"); return { op: getComputedStyle(p).opacity, top: p.getBoundingClientRect().top, h: innerHeight }; })()`);
  b.check("fixed-bar-during-transition " + JSON.stringify([mid, end]), (mid.op === "0" || mid.top < mid.h) && end.op === "1" && end.top < end.h);

  // 长词词卡不能超出右边（375 宽）
  await b.viewport(375, 812); await b.sleep(300);
  await b.ev(F.tapChar(2, 0)); await b.sleep(600);
  const wc = await b.ev(`(() => { const s = document.querySelector("#sheet"); return { sw: s.scrollWidth, cw: s.clientWidth, side: Math.round(document.querySelector(".wc-side").getBoundingClientRect().width) }; })()`);
  b.check("long-word-card " + JSON.stringify(wc), wc.sw <= wc.cw && wc.side >= 150);

  // 弹层拖到一半被系统打断（touchcancel）→ 弹回原位
  const g = await b.ev(`(() => { const r = document.querySelector("#sheet .grab").getBoundingClientRect(); return [r.left + r.width / 2, r.top + 2]; })()`);
  await b.touch("touchStart", g[0], g[1]); await b.touch("touchMove", g[0], g[1] + 30); await b.touch("touchMove", g[0], g[1] + 60);
  await b.touch("touchCancel"); await b.sleep(900); // 弹簧弹回要 0.4 秒多
  b.check("sheet-touchcancel", await b.ev(`(() => { const s = document.querySelector("#sheet"); return !s.hidden && !s.classList.contains("dragging") && s.style.transform === ""; })()`));
  await F.closeSheet(b);
  await b.viewport(430, 932);


  // 删除词汇包后弹层关掉（放在长词检查之后，因为会删掉测试歌的词汇包）
  await b.ev(`document.querySelector("#btnMenu").click()`); await b.sleep(500);
  await b.ev(`document.querySelector('[data-menu="pack"]').click()`); await b.sleep(500);
  await b.ev(`document.querySelector("#rmPack").click()`); await b.sleep(300);
  b.check("pack-delete-asks", (await b.ev(F.sheetText)).includes("删除词汇包？") && !!(await b.ev(F.idbGet("songs", "t1"))).pack);
  await b.ev(`document.querySelector('[data-confirm="ok"]').click()`); await b.sleep(700);
  b.check("pack-delete-closes-sheet", await b.ev(`document.querySelector("#sheet").hidden`) && (await b.ev(F.idbGet("songs", "t1"))).pack === null && b.errors.length === 0);

  // 连点两下返回 → 回到首页，不离开 App
  // 无界面 Chrome 对连续返回有自己的保护，复现不了真机离开网站的情况，所以直接数 App 调用了几次 history.back()
  await b.ev(`(() => { const ob = history.back.bind(history); window.__backs = 0; history.back = () => { window.__backs++; ob(); }; })()`);
  await b.ev(`(async () => { const x = document.querySelector("#playerView [data-back]"); x.click(); await new Promise(r => setTimeout(r, 120)); x.click(); })()`); await b.sleep(900);
  b.check("double-back-stays-in-app backs=" + (await b.ev("window.__backs")), (await b.ev("window.__backs")) === 1 && await b.ev(visible("home")));
  b.check("review: 页面没有报错", b.errors.length === 0);
} };
