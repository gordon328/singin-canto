// 浮动播放条：页面滑入后从下方滑入并淡入；返回时先往下滑出；减弱动态效果时只淡入淡出
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const anim = sel => `[...document.querySelector(${JSON.stringify(sel)}).getAnimations()].map(a => a.animationName).join()`;
const op = sel => `+getComputedStyle(document.querySelector(${JSON.stringify(sel)})).opacity`;
module.exports = { name: "playerbar", async run(b) {
  await F.seed(b);
  await b.ev(click('.song[data-id="t1"]')); await b.sleep(150);
  b.check("hidden-while-sliding", (await b.ev(op("#playerView .player"))) === 0);
  await b.sleep(330);
  b.check("bar-in " + (await b.ev(anim("#playerView .player"))), (await b.ev(anim("#playerView .player"))) === "barIn");
  await b.sleep(500);
  b.check("bar-shown " + (await b.ev(op("#playerView .player"))) + " " + (await b.ev(`getComputedStyle(document.querySelector("#playerView .player")).transform`)), (await b.ev(op("#playerView .player"))) === 1 && ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(await b.ev(`getComputedStyle(document.querySelector("#playerView .player")).transform`)));
  // 编辑歌曲页的播放控制也一样
  await b.ev(click("#btnMenu")); await b.sleep(500); await b.ev(click('[data-menu="proof"]')); await b.sleep(480);
  b.check("edit-bar-in " + (await b.ev(anim("#proofView .player"))), (await b.ev(anim("#proofView .player"))) === "barIn");
  await b.sleep(500);
  await b.ev(click("#proofView [data-back]")); await b.sleep(60);
  b.check("edit-bar-out-first " + (await b.ev(anim("#proofView .player"))), (await b.ev(anim("#proofView .player"))) === "barOut" && await b.ev(`!document.querySelector("#proofView").hidden`));
  await b.sleep(1200);
  await b.ev(click("#playerView [data-back]")); await b.sleep(60);
  b.check("bar-out-first", (await b.ev(anim("#playerView .player"))) === "barOut" && await b.ev(`!document.querySelector("#playerView").hidden`));
  await b.sleep(900);
  b.check("back-home", await b.ev(`!document.querySelector("#home").hidden`));
  await b.reducedMotion(true);
  await b.ev(click('.song[data-id="t1"]')); await b.sleep(120);
  b.check("reduced-motion-fade " + (await b.ev(anim("#playerView .player"))), (await b.ev(anim("#playerView .player"))) === "barFade");
  await b.ev(click("#playerView [data-back]")); await b.sleep(60);
  b.check("reduced-motion-fade-out " + (await b.ev(anim("#playerView .player"))), (await b.ev(anim("#playerView .player"))) === "barFadeOut");
  await b.sleep(900);
  b.check("playerbar: 页面没有报错", b.errors.length === 0);
} };
