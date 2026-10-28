// M4b：学习页（学词卡片、整句、完成页）。句子都是编的。
// T1 第 0 句「我穿風褸出去」：旧词汇包里只有「風褸」，其余是单字 → 我、穿、風褸、出、去 五张卡
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
const patchSong = (id, patch) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get(${JSON.stringify(id)}).onsuccess = e => { st.put(Object.assign(e.target.result, ${JSON.stringify(patch)})).onsuccess = () => { db.close(); res(); }; }; }; })`;
const RECORD = `window.__said = []; speechSynthesis.speak = u => window.__said.push([u.text, Math.round(u.rate * 100) / 100]); speechSynthesis.cancel = () => {};`;
const said = `window.__said`;
const body = `document.querySelector("#studyView").innerText`;
const count = `document.querySelector("#stCount").innerText.trim()`;
const cells = `[...document.querySelectorAll("#stCells i")].map(e => e.className).join(",")`;
const act = a => click(`#studyView [data-act="${a}"]`);
const bigWord = `[...document.querySelectorAll("#studyView .st-ch .hz")].map(e => e.innerText).join("")`;
async function start(b) { await b.ev(RECORD); await b.ev(click('#today [data-today="start"]')); await b.sleep(900); }
async function next(b, a = "got") { await b.ev(act(a)); await b.sleep(450); }
module.exports = { name: "study", async run(b) {
  await F.seed(b);
  await b.ev(patchSong("t1", { progress: { learned: [], current: true } }));
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
    st.get("t1").onsuccess = e => { const s = e.target.result; s.lines[0].end = 2.5; st.put(s).onsuccess = () => { db.close(); res(); }; }; }; })`);
  await b.nav("/");
  b.check("fab-anim", await b.ev(`document.querySelector("#btnAdd").classList.contains("bar-in")`));
  await start(b);
  b.check("enter", await b.ev(visible("#studyView")) && (await b.ev("history.state.view")) === "studyView");
  b.check("foot-anim", await b.ev(`document.querySelector("#stFoot").classList.contains("bar-in")`));

  b.check("word-card-1", (await b.ev(bigWord)) === "我" && (await b.ev(count)) === "1 / 5"
    && (await b.ev(cells)) === "cur,,,," && (await b.ev(`document.querySelector("#studyView .st-line").innerText`)).includes("今日第 1 句")
    && (await b.ev(`document.querySelector("#studyView .st-line .hl").innerText`)) === "我"
    && /^[a-z]+[1-6]$/.test(await b.ev(`document.querySelector("#studyView .st-ch .jp").innerText`))
    && (await b.ev(body)).includes("声 ·") && (await b.ev(body)).includes("暂无释义") && (await b.ev(body)).includes("重新生成词汇包"));
  // iOS 只在手指点的那一下允许开始朗读：点「开始」时同步先读一个静音的空格解锁
  b.check("speech-unlocked-in-tap", (await b.ev(said))[0][0] === " ");
  b.check("speak-auto", JSON.stringify((await b.ev(said)).find(x => x[0] !== " ")) === JSON.stringify(["我", 0.8]));
  await b.ev(act("say")); await b.ev(act("slow"));
  b.check("speak-buttons", JSON.stringify((await b.ev(said)).slice(-2)) === JSON.stringify([["我", 0.8], ["我", 0.6]]));
  b.check("buttons-44px", await b.ev(`[...document.querySelectorAll("#studyView button")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  await b.shot("study-word-light");
  // 原唱只播这一句：从这句开始（1s），到下一句开始（4s）停，0.8 倍速。第 0 句的 end 是 2.5，不能停在 end
  await b.ev(act("orig")); await b.sleep(600);
  const au = `({ paused: document.querySelector("#au").paused, rate: document.querySelector("#au").playbackRate, t: document.querySelector("#au").currentTime })`;
  const a1 = await b.ev(au);
  b.check("orig-plays", !a1.paused && Math.abs(a1.rate - 0.8) < 0.01 && a1.t >= 1);
  await b.sleep(4200);
  const a2 = await b.ev(au);
  b.check("orig-stops-at-next-line", a2.paused && a2.t >= 3.9 && a2.t < 4.6);
  // iPhone 第一次点播放时才加载音频：加载完（loadedmetadata）不能把速度改回 1 倍
  await b.ev(act("orig")); await b.ev(`document.querySelector("#au").dispatchEvent(new Event("loadedmetadata"))`); await b.sleep(200);
  b.check("rate-after-metadata", Math.abs((await b.ev(au)).rate - 0.8) < 0.01);
  await b.ev(act("say")); await b.sleep(100);
  // 播放失败要提示原因
  await b.ev(`window.__play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException("blocked", "NotAllowedError")); }`);
  await b.ev(act("orig")); await b.sleep(300);
  b.check("play-error-toast", (await b.ev(`document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText`)).includes("拦"));
  await b.ev(`HTMLMediaElement.prototype.play = window.__play`);

  // 快速连点两下「会读了」：只算一次，第 2 张「穿」不会被跳过
  await b.ev(act("got") + ";" + act("got")); await b.sleep(600);
  b.check("double-tap-got", (await b.ev(bigWord)) === "穿" && !(await b.ev(F.idbGet("cards", "穿"))));
  await next(b);
  b.check("word-card-3", (await b.ev(bigWord)) === "風褸" && (await b.ev(count)) === "3 / 5" && (await b.ev(cells)) === "done,done,cur,," && (await b.ev(body)).includes("风衣"));
  await next(b, "known");
  const kw = await b.ev(F.idbGet("cards", "風褸")), w0 = await b.ev(F.idbGet("cards", "我"));
  b.check("known", kw && kw.known === true && w0 && w0.known === false && w0.srs.interval === 1 && w0.sources[0].songId === "t1" && w0.sources[0].li === 0);
  b.check("word-card-4", (await b.ev(bigWord)) === "出");

  // 点了「会读了」马上右滑返回：不报错，这张卡已经存了
  await b.ev(act("got") + ";history.back()"); await b.sleep(900);
  b.check("swipe-during-save", await b.ev(visible("#home")) && !!(await b.ev(F.idbGet("cards", "出"))) && b.errors.length === 0);
  await start(b);
  await b.ev(click("#studyView [data-back]")); await b.sleep(900);
  b.check("close", await b.ev(visible("#home")) && await b.ev(`document.querySelector("#au").paused`));

  // 没有音频的歌：原唱按钮提示「先加上音频」
  await b.ev(patchSong("t2", { progress: { learned: [], current: true }, pack: { v: 3, summary: "", fix: [], imported: 1, words: [{ w: "短", jp: "dyun2", key: true, oral: false, zh: "短", tip: "" }] } }));
  await b.ev(patchSong("t1", { progress: { learned: [], current: false } }));
  await b.nav("/");
  await start(b);
  await b.ev(act("orig")); await b.sleep(200);
  b.check("no-audio", (await b.ev(`document.querySelector("#toast").innerText`)).includes("先加上音频"));
  await b.ev(click("#studyView [data-back]")); await b.sleep(900);
  b.check("no-errors", b.errors.length === 0);
} };
