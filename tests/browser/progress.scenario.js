// M4a：旧的 prefs.goal 搬到 meta.daily；恢复备份时已学的句子取并集。句子都是编的。
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
// 在空白页改数据库里 t1 的 progress（v1 结构的库，只有 songs 表）
const setProgress = p => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get("t1").onsuccess = e => { const s = e.target.result; s.progress = ${JSON.stringify(p)}; st.put(s).onsuccess = () => { db.close(); res(); }; }; }; })`;
module.exports = { name: "progress", async run(b) {
  await b.nav("/__blank");
  await b.ev(`localStorage.setItem("yc-prefs", JSON.stringify({ jp: true, zh: true, goal: 6 }))`);
  await b.ev(F.SEED_V1);
  await b.ev(setProgress({ learned: [0, 1], current: true }));
  await b.nav("/");
  const prefs = JSON.parse(await b.ev(`localStorage.getItem("yc-prefs")`));
  b.check("migrate-prefs-goal", (await b.ev(F.idbGet("meta", "daily")))?.goal === 6 && prefs.goal === 6 && prefs.jp === true); // 数据兼容规则：搬家后旧字段 prefs.goal 留着不删

  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("goal-shows-6", (await b.ev(`document.querySelector("#goalSeg [aria-pressed=true]").innerText.trim()`)) === "6");
  const bk = JSON.parse(await b.ev(F.exportText));
  bk.songs.find(s => s.id === "t1").progress = { learned: [1, 3] };
  // 备份里多一首本机没有的歌，也标了"正在学"；备份里每天学 7 句
  bk.songs.push({ ...bk.songs.find(s => s.id === "t2"), id: "t3", progress: { learned: [], current: true } });
  bk.meta = bk.meta.filter(m => m.key !== "daily").concat({ key: "daily", goal: 7, date: "2026-01-01", newLines: 0, extra: 0, reviewed: 0 });
  await b.ev(F.restoreText(JSON.stringify(bk)));
  const t1 = await b.ev(F.idbGet("songs", "t1"));
  b.check("restore-merges-learned", JSON.stringify(t1.progress.learned) === "[0,1,3]" && t1.progress.current === true);
  b.check("restore-one-current", (await b.ev(F.idbGet("songs", "t3")))?.progress?.current === false);
  b.check("restore-goal", (await b.ev(F.idbGet("meta", "daily")))?.goal === 7);
  await b.ev(`document.querySelector("#settingsView [data-back]").click()`); await b.sleep(800);
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("restore-goal-shown", (await b.ev(`document.querySelector("#goalSeg [aria-pressed=true]").innerText.trim()`)) === "自定义"
    && (await b.ev(`document.querySelector("#goalNum").innerText.trim()`)) === "7");
  b.check("restore-keeps-audio", (await b.ev(F.idbGet("songs", "t1") + `.then(s => s.audio && s.audio.size)`)) > 1000);
  b.check("no-errors", b.errors.length === 0);
} };
