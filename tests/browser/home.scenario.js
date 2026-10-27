// 首页：声调键帽、歌曲卡片对齐、首字方块、浮动导入按钮
const F = require("./fixtures.js");
module.exports = { name: "home", async run(b) {
  await F.seed(b);
  const caps = await b.ev(`[...document.querySelectorAll("#tones .key")].map(k => ({ h: Math.round(k.getBoundingClientRect().height), t: k.innerText.replace(/\\s+/g, " ").trim() }))`);
  b.check("keycaps " + JSON.stringify(caps[0]), caps.length === 6 && caps.every(c => c.h === 66) && caps[0].t.includes("詩") && caps[0].t.includes("si1")
    && (await b.ev(`document.querySelector("#home").innerText`)).includes("六个声调 · si"));
  const cards = await b.ev(`[...document.querySelectorAll(".song")].map(s => { const r = s.getBoundingClientRect(); return [r.left, r.right]; })`);
  const W = await b.ev("innerWidth");
  b.check("song-cards-aligned " + JSON.stringify(cards) + " W=" + W, cards.length === 2 && cards.every(([l, r]) => Math.abs(l - 20) <= 1 && Math.abs(r - (W - 20)) <= 1));
  b.check("no-horizontal-overflow", await b.ev(`document.scrollingElement.scrollWidth <= innerWidth`));
  const sq = await b.ev(`[...document.querySelectorAll(".song .sq")].map(e => ({ t: e.innerText.trim(), bg: getComputedStyle(e).backgroundColor }))`);
  const titles = await b.ev(`[...document.querySelectorAll(".song .ttl")].map(e => e.innerText.trim())`);
  b.check("initial-square", sq.length === 2 && sq[0].t === titles[0][0] && sq[0].bg !== sq[1].bg);
  b.check("subtitle", (await b.ev(`document.querySelector('.song[data-id="t2"] .sub').innerText`)).includes("未导入词汇包")
    && (await b.ev(`document.querySelector('.song[data-id="t2"] .sub').innerText`)).includes("缺少音频"));
  const fab = await b.ev(`(() => { const e = document.querySelector("#btnAdd"); return { pos: getComputedStyle(e).position, h: Math.round(e.getBoundingClientRect().height) }; })()`);
  await b.ev(`window.scrollTo(0, document.scrollingElement.scrollHeight)`); await b.sleep(200);
  const clear = await b.ev(`[...document.querySelectorAll(".song")].pop().getBoundingClientRect().bottom < document.querySelector("#btnAdd").getBoundingClientRect().top`);
  b.check("fab " + JSON.stringify(fab), fab.pos === "fixed" && fab.h === 56 && clear);
  b.check("no-delete-on-home", await b.ev(`!document.querySelector("#home [data-del]")`));
  await b.ev(`window.scrollTo(0, 0)`);
  await b.shot("home-light"); await b.dark(true); await b.sleep(300); await b.shot("home-dark"); await b.dark(false);
  b.check("home: 页面没有报错", b.errors.length === 0);
} };
