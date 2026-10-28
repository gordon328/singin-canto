// M4b：首页「今天的学习」卡片、歌曲进度、设为正在学。句子都是编的。
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
// 改数据库里的一首歌：patchSong("t1", {progress: …})
const patchSong = (id, patch) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get(${JSON.stringify(id)}).onsuccess = e => { st.put(Object.assign(e.target.result, ${JSON.stringify(patch)})).onsuccess = () => { db.close(); res(); }; }; }; })`;
const putMeta = rec => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
  db.transaction("meta", "readwrite").objectStore("meta").put(${JSON.stringify(rec)}).onsuccess = () => { db.close(); res(); }; }; })`;
const today = () => { const d = new Date(Date.now() - 4 * 3600e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const todayText = `document.querySelector("#today").innerText`;
const subOf = id => `document.querySelector('.song[data-id="${id}"] .sub').innerText`;
async function reload(b) { await b.nav("/"); }
module.exports = { name: "today", async run(b) {
  await F.seed(b);
  await b.ev(patchSong("t1", { progress: { learned: [], current: true } }));
  await reload(b);
  let t = await b.ev(todayText);
  b.check("card-shown", await b.ev(visible("#today")) && t.includes("今天的学习") && t.includes("新学") && !t.includes("复习")
    && (await b.ev(`document.querySelector("#today .big").innerText.trim()`)) === "4" && t.includes("測試歌") && t.includes("第 1–4 句")
    && t.includes("开始今天的学习"));
  // 只有「新学」一格时：不要大方块，紧凑的一行「新学 4 句 · 歌名 第 1–4 句」
  b.check("compact-line", !(await b.ev(`!!document.querySelector("#today .today-cell")`))
    && /新学\s*4\s*句\s*·\s*測試歌\s*第 1–4 句/.test(await b.ev(`document.querySelector("#today .today-line").innerText`))
    && (await b.ev(`getComputedStyle(document.querySelector("#today .big")).fontFamily`)).includes("Outfit"));
  await b.shot("today-light");

  await b.ev(click("#btnSettings")); await b.sleep(800);
  await b.ev(click('#goalSeg [data-goal="2"]')); await b.sleep(200);
  await b.ev(click("#settingsView [data-back]")); await b.sleep(800);
  t = await b.ev(todayText);
  b.check("goal-follows", (await b.ev(`document.querySelector("#today .big").innerText.trim()`)) === "2" && t.includes("第 1–2 句"));

  await b.ev(patchSong("t1", { progress: { learned: [0, 1, 2], current: true } }));
  await reload(b);
  b.check("song-sub-progress", (await b.ev(subOf("t1"))).includes("已学 3 / 16 句") && (await b.ev(subOf("t2"))).includes("未开始"));
  b.check("range-after-learned", (await b.ev(todayText)).includes("第 4–5 句"));

  // 歌曲页「⋯」→「设为正在学」
  await F.openSong(b, "t2");
  await b.ev(click("#btnMenu")); await b.sleep(400);
  b.check("menu-has-current", await b.ev(visible('[data-menu="current"]')));
  await b.ev(click('[data-menu="current"]')); await b.sleep(500);
  b.check("menu-current-saved", (await b.ev(F.idbGet("songs", "t2"))).progress.current === true && (await b.ev(F.idbGet("songs", "t1"))).progress.current === false);
  await b.ev(click("#btnMenu")); await b.sleep(400);
  b.check("menu-current-hidden", !(await b.ev(visible('[data-menu="current"]'))));
  await b.ev(click("#btnMenu")); await b.sleep(300);
  await b.ev(click("#playerView [data-back]")); await b.sleep(900);
  // T2 没有词汇包 → 按钮「先导入词汇包」→ 打开 T2 和词汇包弹窗
  b.check("no-pack-button", (await b.ev(`document.querySelector("#today [data-today]").innerText.trim()`)) === "先导入词汇包");
  await b.ev(click("#today [data-today]")); await b.sleep(1300);
  b.check("no-pack-opens", await b.ev(visible("#playerView")) && (await b.ev(`history.state.songId`)) === "t2"
    && !(await b.ev(`document.querySelector("#sheet").hidden`)) && !!(await b.ev(`document.querySelector("#promptBox")`)));
  await F.closeSheet(b);
  await b.ev(click("#playerView [data-back]")); await b.sleep(900);

  // T1 全部学完并是正在学 → 「这首学完了 🎉」，可以选 T2
  await b.ev(patchSong("t1", { progress: { learned: [...Array(16).keys()], current: true } }));
  await b.ev(patchSong("t2", { progress: { learned: [], current: false } }));
  await reload(b);
  t = await b.ev(todayText);
  b.check("finished", t.includes("这首学完了 🎉") && await b.ev(`!!document.querySelector('#today [data-pick="t2"]')`));
  await b.ev(click('#today [data-pick="t2"]')); await b.sleep(500);
  b.check("finished-pick", (await b.ev(F.idbGet("songs", "t2"))).progress.current === true && !(await b.ev(todayText)).includes("这首学完了"));

  // 今天的数量学完了 → 「今天完成了 ✓」+「再学 2 句」
  await b.ev(patchSong("t1", { progress: { learned: [], current: true } }));
  await b.ev(patchSong("t2", { progress: { learned: [], current: false } }));
  await b.ev(putMeta({ key: "daily", goal: 2, date: today(), newLines: 2, extra: 0, reviewed: 0, songId: "t1", done: [0, 1] }));
  await reload(b);
  t = await b.ev(todayText);
  b.check("done-today", t.includes("今天完成了 ✓") && (await b.ev(`document.querySelector("#today [data-today]").innerText.trim()`)) === "再学 2 句");
  // 今天在 T1 学完了，又把 T2 设为正在学：卡片不能把 T1 的句子范围写在 T2 后面
  await b.ev(patchSong("t1", { progress: { learned: [0, 1], current: false } }));
  await b.ev(patchSong("t2", { progress: { learned: [], current: true } }));
  await reload(b);
  t = await b.ev(todayText);
  b.check("done-other-song", t.includes("今天完成了 ✓") && !t.includes("第 1–2 句"));
  b.check("buttons-44px", await b.ev(`[...document.querySelectorAll("#today button")].every(e => e.getBoundingClientRect().height >= 44)`));
  b.check("no-errors", b.errors.length === 0);
} };
