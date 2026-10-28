// M4b：整句、完成页、再学 2 句、中途退出继续、副歌跳过、选下一首歌。句子都是编的。
// T1 第 2 句改成和第 0 句一样（副歌），第 3 句没有汉字 → 学完第 1 句后这两句自动跳过
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
const patchSong = (id, patch) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get(${JSON.stringify(id)}).onsuccess = e => { const s = e.target.result; const p = ${JSON.stringify(patch)}; if (p.lineTexts) { p.lineTexts.forEach(([i, t]) => s.lines[i].text = t); delete p.lineTexts; }
    st.put(Object.assign(s, p)).onsuccess = () => { db.close(); res(); }; }; }; })`;
const putMeta = rec => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
  db.transaction("meta", "readwrite").objectStore("meta").put(${JSON.stringify(rec)}).onsuccess = () => { db.close(); res(); }; }; })`;
const today = () => { const d = new Date(Date.now() - 4 * 3600e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const RECORD = `window.__said = []; speechSynthesis.speak = u => window.__said.push([u.text, Math.round(u.rate * 100) / 100]); speechSynthesis.cancel = () => {};`;
const body = `document.querySelector("#studyView").innerText`;
const count = `document.querySelector("#stCount").innerText.trim()`;
const cells = `[...document.querySelectorAll("#stCells i")].map(e => e.className).join(",")`;
const act = a => click(`#studyView [data-act="${a}"]`);
const has = a => `!!document.querySelector('#studyView [data-act="${a}"]')`;
const bigWord = `[...document.querySelectorAll("#studyView .st-card .st-ch .hz")].map(e => e.innerText).join("")`;
const auState = `({ paused: document.querySelector("#au").paused, rate: document.querySelector("#au").playbackRate, t: document.querySelector("#au").currentTime })`;
const daily = b => b.ev(F.idbGet("meta", "daily"));
const learnedOf = async (b, id) => (await b.ev(F.idbGet("songs", id))).progress.learned;
async function start(b, sel = '#today [data-today="start"]') { await b.ev(RECORD); await b.ev(click(sel)); await b.sleep(900); }
// 点了以后等画面真的换掉（保存写完、新卡片画出来）再继续，机器忙时固定等待不够
const screen = `document.querySelector("#stCount").innerText + "|" + document.querySelector("#stBody").innerText`;
async function waitChange(b, before) { for (let i = 0; i < 50 && (await b.ev(screen)) === before; i++) await b.sleep(100); await b.sleep(300); }
async function words(b) { for (let i = 0; i < 20 && await b.ev(has("got")); i++) { const s0 = await b.ev(screen); await b.ev(act("got")); await waitChange(b, s0); } }
async function finishLine(b) { await words(b); const s0 = await b.ev(screen); await b.ev(act("lineok")); await waitChange(b, s0); }
module.exports = { name: "study2", async run(b) {
  await F.seed(b);
  await b.ev(patchSong("t1", { progress: { learned: [], current: true }, lineTexts: [[2, "我穿風褸出去"], [3, "……"]] }));
  await b.nav("/");
  await b.ev(putMeta({ key: "daily", goal: 2, date: today(), newLines: 0, extra: 0, reviewed: 0, songId: null, done: [] }));
  await b.nav("/");
  await start(b);
  await words(b);
  b.check("line-view", (await b.ev(cells)) === "done,done,done,done,done" && (await b.ev(count)) === "整句" && (await b.ev(body)).includes("把这句连起来读")
    && (await b.ev(`document.querySelectorAll("#studyView .st-whole .st-ch").length`)) === 6 && (await b.ev(body)).includes("先听原唱，再跟着小声唱出来"));
  await b.shot("study-line-light");
  await b.ev(act("slowline"));
  b.check("line-slow", JSON.stringify((await b.ev("window.__said")).slice(-1)) === JSON.stringify([["我穿風褸出去", 0.6]]));
  await b.ev(act("loop")); await b.sleep(500);
  const a1 = await b.ev(auState);
  b.check("line-loop-plays", !a1.paused && Math.abs(a1.rate - 0.8) < 0.01 && (await b.ev(body)).includes("0.8× · 循环中"));
  await b.sleep(4300);
  const a2 = await b.ev(auState);
  b.check("line-loop-loops", !a2.paused && a2.t >= 1 && a2.t < 4);
  await b.ev(act("loop")); await b.sleep(200);
  b.check("line-loop-stop", (await b.ev(auState)).paused && !(await b.ev(body)).includes("循环中"));
  await b.ev(act("loop")); await b.sleep(300);
  await b.ev(act("lineok") + ";" + act("lineok")); await b.sleep(600); // 连点两下只算一句
  let d = await daily(b);
  b.check("line-done", (await learnedOf(b, "t1")).includes(0) && d.newLines === 1 && JSON.stringify(d.done) === "[0]" && (await b.ev(auState)).paused);
  b.check("skip-learned-words", (await b.ev(count)) === "1 / 5" && (await b.ev(bigWord)) === "第" && (await b.ev(body)).includes("今日第 2 句"));

  // 学了一个词就关掉 → 首页还剩 1 句；再进来从第二个词继续
  await b.ev(act("got")); await b.sleep(420);
  await b.ev(click("#studyView [data-back]")); await b.sleep(900);
  b.check("resume-home", (await b.ev(`document.querySelector("#today .big").innerText.trim()`)) === "1");
  await start(b);
  b.check("resume", (await b.ev(bigWord)) === "二" && (await b.ev(count)) === "1 / 4");

  // 学完第 1 句：第 2 句（副歌）、第 3 句（没汉字）自动学会，不加计数 → 今天的 2 句学完 → 完成页
  await finishLine(b);
  d = await daily(b);
  b.check("chorus-skip", JSON.stringify(await learnedOf(b, "t1")) === "[0,1,2,3]" && d.newLines === 2);
  const done = await b.ev(body);
  b.check("done-page", done.includes("今天的 2 句学完了") && done.includes("測試歌 · 第 1–2 句") && done.includes("复习的词") && done.includes("新学的词") && done.includes("已学句子")
    && (await b.ev(`[...document.querySelectorAll("#studyView .st-stat b")].map(e => e.innerText.trim()).join()`)) === "0,10,4"
    && done.includes("明天要复习 10 个词，再学第 5–6 句。") && await b.ev(`document.querySelector("#studyView .st-check").classList.contains("pop")`)
    && (await b.ev(cells)) === "done" && (await b.ev(count)) === "");
  await b.shot("study-done-light"); await b.dark(true); await b.sleep(300); await b.shot("study-done-dark"); await b.dark(false);
  b.check("done-buttons", await b.ev(has("more")) && await b.ev(has("home")) && !(await b.ev(has("pick"))));

  // 回到首页 → 「今天完成了 ✓」；首页「再学 2 句」→ 接着学第 4 句
  await b.ev(act("home")); await b.sleep(900);
  b.check("home-btn", await b.ev(visible("#home")) && (await b.ev(`document.querySelector("#today").innerText`)).includes("今天完成了 ✓"));
  await start(b, '#today [data-today="more"]');
  b.check("more-from-home", (await daily(b)).extra === 2 && (await b.ev(bigWord)) === "街");
  await finishLine(b); await finishLine(b);
  b.check("done-again", (await b.ev(body)).includes("今天的 4 句学完了"));
  await b.ev(act("more") + ";" + act("more")); await b.sleep(700); // 连点两下只加 2 句
  b.check("more-2", (await daily(b)).extra === 4 && (await b.ev(body)).includes("今日第 5 句"));
  // 右滑返回（history.back）→ 首页，已学的保存了
  await b.ev("history.back()"); await b.sleep(900);
  b.check("swipe-back", await b.ev(visible("#home")) && (await learnedOf(b, "t1")).includes(5));

  // 只剩最后一句（第 11 句「聽日再見」）→ 学完：这首歌全部学完了 → 选下一首歌
  const allBut = n => [...Array(16).keys()].filter(i => i !== n);
  await b.ev(patchSong("t1", { progress: { learned: allBut(11), current: true } }));
  await b.ev(patchSong("t2", { progress: { learned: [], current: false } }));
  await b.ev(putMeta({ key: "daily", goal: 4, date: today(), newLines: 0, extra: 0, reviewed: 0, songId: "t1", done: [] }));
  await b.nav("/");
  await start(b); await finishLine(b);
  const fin = await b.ev(body);
  b.check("song-finished", fin.includes("这首歌全部学完了 🎉") && !(await b.ev(has("more"))) && await b.ev(has("pick")));
  await b.ev(act("pick")); await b.sleep(500);
  b.check("pick-next-sheet", !(await b.ev(`document.querySelector("#sheet").hidden`)) && await b.ev(`!!document.querySelector('#sheetBody [data-pick="t2"]')`));
  await b.ev(click('#sheetBody [data-pick="t2"]')); await b.sleep(1000);
  b.check("pick-next", await b.ev(visible("#home")) && (await b.ev(F.idbGet("songs", "t2"))).progress.current === true
    && (await b.ev(F.idbGet("songs", "t1"))).progress.current === false && await b.ev(`document.querySelector("#sheet").hidden`));

  // 其他歌也都学完了 → 「其他歌都学完了」+「＋ 导入新歌」
  await b.ev(patchSong("t1", { progress: { learned: allBut(11), current: true } }));
  await b.ev(patchSong("t2", { progress: { learned: [0, 1], current: false } }));
  await b.nav("/");
  await start(b); await finishLine(b);
  await b.ev(act("pick")); await b.sleep(500);
  b.check("pick-next-none", (await b.ev(`document.querySelector("#sheetBody").innerText`)).includes("其他歌都学完了") && await b.ev(`!!document.querySelector("#sheetBody [data-import]")`));
  await b.ev(click("#sheetBody [data-import]")); await b.sleep(1000);
  b.check("pick-import", await b.ev(visible("#importView")));

  // 一句里的词都学过了（第 0 句的字前面都建过卡）→ 直接整句，进度格全满
  await b.ev(patchSong("t1", { progress: { learned: allBut(0), current: true } }));
  await b.nav("/");
  await start(b);
  b.check("all-carded-whole", (await b.ev(count)) === "整句" && (await b.ev(cells)) === "done");
  b.check("no-errors", b.errors.length === 0);
} };
