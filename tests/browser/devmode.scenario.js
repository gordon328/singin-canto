// 开发者模式（v0.35，开发规格 7.10.5）：用开发者兑换码打开；设置页最下面「开发者模式」；调试面板开关、模拟日期、
// 解锁全部皮肤 / 恢复按条件解锁、重置今日打卡、清空休息卡（都要确认）、关闭开发者模式。连点 3 下版本号只在开发者模式下有效
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const sheet = `(() => { const s = document.querySelector("#sheet"); return s.hidden ? "" : document.querySelector("#sheetBody").innerText.replace(/\\s+/g, " "); })()`;
const meta = k => F.idbGet("meta", k);
const tapVer = `(async () => { for (let i = 0; i < 3; i++) { document.querySelector("#appVer").click(); await new Promise(r => setTimeout(r, 80)); } })()`;
const day = n => `(() => { const d = new Date(Date.now() - 4 * 3600e3 + ${n} * 86400e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })()`;
const setCheckin = o => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
  st.get("checkin").onsuccess = e => { st.put({ ...e.target.result, ...(${o}) }).onsuccess = () => { db.close(); res(); }; }; }; })`;
const rows = `[...document.querySelectorAll("#devView .cell .cell-n")].map(e => e.innerText).join()`;
const cell = t => `[...document.querySelectorAll("#devView .cell")].find(e => e.innerText.includes(${JSON.stringify(t)}))`;
async function confirm(b, ok = true) { await b.sleep(400); await b.ev(`document.querySelector('#sheetBody [data-confirm="${ok ? "ok" : "cancel"}"]').click()`); await b.sleep(600); }
async function openDev(b) { await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800); await b.ev(click("#devRow")); await b.sleep(900); }
async function enterCode(b, code) {
  await b.ev(click("#btnRedeem")); await b.sleep(900);
  await b.ev(`(() => { const i = document.querySelector("#rdIn"); i.value = ${JSON.stringify(code)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev(click("#rdGo")); await b.sleep(1300); // 成功后回到设置页
}

module.exports = { name: "devmode", async run(b) {
  await F.seed(b);
  // 普通模式：连点 3 下版本号没反应；localStorage 里的调试开关也不算；设置页没有开发者模式
  await b.ev(tapVer); await b.sleep(300);
  b.check("tap-version-ignored", !(await b.ev(visible("#dbgFab"))) && (await b.ev(`localStorage.getItem("yc-debug")`)) !== "1");
  await b.ev(`localStorage.setItem("yc-debug", "1")`); await b.nav("/");
  b.check("debug-flag-ignored-without-dev", !(await b.ev(visible("#dbgFab"))));
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("no-dev-group", !(await b.ev(`!!document.querySelector("#devRow")`)));

  // 用开发者兑换码打开
  await b.ev(F.addTestCode("TEST-DEVM-2345-ABCD", ["dev"]));
  await enterCode(b, "test-devm-2345-abcd");
  const t = await b.ev(`document.querySelector("#toast").innerText`);
  b.check("dev-on-toast " + t, t.includes("开发者模式已开启") && (await b.ev(meta("devMode")))?.on === true && (await b.ev(sheet)) === "");
  b.check("dev-group-last", await b.ev(visible("#devRow")) && (await b.ev(`[...document.querySelectorAll("#settingsView .sgrp-t")].map(e => e.innerText).pop()`)) === "开发者");
  await b.shot("devmode-settings");

  // 开发者页面
  await b.ev(click("#devRow")); await b.sleep(900);
  b.check("dev-page " + (await b.ev(rows)), await b.ev(visible("#devView")) && (await b.ev("history.state.view")) === "devView"
    && (await b.ev(rows)) === "调试面板,解锁全部皮肤,恢复按条件解锁,重置今日打卡,清空休息卡,关闭开发者模式");
  b.check("dev-sim-controls", await b.ev(`["minus", "plus", "reset"].every(k => !!document.querySelector('#devView [data-sim="' + k + '"]')) && !!document.querySelector("#devView .sim-date")`));
  b.check("dev-44px", await b.ev(`[...document.querySelectorAll("#devView .cell, #devView .btn, #devView input")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  b.check("dev-no-overflow", await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot("devmode-page-light"); await b.dark(true); await b.sleep(200); await b.shot("devmode-page-dark"); await b.dark(false);

  // 调试面板开关（就是连点版本号打开的那个）
  await b.ev(click("#devDebug")); await b.sleep(300);
  b.check("debug-switch-on", await b.ev(visible("#dbgFab")) && (await b.ev(`document.querySelector("#devDebug").getAttribute("aria-checked")`)) === "true");
  await b.ev(click("#devDebug")); await b.sleep(300);
  b.check("debug-switch-off", !(await b.ev(visible("#dbgFab"))));
  // 开发者模式下连点版本号有效
  await b.nav("/"); await b.ev(tapVer); await b.sleep(300);
  b.check("tap-version-works-in-dev", await b.ev(visible("#dbgFab")));
  await b.ev(tapVer); await b.sleep(300);

  // 模拟日期（开发者页面里也能调）
  await openDev(b);
  await b.ev(`document.querySelector('#devView [data-sim="plus"]').click()`); await b.sleep(400);
  b.check("sim-plus " + (await b.ev(`localStorage.getItem("yc-simdays")`)), (await b.ev(`localStorage.getItem("yc-simdays")`)) === "1"
    && (await b.ev(`document.querySelector("#devView .sim-lbl").innerText`)).includes("+1 天"));
  await b.ev(`document.querySelector('#devView [data-sim="reset"]').click()`); await b.sleep(400);
  b.check("sim-reset", (await b.ev(`localStorage.getItem("yc-simdays")`)) === null);

  // 解锁全部皮肤（要确认；取消不做）
  await b.ev(`${cell("解锁全部皮肤")}.click()`); await confirm(b, false);
  b.check("unlock-all-cancel", (await b.ev(meta("checkin"))).unlocked.length === 1);
  await b.ev(`${cell("解锁全部皮肤")}.click()`); await confirm(b);
  let c = await b.ev(meta("checkin"));
  b.check("unlock-all", ["lilac", "night", "mist"].every(id => c.unlocked.includes(id)) && c.unlockedInfo.night.by === "dev" && (c.unseen || []).length === 0);
  // 恢复按条件解锁：不满足条件的锁上，兑换码解锁的留着；正在用的被锁上就换回丁香
  await b.ev(setCheckin(`({ unlocked: ["lilac", "night", "mist"], unlockedInfo: { lilac: { by: "default" }, night: { by: "dev" }, mist: { by: "code", at: "2026-10-31" } }, theme: "night" })`));
  await b.ev(`localStorage.setItem("yc-skin", "night")`); await openDev(b);
  await b.ev(`${cell("恢复按条件解锁")}.click()`); await confirm(b);
  c = await b.ev(meta("checkin"));
  b.check("relock " + JSON.stringify(c.unlocked), JSON.stringify(c.unlocked) === JSON.stringify(["lilac", "mist"]) && !c.unlockedInfo.night && c.theme === "lilac"
    && (await b.ev(`document.documentElement.dataset.skin`)) === "lilac");

  // 重置今日打卡、清空休息卡
  const d0 = await b.ev(day(0));
  await b.ev(setCheckin(`({ days: { ${JSON.stringify(d0)}: { type: "done" } }, restTokens: 2 })`)); await openDev(b);
  b.check("tokens-shown", (await b.ev(`${cell("清空休息卡")}.innerText`)).includes("2 张"));
  await b.ev(`${cell("重置今日打卡")}.click()`); await confirm(b);
  b.check("reset-today", !(await b.ev(meta("checkin"))).days[d0]);
  await b.ev(`${cell("清空休息卡")}.click()`); await confirm(b);
  b.check("clear-tokens", (await b.ev(meta("checkin"))).restTokens === 0);

  // 开发者模式不随备份导出
  await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800);
  const bk = JSON.parse(await b.ev(F.exportText));
  b.check("devmode-not-in-backup", !bk.meta.some(m => m.key === "devMode") && bk.meta.some(m => m.key === "redeemed"));

  // 关闭开发者模式：入口消失，调试面板关掉，模拟日期回到真实日期
  await openDev(b);
  await b.ev(click("#devDebug")); await b.sleep(200);
  await b.ev(`document.querySelector('#devView [data-sim="plus"]').click()`); await b.sleep(300);
  await b.ev(`${cell("关闭开发者模式")}.click()`); await confirm(b); await b.sleep(600);
  b.check("dev-off", (await b.ev(meta("devMode")))?.on === false && !(await b.ev(`!!document.querySelector("#devRow")`)) && !(await b.ev(visible("#dbgFab")))
    && (await b.ev(`localStorage.getItem("yc-simdays")`)) === null && (await b.ev("history.state.view")) !== "devView");
  await b.nav("/"); await b.ev(tapVer); await b.sleep(300);
  b.check("tap-ignored-again", !(await b.ev(visible("#dbgFab"))));
  // 同一个开发者码能再打开
  await b.ev(F.addTestCode("TEST-DEVM-2345-ABCD", ["dev"]));
  await b.ev(click("#btnSettings")); await b.sleep(800);
  await enterCode(b, "TEST-DEVM-2345-ABCD");
  b.check("dev-code-reusable", (await b.ev(meta("devMode")))?.on === true);
  b.check("no-errors", b.errors.length === 0);
} };
