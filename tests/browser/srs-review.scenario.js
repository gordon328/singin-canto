// M5：复习画面（规格 6.1）。句子都是编的。
// 三张到期卡：「我」出处 t1 第 0 句；「穿」出处是已删除的歌；「風褸」出处的行号超出范围
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
const patchSong = (id, patch) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get(${JSON.stringify(id)}).onsuccess = e => { const s = e.target.result; const p = ${JSON.stringify(patch)}; if (p.end0) { s.lines[0].end = p.end0; delete p.end0; } st.put(Object.assign(s, p)).onsuccess = () => { db.close(); res(); }; }; }; })`;
const putMeta = rec => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
  db.transaction("meta", "readwrite").objectStore("meta").put(${JSON.stringify(rec)}).onsuccess = () => { db.close(); res(); }; }; })`;
const putCards = cs => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("cards", "readwrite"); const st = tx.objectStore("cards");
  ${JSON.stringify(cs)}.forEach(c => st.put(c)); tx.oncomplete = () => { db.close(); res(); }; }; })`;
const today = () => { const d = new Date(Date.now() - 4 * 3600e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const mk = (w, jp, zh, due, sources) => ({ w, jp, zh, tip: "", oral: false, sources, known: false, created: 1, updated: 1, srs: { due, interval: 1, ease: 2.5, reps: 1, lapses: 0 } });
const RECORD = `window.__said = []; speechSynthesis.speak = u => window.__said.push([u.text, Math.round(u.rate * 100) / 100]); speechSynthesis.cancel = () => {};`;
const body = `document.querySelector("#studyView").innerText`;
const count = `document.querySelector("#stCount").innerText.trim()`;
const act = a => click(`#studyView [data-act="${a}"]`);
const has = a => `!!document.querySelector('#studyView [data-act="${a}"]')`;
const bigWord = `[...document.querySelectorAll("#studyView .st-card .st-ch .hz")].map(e => e.innerText).join("")`;
const jpShown = `[...document.querySelectorAll("#studyView .st-card .st-ch .jp")].map(e => e.innerText).join(" ").trim()`;
const auState = `({ paused: document.querySelector("#au").paused, rate: document.querySelector("#au").playbackRate, t: document.querySelector("#au").currentTime })`;
const daily = b => b.ev(F.idbGet("meta", "daily"));
const screen = `document.querySelector("#stCount").innerText + "|" + document.querySelector("#stBody").innerText`;
async function step(b, a) { const s0 = await b.ev(screen); await b.ev(act(a)); for (let i = 0; i < 50 && (await b.ev(screen)) === s0; i++) await b.sleep(100); await b.sleep(400); }
async function start(b, sel = '#today [data-today="start"]') { await b.ev(RECORD); await b.ev(click(sel)); await b.sleep(900); }
module.exports = { name: "srs-review", async run(b) {
  await F.seed(b);
  await b.ev(patchSong("t1", { progress: { learned: [], current: true }, end0: 2.5 }));
  await b.nav("/");
  const now = Date.now();
  await b.ev(putCards([mk("我", "ngo5", "我", now - 3000, [{ songId: "t1", li: 0 }]), mk("穿", "cyun1", "穿", now - 2000, [{ songId: "gone", li: 0 }]),
    mk("風褸", "fung1 lau1", "风衣", now - 1000, [{ songId: "t1", li: 99 }])]));
  await b.nav("/");
  await start(b);

  b.check("review-first", (await b.ev(bigWord)) === "我" && (await b.ev(jpShown)) === "" && (await b.ev(body)).includes("心里读一遍，再点翻面")
    && (await b.ev(count)) === "1 / 3" && await b.ev(`!!document.querySelector("#stCells .st-bar")`));
  await b.shot("review-front-light");
  await step(b, "flip");
  const back = await b.ev(body);
  b.check("flip", (await b.ev(jpShown)) === "ngo5" && back.includes("出自 測試歌") && back.includes("我穿風褸出去") && await b.ev(has("orig"))
    && JSON.stringify((await b.ev("window.__said")).slice(-1)) === JSON.stringify([["我", 0.8]]));
  b.check("grade-labels", ["忘了", "模糊", "记得", "10 分钟", "1 天", "3 天"].every(x => back.includes(x)));
  b.check("buttons-44px", await b.ev(`[...document.querySelectorAll("#studyView button")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  await b.shot("review-back-light"); await b.dark(true); await b.sleep(300); await b.shot("review-back-dark"); await b.dark(false);

  // 「▶ 原唱这句」：从第 0 句开始（1s），到第 1 句开始（4s）停，0.8 倍速
  await b.ev(act("orig")); await b.sleep(600);
  const a1 = await b.ev(auState);
  b.check("orig-line-plays", !a1.paused && Math.abs(a1.rate - 0.8) < 0.01 && a1.t >= 1);
  await b.sleep(4200);
  const a2 = await b.ev(auState);
  b.check("orig-line-stops", a2.paused && a2.t >= 3.9 && a2.t < 4.6);

  // 「忘了」→ 10 分钟后；下一张「穿」
  const t0 = Date.now();
  await step(b, "again");
  const w1 = await b.ev(F.idbGet("cards", "我"));
  b.check("again-requeue", Math.abs(w1.srs.due - (t0 + 600e3)) < 60e3 && w1.srs.lapses === 1 && (await b.ev(bigWord)) === "穿"
    && (await b.ev(count)) === "2 / 4" && (await daily(b)).reviewed === 1);
  await step(b, "flip");
  b.check("no-source-deleted-song", !(await b.ev(body)).includes("出自") && !(await b.ev(has("orig"))));
  await step(b, "good");
  b.check("good", (await b.ev(F.idbGet("cards", "穿"))).srs.interval === 3);
  await step(b, "flip");
  b.check("no-source-bad-line", !(await b.ev(body)).includes("出自") && (await b.ev(jpShown)) === "fung1 lau1" && (await b.ev(body)).includes("风衣"));
  await step(b, "hard");
  b.check("hard", (await b.ev(F.idbGet("cards", "風褸"))).srs.interval === 1);
  b.check("again-again", (await b.ev(bigWord)) === "我" && (await b.ev(count)) === "4 / 4");
  await step(b, "flip"); await step(b, "again");
  b.check("again-once", (await daily(b)).reviewed === 3);
  // 复习完直接进入新句子：第 0 句里「我」「穿」「風褸」都有卡了 → 出、去
  b.check("then-new", (await b.ev(bigWord)) === "出" && (await b.ev(count)) === "1 / 2" && await b.ev(`!!document.querySelector("#stCells i")`));
  await b.ev(click("#studyView [data-back]")); await b.sleep(900);

  // 中途退出：评过的不再出现，reviewed 不重复加
  const t1 = Date.now();
  await b.ev(putCards([mk("甲", "gaap3", "", t1 - 2000, []), mk("乙", "jyut3", "", t1 - 1000, [])]));
  await b.nav("/");
  await start(b);
  b.check("resume-start", (await b.ev(bigWord)) === "甲" && (await b.ev(count)) === "1 / 2");
  await step(b, "flip"); await step(b, "good");
  await b.ev(click("#studyView [data-back]")); await b.sleep(900);
  await start(b);
  b.check("resume", (await b.ev(bigWord)) === "乙" && (await b.ev(count)) === "1 / 1" && (await daily(b)).reviewed === 4);
  await b.ev(click("#studyView [data-back]")); await b.sleep(900);

  // 今天的新句子学完了 → 首页「开始复习」→ 复习完到完成页
  await b.ev(putMeta({ ...(await daily(b)), newLines: 4, done: [0, 1, 2, 3], songId: "t1" }));
  await b.nav("/");
  await start(b, '#today [data-today="review"]');
  b.check("review-only-start", (await b.ev(bigWord)) === "乙");
  await step(b, "flip"); await step(b, "good");
  const d = await daily(b);
  b.check("review-only-done", (await b.ev(body)).includes("学完了") && d.reviewed === 5
    && (await b.ev(`document.querySelector("#studyView .st-stat b").innerText.trim()`)) === "5");
  // 选过「忘了」的「我」又到期了：再评分不重复算「复习的词」（每张卡今天只算一次）
  const r0 = (await daily(b)).reviewed;
  await b.ev(putCards([mk("我", "ngo5", "我", Date.now() - 9000, [{ songId: "t1", li: 0 }]), mk("子", "zi2", "", Date.now() - 1000, [{ songId: "t2", li: 0 }])]));
  await b.nav("/");
  await start(b, '#today [data-today="review"]');
  b.check("recount-start", (await b.ev(bigWord)) === "我" && (await b.ev(count)) === "1 / 2");
  // 连点「翻面」：第二下落在刚出现的评分按钮上，不能算评分
  await b.ev(act("flip") + ";" + act("hard"));
  await b.sleep(150);
  b.check("double-flip-no-grade", (await b.ev(jpShown)) === "ngo5" && (await b.ev(count)) === "1 / 2" && (await b.ev(F.idbGet("cards", "我"))).srs.due < Date.now());
  await b.sleep(400);
  // 评分后切换动画里点 🔊：不能读下一张的词
  await b.ev(act("good") + ";" + act("say"));
  await b.sleep(700);
  b.check("say-during-switch", JSON.stringify((await b.ev("window.__said")).slice(-1)) === JSON.stringify([["我", 0.8]]) && (await b.ev(bigWord)) === "子");
  b.check("no-recount", (await daily(b)).reviewed === r0);
  await step(b, "flip");
  b.check("no-orig-without-audio", (await b.ev(body)).includes("出自") && !(await b.ev(has("orig"))));
  await step(b, "good");
  b.check("count-new-card", (await daily(b)).reviewed === r0 + 1);

  // 正在学的歌已经全部学完 → 只复习，完成页是「这首歌全部学完了」+「选下一首歌」
  await b.ev(patchSong("t1", { progress: { learned: [...Array(16).keys()], current: true } }));
  await b.ev(putCards([mk("丑", "cau2", "", Date.now() - 1000, [])]));
  await b.nav("/");
  await start(b, '#today [data-today="review"]');
  await step(b, "flip"); await b.sleep(400); await step(b, "good");
  b.check("finished-review-only", (await b.ev(body)).includes("这首歌全部学完了") && await b.ev(has("pick")) && !(await b.ev(has("more"))));
  b.check("no-errors", b.errors.length === 0);
} };
