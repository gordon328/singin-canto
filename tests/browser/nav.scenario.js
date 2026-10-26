// 页面切换和返回：历史记录、返回按钮、返回时停歌和关弹层、导入链、刷新回首页、主屏幕右滑
const F = require("./fixtures.js");
const visible = id => `!document.querySelector("#${id}").hidden`;
async function swipe(b, x0, x1) {
  await b.touch("touchStart", x0, 400);
  for (let i = 1; i <= 6; i++) { await b.touch("touchMove", x0 + (x1 - x0) * i / 6, 400 + i); await b.sleep(16); }
  await b.touch("touchEnd"); await b.sleep(700);
}
module.exports = { name: "nav", async run(b) {
  await F.seed(b);
  const n0 = await b.ev("history.length");
  await F.openSong(b, "t1");
  b.check("push-on-open", (await b.ev("history.length")) === n0 + 1 && (await b.ev("history.state && history.state.view")) === "playerView");
  await b.ev(`document.querySelector("#playerView [data-back]").click()`); await b.sleep(600);
  b.check("back-button", await b.ev(visible("home")) && !(await b.ev(visible("playerView"))));

  await F.openSong(b, "t1");
  await b.ev(`(async () => { const au = document.querySelector("#au"); au.src = URL.createObjectURL(${F.silentWav(5)}); await au.play(); })()`); await b.sleep(300);
  const playing = await b.ev(`!document.querySelector("#au").paused`);
  await b.ev("history.back()"); await b.sleep(600);
  b.check("back-pauses-audio", playing && await b.ev(`document.querySelector("#au").paused`) && await b.ev(visible("home")));

  await F.openSong(b, "t1");
  await b.ev(F.tapChar(0, 0)); await b.sleep(500);
  await b.ev("history.back()"); await b.sleep(700);
  b.check("back-closes-sheet", await b.ev(`document.querySelector("#sheet").hidden && document.querySelector("#backdrop").hidden`) && await b.ev(visible("home")));

  const n1 = await b.ev("history.length");
  await b.ev(`document.querySelector("#btnAdd").click()`); await b.sleep(500);
  const nImport = await b.ev("history.length");
  await b.ev(`(() => { const dt = new DataTransfer(); dt.items.add(${F.silentWav(5)}); const i = document.querySelector("#fAudio"); i.files = dt.files; i.dispatchEvent(new Event("change")); })()`);
  await b.ev(`(() => { const t = document.querySelector("#fLyrics"); t.value = "第一句\\n第二句"; t.dispatchEvent(new Event("input")); })()`); await b.sleep(800);
  await b.ev(`document.querySelector("#btnSave").click()`); await b.sleep(700);
  const inSync = await b.ev(visible("syncView"));
  const nSync = await b.ev("history.length");
  await b.ev("history.back()"); await b.sleep(700);
  // history.length 会把"前进"方向的记录也算进去，所以只比较导入页 → 打轴页没有增加，并且返回直接回到首页
  b.check(`chain-replace ${n1}/${nImport}/${nSync}`, inSync && nSync === nImport && await b.ev(visible("home")));

  await F.openSong(b, "t1");
  await b.send("Page.reload"); await b.sleep(2500);
  b.check("reload-starts-home", await b.ev(visible("home")) && !(await b.ev(visible("playerView"))));

  // 主屏幕模式：也只用系统右滑，App 从边缘拖时不接管
  await b.ev(`Object.defineProperty(navigator, "standalone", { value: true, configurable: true })`);
  await F.openSong(b, "t1");
  await swipe(b, 5, 260);
  b.check("standalone-no-app-swipe", await b.ev(visible("playerView")) && !(await b.ev(`!!document.querySelector(".nav-layer, .swipe-shade")`)));
  await b.media("display-mode", null);
  b.check("nav: 页面没有报错", b.errors.length === 0);
} };
