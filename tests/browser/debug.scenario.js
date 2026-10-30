// 调试面板（M3.12；v0.32 起默认收起成小圆按钮，收起时照常记录）：连点 3 下首页版本号开关；回首页量按钮状态；最近 10 个触摸事件。回首页时首页按钮换成新元素，点击仍有效
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const tapVer = `(async () => { for (let i = 0; i < 3; i++) { document.querySelector("#appVer").click(); await new Promise(r => setTimeout(r, 80)); } })()`;
// 真的按下去（CDP 触摸），会触发 pointerdown/pointerup/touchend/click
async function tap(b, sel) {
  const r = await b.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; })()`);
  await b.touch("touchStart", r[0], r[1]); await b.sleep(60); await b.touch("touchEnd"); await b.sleep(100);
}
const dbgText = `document.querySelector("#dbg").innerText`;
module.exports = { name: "debug", async run(b) {
  await F.seed(b);
  b.check("version-shown", (await b.ev(`document.querySelector("#appVer").innerText`)) === "版本 v0.32");
  b.check("panel-off", await b.ev(`document.querySelector("#dbg").hidden`));

  await b.ev(tapVer); await b.sleep(100);
  b.check("panel-on", !(await b.ev(`document.querySelector("#dbg").hidden`)) && (await b.ev(dbgText)).includes("调试 v0.32"));

  const oldSettings = await b.ev(`(window.__old = document.querySelector("#btnSettings"), true)`);
  await tap(b, "#btnSettings"); await b.sleep(700);
  b.check("settings-opened", oldSettings && await b.ev(`!document.querySelector("#settingsView").hidden`));
  b.check("fab-on-other-pages", await b.ev(`!document.querySelector("#dbgWrap").hidden && document.querySelector("#dbgFab").getBoundingClientRect().width === 44 && document.querySelector("#dbgPanel").hidden`));
  await b.ev(click("#settingsView [data-back]")); await b.sleep(1300);
  const t = await b.ev(dbgText);
  b.check("panel-back-on-home", !(await b.ev(`document.querySelector("#dbg").hidden`)) && await b.ev(`document.querySelector("#dbgPanel").hidden`));
  b.check("panel-return-how", t.includes("返回方式：返回按钮") && t.includes("btnSettings"));
  // 第 0、≈100、≈500、≈1000ms 四行（定时器会晚几毫秒）
  b.check("panel-samples", (t.match(/\d+ms 新元素:是/g) || []).length === 4 && /\b1\d\dms/.test(t) && /\b5\d\dms/.test(t) && /\b10\d\dms/.test(t) && t.includes("is-pressed:否"));
  b.check("panel-event-owner", t.includes("∈ button#btnSettings") || t.includes("button#btnSettings"));
  b.check("panel-events", ["pointerdown", "pointerup", "touchend", "click"].every(x => t.includes(x)));
  b.check("buttons-replaced", await b.ev(`document.querySelector("#btnSettings") !== window.__old && !document.contains(window.__old)`));
  await b.shot("debug-panel");

  // 换成新元素后点击照样有效
  await b.ev(click("#btnSettings")); await b.sleep(700);
  b.check("new-settings-works", await b.ev(`!document.querySelector("#settingsView").hidden`));
  await b.ev("history.back()"); await b.sleep(800);
  b.check("swipe-how", (await b.ev(dbgText)).includes("返回方式：系统右滑/其他"));
  await b.ev(click("#btnAdd")); await b.sleep(700);
  b.check("new-add-works", await b.ev(`!document.querySelector("#importView").hidden`));
  await b.ev("history.back()"); await b.sleep(800);
  await b.ev(click("#btnToneNext")); await b.sleep(100);
  b.check("new-tone-next-works", await b.ev(`document.querySelector("#btnToneNext").classList.contains("spin")`));
  await b.ev(click("#btnSelect")); await b.sleep(100);
  b.check("new-select-works", await b.ev(`!document.querySelector("#btnDone").hidden`));
  await b.ev(click("#btnDone")); await b.sleep(100);

  // 回首页时焦点放掉
  await b.ev(click("#home .song")); await b.sleep(700);
  await b.ev(`document.querySelector("#playerView [data-back]").focus()`);
  await b.ev(click("#playerView [data-back]")); await b.sleep(900);
  b.check("blurred", await b.ev(`document.activeElement === document.body`));

  // 刷新后仍然打开；再连点 3 下关掉
  await b.send("Page.reload"); await b.sleep(2500);
  b.check("panel-persists", !(await b.ev(`document.querySelector("#dbg").hidden`)));
  await b.ev(tapVer); await b.sleep(100);
  b.check("panel-off-again", await b.ev(`document.querySelector("#dbg").hidden`));
  b.check("debug: 页面没有报错", b.errors.length === 0);
} };
