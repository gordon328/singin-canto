// 第三部分：标准发音用 Hiujin 单音节录音（audio/hiujin/），字之间正常停 0.05 秒、逐字听停 0.3 秒；
// 音节库里没有的读音退回系统朗读。句子都是编的。
const F = require("./fixtures.js");
const RECORD = `window.__said = []; speechSynthesis.speak = u => window.__said.push([u.text, Math.round(u.rate * 100) / 100]); speechSynthesis.cancel = () => {};` + F.VOICE_REC;
const notes = `[...window.__said.filter(x => x[0][0] === "♪")]`;
// 两个音节之间停了多久（前一个结束到后一个开始）
const gapOf = (a, b) => Math.round((b[1] - (a[1] + a[2])) * 1000) / 1000;
module.exports = { name: "voice", async run(b) {
  await F.seed(b);
  await b.ev(RECORD);
  // 首页声调键帽：点「詩」播 si1 录音，不用系统朗读
  await b.ev(`document.querySelector("#tones .key").click()`); await b.sleep(500);
  b.check("tone-key-recording", JSON.stringify(await b.ev(F.voiced)) === JSON.stringify(["si1"]) && (await b.ev(F.spoken)).length === 0);
  b.check("audio-fetched", b.requests.some(u => u.includes("audio/hiujin/si1.mp3")));
  // 头尾静音剪掉了：播放长度比整个文件短，且大于 0.1 秒
  const n0 = (await b.ev(notes))[0];
  b.check("trimmed " + JSON.stringify(n0), n0[2] > 0.1 && n0[2] < 1.5);
  // 音节库里没有的读音：整个字用系统朗读（语速和以前一样 0.7）
  await b.ev(`(() => { const k = document.querySelector("#tones .key"); k.dataset.jp = "xx1"; k.click(); })()`); await b.sleep(300);
  b.check("fallback-tts", JSON.stringify((await b.ev(F.spoken)).slice(-1)) === JSON.stringify([["詩", 0.7]]) && (await b.ev(F.voiced)).length === 1);

  // 点字词卡「風褸」：两个音节连着读，中间停 0.05 秒；有录音时不显示「系统朗读可能读成…」
  await F.openSong(b, "t1");
  await b.ev(RECORD);
  await b.ev(F.tapChar(0, 2)); await b.sleep(600);
  b.check("no-tts-warning", !(await b.ev(`!!document.querySelector("#sheetBody .warn")`)));
  await b.ev(`document.querySelector('#sheetBody .wc-btns [data-say]').click()`); await b.sleep(800);
  const w = (await b.ev(notes)).slice(-2);
  b.check("word-joined " + JSON.stringify(w), w.length === 2 && w[0][0] === "♪fung1" && w[1][0] === "♪lau1" && gapOf(w[0], w[1]) === 0.05);
  // 点大字方块里的单个字：只读这个字
  await b.ev(`document.querySelectorAll('#sheetBody .wc-ch')[1].click()`); await b.sleep(400);
  b.check("single-char", JSON.stringify((await b.ev(F.voiced)).slice(-1)) === JSON.stringify(["lau1"]));
  b.check("page-no-errors-1", b.errors.length === 0);
  await F.closeSheet(b);

  // 学词「逐字听」：音节之间停 0.3 秒。用两个字的「風褸」那张卡
  await b.nav("/");
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
    st.get("t1").onsuccess = e => { st.put(Object.assign(e.target.result, { progress: { learned: [], current: true } })).onsuccess = () => { db.close(); res(); }; }; }; })`);
  await b.nav("/");
  await b.ev(RECORD);
  await b.ev(`document.querySelector('#today [data-today="start"]').click()`); await b.sleep(900);
  for (let i = 0; i < 2; i++) { await b.ev(`document.querySelector('#studyView [data-act="got"]').click()`); await b.sleep(500); }
  b.check("study-on-word", (await b.ev(`[...document.querySelectorAll("#studyView .st-ch .hz")].map(e => e.innerText).join("")`)) === "風褸");
  await b.ev(`document.querySelector('#studyView [data-act="slow"]').click()`); await b.sleep(1200);
  const s = (await b.ev(notes)).slice(-2);
  b.check("each-gap " + JSON.stringify(s), s.length === 2 && s[0][0] === "♪fung1" && s[1][0] === "♪lau1" && gapOf(s[0], s[1]) === 0.3);
  b.check("no-tts", (await b.ev(F.spoken)).length === 0);
  b.check("voice: 页面没有报错", b.errors.length === 0);
} };
