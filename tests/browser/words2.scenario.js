// 我的生词：筛选标签（带数量）、搜索（汉字/粤拼/意思）、多选（全选只选当前筛选结果）、批量标为认识/取消认识/删除 + 5 秒撤销
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
const putCards = cs => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("cards", "readwrite"); const st = tx.objectStore("cards");
  ${JSON.stringify(cs)}.forEach(c => st.put(c)); tx.oncomplete = () => { db.close(); res(); }; }; })`;
const mk = (w, jp, zh, due, known = false) => ({ w, jp, zh, tip: "", oral: false, sources: [], known, created: 1, updated: 1, srs: { due, interval: 5, ease: 2.5, reps: 3, lapses: 0 } });
const words = `[...document.querySelectorAll("#wordsList .wrow")].map(e => e.dataset.w).join()`;
const tabs = `[...document.querySelectorAll("#wTabs .btn")].map(e => e.innerText.replace(/\\s+/g, "")).join("|")`;
const tabOn = `document.querySelector("#wTabs [aria-pressed=true]").dataset.tab`;
const toast = `(document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText)`;
const dis = k => `document.querySelector('#wAct [data-wact="${k}"]').disabled`;
const type = q => `(() => { const i = document.querySelector("#wQ"); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`;
const tap = w => click(`#wordsList [data-w="${w}"]`);
module.exports = { name: "words2", async run(b) {
  await F.seed(b);
  const now = Date.now(), D = 86400e3;
  await b.ev(putCards([mk("風褸", "fung1 lau1", "风衣", now - 1000), mk("知", "zi1", "知道", now + 3 * D), mk("街", "gaai1", "街道", now - 2 * D),
    mk("我", "ngo5", "我", now - 5000, true), mk("你", "nei5", "你", 0, true)]));
  await b.nav("/");
  await b.ev(click("#btnSettings")); await b.sleep(800);
  await b.ev(click("#wordsCard [data-words]")); await b.sleep(800);

  b.check("tabs " + (await b.ev(tabs)), (await b.ev(tabs)) === "全部5|学习中3|已认识2|今天到期2" && (await b.ev(tabOn)) === "all");
  b.check("search-visible", await b.ev(visible("#wQ")) && (await b.ev(`document.querySelector("#wQ").type`)) === "search"
    && (await b.ev(`getComputedStyle(document.querySelector("#wQ")).fontSize`)) === "16px");
  b.check("select-btn", await b.ev(visible("#wSelect")) && !(await b.ev(visible("#wDone"))) && !(await b.ev(visible("#wSelAll"))) && !(await b.ev(visible("#wAct"))));
  b.check("no-hscroll", await b.ev(`document.documentElement.scrollWidth <= innerWidth`));

  // 筛选
  await b.ev(click('#wTabs [data-tab="learning"]')); await b.sleep(100);
  b.check("tab-learning " + (await b.ev(words)), (await b.ev(words)) === "街,風褸,知" && (await b.ev(tabOn)) === "learning");
  await b.ev(click('#wTabs [data-tab="known"]')); await b.sleep(100);
  b.check("tab-known " + (await b.ev(words)), (await b.ev(words)) === "你,我");
  await b.ev(click('#wTabs [data-tab="due"]')); await b.sleep(100);
  b.check("tab-due " + (await b.ev(words)), (await b.ev(words)) === "街,風褸");
  await b.ev(click('#wTabs [data-tab="all"]')); await b.sleep(100);

  // 搜索：汉字、粤拼（不打声调）、意思（简体）；数量跟着搜索走
  await b.ev(type("風")); await b.sleep(100);
  b.check("search-han", (await b.ev(words)) === "風褸" && (await b.ev(tabs)) === "全部1|学习中1|已认识0|今天到期1");
  await b.ev(type("lau")); await b.sleep(100);
  b.check("search-jp", (await b.ev(words)) === "風褸");
  await b.ev(type("nei5")); await b.sleep(100);
  b.check("search-jp-tone", (await b.ev(words)) === "你");
  await b.ev(type("街道")); await b.sleep(100);
  b.check("search-zh", (await b.ev(words)) === "街");
  await b.ev(type("雨")); await b.sleep(100);
  b.check("search-none", (await b.ev(words)) === "" && (await b.ev(`document.querySelector("#wordsList").innerText`)).includes("没有找到"));
  await b.ev(type("")); await b.sleep(100);
  b.check("search-clear", (await b.ev(words)).split(",").length === 5);

  // 选择模式
  await b.ev(click("#wSelect")); await b.sleep(150);
  b.check("select-mode", (await b.ev(`document.querySelectorAll("#wordsList .wrow .check").length`)) === 5 && await b.ev(visible("#wDone")) && await b.ev(visible("#wSelAll"))
    && !(await b.ev(visible("#wSelect"))) && !(await b.ev(visible("#wAct"))) && (await b.ev(`document.querySelector("#wDone").innerText.trim()`)) === "完成");
  b.check("buttons-44px", await b.ev(`[...document.querySelectorAll("#wordsView button")].filter(e => e.getBoundingClientRect().height > 0).every(e => e.getBoundingClientRect().height >= 44)`));
  await b.ev(tap("我")); await b.sleep(100);
  b.check("tap-selects", await b.ev(visible("#wAct")) && !(await b.ev(visible("#sheet"))) && (await b.ev(`document.querySelectorAll("#wordsList .wrow.selected").length`)) === 1
    && (await b.ev(`document.querySelector("#wordsSub").innerText`)) === "已选 1 个");
  b.check("only-known-selected", (await b.ev(dis("known"))) === true && (await b.ev(dis("unknown"))) === false && (await b.ev(dis("del"))) === false);
  await b.ev(tap("知")); await b.sleep(100);
  b.check("mixed-selected", (await b.ev(dis("known"))) === false && (await b.ev(dis("unknown"))) === false);
  await b.ev(tap("我")); await b.sleep(100);
  b.check("only-learning-selected", (await b.ev(dis("known"))) === false && (await b.ev(dis("unknown"))) === true);
  await b.shot("words-select-light"); await b.dark(true); await b.sleep(300); await b.shot("words-select-dark"); await b.dark(false);

  // 全选只选当前筛选结果；换标签后看不到的自动取消
  await b.ev(click('#wTabs [data-tab="known"]')); await b.sleep(100);
  b.check("filter-prunes", (await b.ev(`document.querySelector("#wordsSub").innerText`)) === "已选 0 个" && !(await b.ev(visible("#wAct"))));
  await b.ev(click("#wSelAll")); await b.sleep(100);
  b.check("select-all-filtered", (await b.ev(`document.querySelector("#wordsSub").innerText`)) === "已选 2 个" && (await b.ev(`document.querySelector("#wSelAll").innerText.trim()`)) === "全不选");
  await b.ev(click("#wSelAll")); await b.sleep(100);
  b.check("select-none", (await b.ev(`document.querySelector("#wordsSub").innerText`)) === "已选 0 个");
  await b.ev(click("#wSelAll")); await b.sleep(100);

  // 取消认识：known=false，明天凌晨 4 点开始复习
  await b.ev(click('#wAct [data-wact="unknown"]')); await b.sleep(400);
  const ni = await b.ev(F.idbGet("cards", "你")), tmr4 = await b.ev(`SRS.newSrs(Date.now()).due`);
  b.check("unknown " + (await b.ev(toast)), ni.known === false && ni.srs.due === tmr4 && ni.srs.reps === 1 && ni.srs.interval === 1 && (await b.ev(F.idbGet("cards", "我"))).known === false
    && !(await b.ev(visible("#wDone"))) && (await b.ev(toast)).includes("已取消认识 2 个词"));
  b.check("unknown-tab-empty", (await b.ev(words)) === "" && (await b.ev(tabs)) === "全部5|学习中5|已认识0|今天到期2");

  // 标为认识
  await b.ev(click('#wTabs [data-tab="learning"]')); await b.sleep(100);
  await b.ev(click("#wSelect")); await b.sleep(100);
  await b.ev(tap("街")); await b.ev(tap("風褸")); await b.sleep(100);
  await b.ev(click('#wAct [data-wact="known"]')); await b.sleep(400);
  b.check("known", (await b.ev(F.idbGet("cards", "街"))).known === true && (await b.ev(F.idbGet("cards", "風褸"))).known === true && (await b.ev(tabs)) === "全部5|学习中3|已认识2|今天到期0");

  // 删除：确认窗 → 取消不删 → 确认后从列表拿掉，5 秒内可撤销
  const danger = await b.ev(`(() => { const d = document.createElement("div"); d.style.color = "var(--danger)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })()`);
  await b.ev(click('#wTabs [data-tab="all"]')); await b.ev(click("#wSelect")); await b.sleep(100);
  await b.ev(tap("街")); await b.ev(tap("知")); await b.sleep(100);
  b.check("del-red", (await b.ev(`getComputedStyle(document.querySelector('#wAct [data-wact="del"]')).backgroundColor`)) === danger);
  await b.ev(click('#wAct [data-wact="del"]')); await b.sleep(400);
  const ask = await b.ev(F.sheetText);
  b.check("confirm-text " + JSON.stringify(ask), ask.includes("删除 2 个词？") && ask.includes("删除后它们不会再出现在学习和复习里。"));
  await b.ev(click('[data-confirm="cancel"]')); await b.sleep(500);
  b.check("cancel-keeps", (await b.ev(words)).split(",").length === 5 && (await b.ev(`document.querySelector("#wordsSub").innerText`)) === "已选 2 个");
  await b.ev(click('#wAct [data-wact="del"]')); await b.sleep(400);
  await b.ev(click('[data-confirm="ok"]')); await b.sleep(500);
  b.check("deleted-shown " + (await b.ev(words)), (await b.ev(words)).split(",").sort().join() === ["風褸", "我", "你"].sort().join() && await b.ev(visible("#wSnack")) && (await b.ev(`document.querySelector("#wSnackMsg").innerText.trim()`)) === "已删除 2 个词"
    && !(await b.ev(visible("#wAct"))) && !(await b.ev(visible("#wDone"))) && !!(await b.ev(F.idbGet("cards", "街"))) && (await b.ev(tabs)).startsWith("全部3"));
  await b.ev(click("#wSnackUndo")); await b.sleep(300);
  b.check("undo", (await b.ev(words)).split(",").length === 5 && !(await b.ev(visible("#wSnack"))));

  await b.ev(click("#wSelect")); await b.ev(tap("街")); await b.ev(click('#wAct [data-wact="del"]')); await b.sleep(400);
  await b.ev(click('[data-confirm="ok"]')); await b.sleep(5600);
  b.check("committed-after-5s", !(await b.ev(F.idbGet("cards", "街"))) && !(await b.ev(visible("#wSnack"))));

  // 删除后马上返回设置页，也会真正删除
  await b.ev(click("#wSelect")); await b.ev(tap("知")); await b.ev(click('#wAct [data-wact="del"]')); await b.sleep(400);
  await b.ev(click('[data-confirm="ok"]')); await b.sleep(400);
  await b.ev("history.back()"); await b.sleep(900);
  b.check("committed-on-leave", !(await b.ev(F.idbGet("cards", "知"))) && (await b.ev(`document.querySelector("#wordsCard").innerText`)).includes("我的生词（3）"));
  // 重新进来：回到「全部」、搜索清空、不在选择模式
  await b.ev(click("#wordsCard [data-words]")); await b.sleep(800);
  b.check("fresh-entry", (await b.ev(tabOn)) === "all" && (await b.ev(`document.querySelector("#wQ").value`)) === "" && await b.ev(visible("#wSelect")) && !(await b.ev(visible("#wAct"))));
  b.check("no-errors", b.errors.length === 0);
} };
