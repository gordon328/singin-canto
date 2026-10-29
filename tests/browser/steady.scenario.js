// 「＋ 导入新歌」和导入页「保存」常驻（2026-10-29 开发者要求）：不在页面里跟着滑动、切页时不隐藏也不淡入，到了那一页就直接在
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
// 按钮此刻是否稳稳地显示在屏幕底部：没隐藏、不透明、没有弹出动画、不在会滑动的页面里、在屏幕内
const steady = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}), r = e.getBoundingClientRect();
  return !e.hidden && r.height > 0 && getComputedStyle(e).opacity === "1" && !e.classList.contains("bar-in") && !e.closest("section")
    && r.bottom <= innerHeight && r.top > innerHeight / 2; })()`;
const gone = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e.hidden || e.getBoundingClientRect().height === 0; })()`;
module.exports = { name: "steady", async run(b) {
  await F.seed(b);
  b.check("fab-steady-home", await b.ev(steady("#btnAdd")));
  await b.ev(click("#btnSettings")); await b.sleep(280);
  b.check("fab-gone-when-leaving", await b.ev(gone("#btnAdd")));
  await b.sleep(800);
  await b.ev(click("#settingsView [data-back]")); await b.sleep(320); // 返回动画进行中
  b.check("fab-steady-during-back", await b.ev(steady("#btnAdd")));
  await b.sleep(800);

  await b.ev(click("#btnAdd")); await b.sleep(320); // 进入导入页的动画进行中
  b.check("save-steady-during-enter", await b.ev(steady("#btnSave")) && await b.ev(gone("#btnAdd")));
  await b.sleep(800);
  b.check("save-steady", await b.ev(steady("#btnSave")));
  await b.ev(`window.scrollTo(0, 99999)`); await b.sleep(200);
  b.check("save-steady-scrolled", await b.ev(steady("#btnSave")));
  await b.ev(click("#importView [data-back]")); await b.sleep(280);
  b.check("save-gone-when-leaving", await b.ev(gone("#btnSave")));
  await b.sleep(800);
  b.check("fab-back-home", await b.ev(steady("#btnAdd")) && await b.ev(gone("#btnSave")));

  // 多选模式下「＋ 导入新歌」换成「删除」
  await b.ev(click("#btnSelect")); await b.sleep(200);
  b.check("fab-hidden-select", await b.ev(gone("#btnAdd")));
  await b.ev(click("#btnDone")); await b.sleep(200);
  b.check("fab-after-select", await b.ev(steady("#btnAdd")));
  b.check("no-errors", b.errors.length === 0);
} };
