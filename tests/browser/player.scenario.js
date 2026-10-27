// 播放页：不透明顶栏、当前句卡片、波浪下划线、倍速、粤拼开关、更多菜单、最后一句不被挡
const F = require("./fixtures.js");
module.exports = { name: "player", async run(b) {
  await F.seed(b);
  await F.openSong(b, "t1");
  const bar = await b.ev(`(() => { const s = getComputedStyle(document.querySelector("#playerView .bar")); return { bf: s.backdropFilter, bg: s.backgroundColor }; })()`);
  b.check("bar-opaque " + JSON.stringify(bar), (bar.bf === "none" || !bar.bf) && /^rgb\(/.test(bar.bg));
  await b.ev(`document.querySelector('[data-play="2"]').click()`); await b.sleep(500);
  const cur = await b.ev(`(() => { const l = document.querySelector('.line[data-li="2"]'); return { cur: l.classList.contains("cur"),
    sh: getComputedStyle(l).boxShadow, fs: getComputedStyle(l.querySelector(".c .hz")).fontSize,
    op0: getComputedStyle(document.querySelector('.line[data-li="0"]')).opacity }; })()`);
  b.check("current-line-style " + JSON.stringify(cur), cur.cur && cur.sh !== "none" && cur.fs === "26px" && cur.op0 === "0.6");
  b.check("key-wavy", (await b.ev(`getComputedStyle(document.querySelector(".c.key .hz")).textDecorationStyle`)) === "wavy");
  const rates = [];
  for (let i = 0; i < 3; i++) { await b.ev(`document.querySelector("#bRate").click()`); rates.push(await b.ev(`[document.querySelector("#au").playbackRate, document.querySelector("#bRate").innerText.trim()]`)); }
  b.check("rate-cycle " + JSON.stringify(rates), JSON.stringify(rates) === JSON.stringify([[0.8, "0.8×"], [0.6, "0.6×"], [1, "1×"]]));
  await b.ev(`document.querySelector("#togJp").click()`);
  b.check("jp-toggle", (await b.ev(`document.querySelector("#togJp").innerText.trim()`)) === "粤拼 关" && await b.ev(`document.querySelector("#lyrics").classList.contains("hide-jp")`));
  await b.ev(`document.querySelector("#togJp").click()`);
  await b.ev(`window.scrollTo(0, document.scrollingElement.scrollHeight)`); await b.sleep(400);
  b.check("last-line-visible", await b.ev(`[...document.querySelectorAll("#lyrics .line")].pop().getBoundingClientRect().bottom < document.querySelector("#playerView .player").getBoundingClientRect().top`));
  await b.ev(`window.scrollTo(0, 0)`); await b.sleep(300);
  await b.shot("player-light"); await b.dark(true); await b.sleep(300); await b.shot("player-dark"); await b.dark(false);
  await b.ev(`document.querySelector("#btnMenu").click()`); await b.sleep(500);
  const menu = await b.ev(`document.querySelector("#songMenu").innerText`);
  b.check("menu-items", menu.includes("编辑歌曲") && menu.includes("词汇包") && menu.includes("删除"));
  const danger = await b.ev(`(() => { const d = document.createElement("div"); d.style.color = "var(--danger)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })()`);
  b.check("menu-delete-red", (await b.ev(`getComputedStyle(document.querySelector('[data-menu="del"]')).color`)) === danger);
  await b.ev(`document.querySelector('[data-menu="del"]').click()`); await b.sleep(300);
  const ask = await b.ev(F.sheetText);
  const okBg = await b.ev(`getComputedStyle(document.querySelector('[data-confirm="ok"]')).backgroundColor`);
  b.check("menu-delete-asks " + JSON.stringify(ask), ask.includes("删除这首歌？") && ask.includes("学过的词会保留在复习里") && ask.includes("删除") && ask.includes("取消") && okBg === danger);
  await b.ev(`document.querySelector('[data-confirm="cancel"]').click()`); await b.sleep(500);
  b.check("menu-delete-cancel", await b.ev(`document.querySelector("#sheet").hidden && !document.querySelector("#playerView").hidden`) && !!(await b.ev(F.idbGet("songs", "t1"))));
  await b.ev(`document.querySelector("#btnMenu").click()`); await b.sleep(500);
  await b.ev(`document.querySelector('[data-menu="del"]').click()`); await b.sleep(300);
  await b.ev(`document.querySelector('[data-confirm="ok"]').click()`); await b.sleep(900);
  b.check("menu-delete-confirm", await b.ev(`!document.querySelector("#home").hidden && !document.querySelector('.song[data-id="t1"]')`));
  await F.openSong(b, "t2");
  b.check("no-horizontal-overflow (40 字歌名)", await b.ev(`document.scrollingElement.scrollWidth <= innerWidth`));
  b.check("player: 页面没有报错", b.errors.length === 0);
} };
