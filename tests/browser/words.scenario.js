// M5：我的生词（规格 6.3）——设置页入口、列表、听、标记已认识、删除
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
const putCards = cs => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("cards", "readwrite"); const st = tx.objectStore("cards");
  ${JSON.stringify(cs)}.forEach(c => st.put(c)); tx.oncomplete = () => { db.close(); res(); }; }; })`;
const mk = (w, jp, zh, due, known = false) => ({ w, jp, zh, tip: "", oral: false, sources: [], known, created: 1, updated: 1, srs: { due, interval: 1, ease: 2.5, reps: 1, lapses: 0 } });
const RECORD = `window.__said = []; speechSynthesis.speak = u => window.__said.push([u.text, Math.round(u.rate * 100) / 100]); speechSynthesis.cancel = () => {};`;
const rows = `[...document.querySelectorAll("#wordsList .wrow")].map(e => e.innerText.replace(/\\s+/g, " ").trim())`;
const sheet = `document.querySelector("#sheet").hidden ? "" : document.querySelector("#sheetBody").innerText`;
module.exports = { name: "words", async run(b) {
  await F.seed(b);
  const now = Date.now();
  await b.ev(putCards([mk("知", "zi1", "知道", now + 3 * 86400e3), mk("風褸", "fung1 lau1", "风衣", now - 1000), mk("我", "ngo5", "我", now - 5000, true)]));
  await b.nav("/");
  await b.ev(RECORD);
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("entry", (await b.ev(`document.querySelector("#wordsCard").innerText`)).includes("我的生词（3）"));
  await b.ev(click("#wordsCard [data-words]")); await b.sleep(800);
  b.check("enter", await b.ev(visible("#wordsView")) && (await b.ev("history.state.view")) === "wordsView");
  const r = await b.ev(rows);
  b.check("list", r.length === 3 && r[0].includes("風褸") && r[0].includes("fung1 lau1") && r[0].includes("风衣") && r[0].includes("今天复习")
    && r[1].includes("知") && r[1].includes("3 天后复习") && r[2].includes("我") && r[2].includes("已认识")
    && await b.ev(`!!document.querySelector("#wordsList .wrow .jp .t1")`));
  b.check("buttons-44px", await b.ev(`[...document.querySelectorAll("#wordsView button")].every(e => e.getBoundingClientRect().height >= 44)`));
  await b.shot("words-light"); await b.dark(true); await b.sleep(300); await b.shot("words-dark"); await b.dark(false);

  await b.ev(click('#wordsList [data-w="知"]')); await b.sleep(500);
  let s = await b.ev(sheet);
  b.check("sheet", s.includes("知") && s.includes("zi1") && s.includes("知道") && s.includes("标记为已认识") && s.includes("删除"));
  await b.ev(click('#sheetBody [data-say]')); await b.sleep(100);
  b.check("say", JSON.stringify((await b.ev("window.__said")).slice(-1)) === JSON.stringify([["知", 0.8]]));
  await b.ev(click('#sheetBody [data-known]')); await b.sleep(400);
  b.check("mark-known", (await b.ev(F.idbGet("cards", "知"))).known === true && (await b.ev(sheet)).includes("取消已认识")
    && (await b.ev(rows)).find(x => x.includes("知")).includes("已认识"));
  await b.ev(click('#sheetBody [data-known]')); await b.sleep(400);
  b.check("unmark-known", (await b.ev(F.idbGet("cards", "知"))).known === false && (await b.ev(rows)).find(x => x.includes("知")).includes("3 天后复习"));
  // 删除 → 取消：回到这个词的弹窗，不是整个关掉
  await b.ev(click('#sheetBody [data-del]')); await b.sleep(500);
  await b.ev(click('#sheetBody [data-confirm="cancel"]')); await b.sleep(600);
  b.check("delete-cancel-back", (await b.ev(sheet)).includes("标记为已认识") && !!(await b.ev(F.idbGet("cards", "知"))));
  await b.ev(click('#sheetBody [data-del]')); await b.sleep(500);
  b.check("delete-confirm", (await b.ev(sheet)).includes("删除"));
  await b.ev(click('#sheetBody [data-confirm="ok"]')); await b.sleep(600);
  b.check("delete", !(await b.ev(F.idbGet("cards", "知"))) && (await b.ev(rows)).length === 2 && (await b.ev(`document.querySelector("#sheet").hidden`)));

  await b.ev(click("#wordsView [data-back]")); await b.sleep(900);
  b.check("back", await b.ev(visible("#settingsView")) && (await b.ev(`document.querySelector("#wordsCard").innerText`)).includes("我的生词（2）"));
  await b.ev(click("#wordsCard [data-words]")); await b.sleep(800);
  await b.ev("history.back()"); await b.sleep(900);
  b.check("swipe-back", await b.ev(visible("#settingsView")));

  // 从备份恢复的卡可能没有 known 字段：排序不能乱（要复习的在前，已认识的在后）
  const noKnown = { ...mk("早", "zou2", "早", Date.now() + 86400e3) }; delete noKnown.known;
  await b.ev(putCards([noKnown]));
  await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800); await b.ev(click("#wordsCard [data-words]")); await b.sleep(800);
  const r2 = await b.ev(rows);
  b.check("sort-missing-known", r2.length === 3 && r2[0].includes("風褸") && r2[1].includes("早") && r2[2].includes("已认识"));

  // 没有生词
  await b.nav("/__blank"); await b.ev(F.WIPE); await b.ev(F.SEED_V1); await b.nav("/");
  await b.ev(click("#btnSettings")); await b.sleep(800);
  await b.ev(click("#wordsCard [data-words]")); await b.sleep(800);
  b.check("empty", (await b.ev(`document.querySelector("#wordsView").innerText`)).includes("还没有生词"));
  b.check("no-errors", b.errors.length === 0);
} };
