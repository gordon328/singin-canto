// 设置页（M3.11）：首页右上角齿轮 → 整页滑入；每天新学几句（先只显示）+ 备份与恢复（不再用弹窗）
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
module.exports = { name: "settings", async run(b) {
  await F.seed(b);
  b.check("no-backup-button", !(await b.ev(`!!document.querySelector("#btnBackup")`)));
  b.check("gear-button", await b.ev(visible("#btnSettings")) && (await b.ev(`document.querySelector("#btnSettings").getAttribute("aria-label")`)) === "设置");

  const h0 = await b.ev("history.length");
  await b.ev(click("#btnSettings")); await b.sleep(100);
  b.check("slides-in", await b.ev(`document.querySelector("#settingsView").classList.contains("enter-fwd")`));
  await b.sleep(700);
  b.check("settings-page", await b.ev(visible("#settingsView")) && !(await b.ev(visible("#home"))) && (await b.ev("history.length")) === h0 + 1
    && (await b.ev(`history.state.view`)) === "settingsView" && await b.ev(`document.querySelector("#sheet").hidden`));
  const txt = await b.ev(`document.querySelector("#settingsView").innerText`);
  b.check("goal-section", txt.includes("每天新学几句") && (await b.ev(`[...document.querySelectorAll("#goalSeg button")].map(e => e.innerText.trim()).join()`)) === "2,4,6"
    && (await b.ev(`document.querySelector("#goalSeg [aria-pressed=true]").innerText.trim()`)) === "4");
  b.check("backup-section", txt.includes("备份与恢复") && txt.includes("2 首歌") && await b.ev(`!!document.querySelector("#settingsView #cpBk") && !!document.querySelector("#settingsView #bkIn") && !!document.querySelector("#settingsView #doRestore")`));
  b.check("settings-44px", await b.ev(`[...document.querySelectorAll("#settingsView button")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  await b.shot("settings-light");

  // 恢复备份照常工作
  const text = await b.ev(`document.querySelector("#bkOut").value`);
  await b.ev(`document.querySelector("#bkIn").value = document.querySelector("#bkOut").value`);
  await b.ev(click("#doRestore")); await b.sleep(900);
  b.check("restore-works " + text.length, (await b.ev(`document.querySelector("#bkMsg").innerText`)).includes("已恢复 2 首歌"));

  // 返回按钮回首页；系统右滑（history.back）也回首页
  await b.ev(click("#settingsView [data-back]")); await b.sleep(900);
  b.check("back-button-home", await b.ev(visible("#home")) && !(await b.ev(visible("#settingsView"))));
  await b.ev(click("#btnSettings")); await b.sleep(800);
  await b.ev("history.back()"); await b.sleep(800);
  b.check("swipe-back-home", await b.ev(visible("#home")) && !(await b.ev(visible("#settingsView"))));
  // 多选模式下齿轮隐藏
  await b.ev(click("#btnSelect")); await b.sleep(200);
  b.check("gear-hidden-in-select", !(await b.ev(visible("#btnSettings"))));
  await b.ev(click("#btnDone")); await b.sleep(200);
  b.check("settings: 页面没有报错", b.errors.length === 0);
} };
