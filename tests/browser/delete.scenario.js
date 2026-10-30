// 首页多选删除歌曲 + 5 秒内撤销；删除歌曲时生词卡片保留，只去掉这首歌的出处
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
const HOME_POS = [".home-head", "#homeDate", "#tones", "#songs", ".song", ".song .sq", "#appVer", ".sec-title:has(#btnSelect)"];
// 记录主要元素的位置（进入/退出选择模式前后对比，除了勾选框其他都不能动）
const pos = sels => `(() => { const o = {}; for (const s of ${JSON.stringify(sels)}) { const e = document.querySelector(s); const r = e.getBoundingClientRect(); o[s] = [r.left, r.top, r.width, r.height].map(Math.round).join(); } return o; })()`;
const moved = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
const toast = `(document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText)`;
const songIds = `[...document.querySelectorAll("#songs .song")].map(e => e.dataset.id).sort().join()`;
const putSong = (id, title) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("songs", "readwrite");
  tx.objectStore("songs").put({ id: ${JSON.stringify(id)}, title: ${JSON.stringify(title)}, artist: "", audio: null, audioName: "", duration: 0, lines: [{ t: 1, end: 4, text: "短句一" }], pack: null, overrides: {}, created: 1, updated: 1 });
  tx.oncomplete = () => { db.close(); res(); }; }; })`;
async function selectAndDelete(b, ids) {
  await b.ev(click("#btnSelect")); await b.sleep(200);
  for (const id of ids) { await b.ev(click(`.song[data-id="${id}"]`)); await b.sleep(80); }
  await b.ev(click("#btnDelSel")); await b.sleep(300);
  await b.ev(click('[data-confirm="ok"]')); await b.sleep(500);
}
module.exports = { name: "delete", async run(b) {
  await b.nav("/__blank"); await b.ev(F.SEED_V1); await b.nav("/");
  await b.ev(putSong("t3", "第三首"));
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("cards", "readwrite");
    tx.objectStore("cards").put({ w: "佢", jp: "keoi5", zh: "他", tip: "", oral: true, sources: [{ songId: "t1", li: 5 }, { songId: "t2", li: 1 }, { songId: "t3", li: 0 }], known: false,
      srs: { due: 0, interval: 1, ease: 2.5, reps: 1, lapses: 0 }, created: 1, updated: 1 });
    tx.oncomplete = () => { db.close(); res(); }; }; })`);
  await b.nav("/");
  const danger = await b.ev(`(() => { const d = document.createElement("div"); d.style.color = "var(--danger)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })()`);

  b.check("select-button", (await b.ev(`document.querySelector("#btnSelect").innerText.trim()`)) === "选择" && await b.ev(visible("#btnSelect")));
  const p0 = await b.ev(pos(HOME_POS)), w0 = await b.ev(`document.querySelector("#btnSelect").getBoundingClientRect().width`);
  await b.ev(click("#btnSelect")); await b.sleep(200);
  const p1 = await b.ev(pos(HOME_POS)), w1 = await b.ev(`document.querySelector("#btnDone").getBoundingClientRect().width`);
  b.check("select-nothing-moves " + JSON.stringify(moved(p0, p1)), moved(p0, p1).length === 0 && w0 === 60 && w1 === 60);
  b.check("select-mode " + (await b.ev(`document.querySelector("#btnDelSel").innerText`)),
    (await b.ev(`document.querySelectorAll("#songs .song .check").length`)) === 3 && (await b.ev(`document.querySelector("#btnDelSel").innerText.trim()`)) === "删除（0）"
    && (await b.ev(`getComputedStyle(document.querySelector("#btnDelSel")).backgroundColor`)) === danger
    && await b.ev(visible("#btnDone")) && !(await b.ev(visible("#btnSettings"))) && !(await b.ev(visible("#btnAdd"))) && !(await b.ev(visible("#btnSelect"))));
  await b.shot("select-light"); await b.dark(true); await b.sleep(300); await b.shot("select-dark"); await b.dark(false);
  await b.ev(click("#btnDelSel")); await b.sleep(150);
  b.check("delete-none " + (await b.ev(toast)), (await b.ev(toast)) === "先点歌曲选择要删除的歌");
  await b.ev(click('.song[data-id="t1"]')); await b.ev(click('.song[data-id="t2"]')); await b.sleep(200);
  b.check("tap-selects", await b.ev(visible("#home")) && (await b.ev(`document.querySelectorAll("#songs .song.selected").length`)) === 2
    && (await b.ev(`document.querySelector("#btnDelSel").innerText.trim()`)) === "删除（2）");
  await b.ev(click('.song[data-id="t2"]')); await b.sleep(100);
  b.check("tap-unselects", (await b.ev(`document.querySelector("#btnDelSel").innerText.trim()`)) === "删除（1）");
  await b.ev(click('.song[data-id="t2"]')); await b.sleep(100);
  await b.ev(click("#btnDelSel")); await b.sleep(300);
  const ask = await b.ev(F.sheetText);
  b.check("confirm-text " + JSON.stringify(ask), ask.includes("删除 2 首歌？") && ask.includes("音频、歌词和学习进度会被删除，学过的词会保留在复习里。"));
  await b.ev(click('[data-confirm="cancel"]')); await b.sleep(500);
  b.check("cancel-keeps", (await b.ev(songIds)) === "t1,t2,t3" && (await b.ev(`document.querySelectorAll("#songs .song.selected").length`)) === 2);
  await b.ev(click("#btnDelSel")); await b.sleep(300);
  await b.ev(click('[data-confirm="ok"]')); await b.sleep(500);
  b.check("deleted-shown " + (await b.ev(`document.querySelector("#snack").innerText`)), (await b.ev(songIds)) === "t3" && await b.ev(visible("#snack"))
    && (await b.ev(`document.querySelector("#snackMsg").innerText.trim()`)) === "已删除 2 首歌" && (await b.ev(`document.querySelector("#snackUndo").innerText.trim()`)) === "撤销"
    && !(await b.ev(visible("#btnDelSel"))) && await b.ev(visible("#btnAdd")) && !!(await b.ev(F.idbGet("songs", "t1"))));
  await b.ev(click("#snackUndo")); await b.sleep(300);
  b.check("undo", (await b.ev(songIds)) === "t1,t2,t3" && !(await b.ev(visible("#snack"))) && !!(await b.ev(F.idbGet("songs", "t1"))));

  await selectAndDelete(b, ["t1", "t2"]);
  await b.sleep(5500);
  const card = await b.ev(F.idbGet("cards", "佢"));
  b.check("committed-after-5s " + JSON.stringify(card && card.sources), !(await b.ev(F.idbGet("songs", "t1"))) && !(await b.ev(F.idbGet("songs", "t2"))) && !!(await b.ev(F.idbGet("songs", "t3")))
    && !!card && JSON.stringify(card.sources) === JSON.stringify([{ songId: "t3", li: 0 }]) && !(await b.ev(visible("#snack"))));

  // 删除后马上离开首页，也会真正删除
  await b.ev(putSong("t4", "第四首")); await b.nav("/");
  await selectAndDelete(b, ["t4"]);
  await b.ev(click("#btnAdd")); await b.sleep(700);
  b.check("committed-on-leave", !(await b.ev(F.idbGet("songs", "t4"))));
  await b.ev(click("#importView [data-back]")); await b.sleep(700);

  // 切到后台也会真正删除
  await b.ev(putSong("t5", "第五首")); await b.nav("/");
  await selectAndDelete(b, ["t5"]);
  await b.ev(`(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); })()`);
  await b.sleep(400);
  b.check("committed-on-hide", !(await b.ev(F.idbGet("songs", "t5"))));
  await b.ev(`Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })`);

  // 歌曲页「⋯」删除：回首页，可以撤销
  await F.openSong(b, "t3");
  await b.ev(click("#btnMenu")); await b.sleep(500);
  await b.ev(click('[data-menu="del"]')); await b.sleep(300);
  await b.ev(click('[data-confirm="ok"]')); await b.sleep(1000);
  b.check("single-delete-undoable", await b.ev(visible("#home")) && (await b.ev(songIds)) === "" && (await b.ev(`document.querySelector("#snackMsg").innerText.trim()`)) === "已删除 1 首歌");
  b.check("no-select-when-empty", !(await b.ev(visible("#btnSelect"))));
  await b.ev(click("#snackUndo")); await b.sleep(300);
  b.check("single-undo", (await b.ev(songIds)) === "t3" && !!(await b.ev(F.idbGet("songs", "t3"))));
  // 选择模式点「完成」退出
  await b.ev(click("#btnSelect")); await b.sleep(150); await b.ev(click('.song[data-id="t3"]')); await b.ev(click("#btnDone")); await b.sleep(200);
  b.check("done-exits", !(await b.ev(visible("#btnDelSel"))) && await b.ev(visible("#btnSettings")) && (await b.ev(`document.querySelectorAll("#songs .song .check").length`)) === 0);
  await b.ev(click('.song[data-id="t3"]')); await b.sleep(900);
  b.check("tap-opens-after-done", await b.ev(visible("#playerView")));
  // 删除后 5 秒内恢复一份包含这首歌的备份：恢复的歌不能被稍后的真正删除删掉
  await b.ev(click("#playerView [data-back]")); await b.sleep(700);
  const t3 = await b.ev(`(async () => { const s = await (${F.idbGet("songs", "t3")}); delete s.audio; return s; })()`);
  await selectAndDelete(b, ["t3"]);
  await b.ev(click("#btnSettings")); await b.sleep(500);
  await b.ev(F.restoreText(JSON.stringify({ app: "yuechang", v: 2, songs: [t3], cards: [], meta: [] }))); await b.sleep(4400);
  b.check("restore-during-undo-keeps-song", !!(await b.ev(F.idbGet("songs", "t3"))));
  b.check("delete: 页面没有报错", b.errors.length === 0);
} };
