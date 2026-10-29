// 测试数据：句子都是编的，不是真实歌词（仓库是公开的）。
// SEED_V1 在当前网址建一个 v1 结构的数据库（和 M1 之前的代码一样），写入两首测试歌。
const LINES_T1 = ["我穿風褸出去", "第二句測試", "今日天氣好好", "我哋去飲茶", "街市好多人", "佢買咗啲生果", "阿媽煮飯",
  "細佬睇電視", "落雨要帶遮", "巴士嚟喇", "夜晚好凍", "聽日再見", "你好嗎你", "風\u{2A6A5}吹",
  "我哋今晚一齊去街市買餸煮飯食好唔好？", "手指受傷之後慢慢結疤"];

const T1 = {
  id: "t1", title: "測試歌", artist: "測試", audioName: "t.mp3", duration: 45,
  lines: LINES_T1.map((text, i) => ({ t: i * 3 + 1, end: i * 3 + 4, text })),
  pack: { v: 2, summary: "测试用的大意。", imported: 1, fix: [{ from: "巴士", to: "巴仕" }], words: [
    { w: "風褸", jp: "", key: true, oral: false, zh: "风衣", tip: "提示" },
    { w: "你", jp: "", key: true, oral: false, zh: "你", tip: "" },
    { w: "風\u{2A6A5}", jp: "", key: true, oral: false, zh: "测试", tip: "" },
    { w: "今日天氣好好", jp: "", key: true, oral: false, zh: "今天天气很好（测试用的长词）", tip: "" },
    { w: "結疤", jp: "", key: true, oral: false, zh: "结疤", tip: "" }] },
  overrides: { "1:0": "dai2", "3:0": "ngo4" }, created: 1, updated: 2,
};
const T2 = {
  id: "t2", title: "長".repeat(40), artist: "", audio: null, audioName: "", duration: 0,
  lines: [{ t: 1, end: 4, text: "短句一" }, { t: 4, end: 8, text: "短句二" }],
  pack: null, overrides: {}, created: 1, updated: 1,
};

// 页面表达式：生成 secs 秒的静音 wav（File 对象），能真正播放
const silentWav = (secs = 5, name = "silence.wav") => `(() => { const rate = 8000, n = rate * ${secs}, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return new File([buf], ${JSON.stringify(name)}, { type: "audio/wav" }); })()`;

const SEED_V1 = `new Promise((res, rej) => { const r = indexedDB.open("yuechang", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("songs", { keyPath: "id" });
  r.onsuccess = () => { const db = r.result; const tx = db.transaction("songs", "readwrite"); const st = tx.objectStore("songs");
    st.put(Object.assign(${JSON.stringify(T1)}, { audio: ${silentWav(50, "t.wav")} }));
    st.put(${JSON.stringify(T2)});
    tx.oncomplete = () => { db.close(); res(); }; tx.onerror = rej; }; r.onerror = rej; })`;

// 读数据库里的一条记录：idbGet("cards", "風褸")
const idbGet = (store, key) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
  db.transaction(${JSON.stringify(store)}).objectStore(${JSON.stringify(store)}).get(${JSON.stringify(key)}).onsuccess = e => { db.close(); res(e.target.result || null); }; }; })`;
const idbCount = store => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
  db.transaction(${JSON.stringify(store)}).objectStore(${JSON.stringify(store)}).count().onsuccess = e => { db.close(); res(e.target.result); }; }; })`;
const WIPE = `new Promise(res => { const r = indexedDB.deleteDatabase("yuechang"); r.onsuccess = r.onerror = r.onblocked = () => res(); })`;

// 先在空白页造数据，再打开首页
async function seed(b) { await b.nav("/__blank"); await b.ev(SEED_V1); await b.nav("/"); }
// 打开某首歌（首页点卡片）
async function openSong(b, id) { await b.ev(`document.querySelector('.song[data-id="${id}"]').click()`); await b.sleep(900); }
// 点歌词里的第 li 句第 ci 个字
const tapChar = (li, ci) => `document.querySelector('#lyrics .line[data-li="${li}"] .c[data-ci="${ci}"]').click()`;
const sheetText = `document.querySelector("#sheetBody").innerText`;
// 手指在屏幕 (x, y) 点一下（真的触摸事件，会有 pointerdown/up 和 click）
async function tapAt(b, x, y) { await b.touch("touchStart", x, y); await b.touch("touchEnd"); await b.sleep(50); }
// 关掉弹层并等它真正消失：点弹层外面（屏幕上方，顶栏标题的位置）
async function closeSheet(b) { await tapAt(b, 215, 90); await b.sleep(450); }

// 备份文件（设置页要已经打开）。exportText：把分享面板换成假的，点「导出备份文件」，返回文件里的文字
const exportText = `(async () => { let got = null; navigator.canShare = () => true; navigator.share = async d => { got = d.files[0]; };
  document.querySelector("#bkExport").click(); await new Promise(r => setTimeout(r, 300)); window.__bkFile = got; return got ? await got.text() : null; })()`;
// restoreText：把文字当成选中的 .json 文件交给「从文件恢复」，confirm 为真时点「恢复」；返回提示文字
const restoreText = (text, confirm = true) => `(async () => { if (document.querySelector("#settingsView").hidden) { document.querySelector("#btnSettings").click(); await new Promise(r => setTimeout(r, 800)); }
  const inp = document.querySelector("#bkFile"), dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(text)}], "备份.json", { type: "application/json" }));
  inp.files = dt.files; inp.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 500));
  const ok = document.querySelector('#sheetBody [data-confirm="${confirm ? "ok" : "cancel"}"]'); if (ok) { ok.click(); await new Promise(r => setTimeout(r, 900)); }
  return document.querySelector("#bkMsg").innerText; })()`;

// VOICE_REC：录下标准发音录音播了哪些音节。fetch → 解码 → 播放一路带着文件名，每播一个音节往 window.__said 里放 ["♪音节", 开始时间, 长度]
// （和系统朗读的 [文字, 语速] 放在一起，按先后顺序）。voiced：取出播过的音节
const VOICE_REC = `window.__said = window.__said || []; (() => { if (window.__voiceRec) return; window.__voiceRec = 1;
  const tag = new WeakMap(), bt = new WeakMap(), of = window.fetch;
  window.fetch = async (...a) => { const r = await of(...a), m = String(a[0].url || a[0]).match(/audio\\/hiujin\\/([a-z]+\\d)\\.mp3/); if (!m) return r;
    const ab = r.arrayBuffer.bind(r); r.arrayBuffer = async () => { const x = await ab(); tag.set(x, m[1]); return x; }; return r; };
  const od = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function (a, ok, no) { const n = tag.get(a); return od.call(this, a, b => { bt.set(b, n); ok && ok(b); }, no); };
  const os = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (w, off, dur) { if (bt.has(this.buffer)) window.__said.push(["♪" + bt.get(this.buffer), w, dur]); return os.call(this, w, off, dur); };
})();`;
const voiced = `window.__said.filter(x => x[0][0] === "♪").map(x => x[0].slice(1))`;
const spoken = `window.__said.filter(x => x[0][0] !== "♪" && x[0] !== " ")`;

module.exports = { VOICE_REC, voiced, spoken, exportText, restoreText, silentWav, T1, T2, SEED_V1, idbGet, idbCount, WIPE, seed, openSong, tapChar, sheetText, tapAt, closeSheet };
