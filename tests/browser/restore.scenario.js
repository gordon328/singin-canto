// 恢复备份（v0.31，修 v0.30「已恢复」和「保存失败：空间不够」同时出现）：
// 一个事务写完，要么全部成功要么本机一点不改；歌曲用数据库里的音频（不写内存里可能失效的音频）；提示真正的错误原因；
// 连接断了重开数据库再试一次；写完核对数量；完整错误名和信息记进调试面板
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const idbAll = store => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
  db.transaction(${JSON.stringify(store)}).objectStore(${JSON.stringify(store)}).getAll().onsuccess = e => { db.close(); res(e.target.result); }; }; })`;
// 换掉 IDBObjectStore.put：写到 when(v) 为真的记录时出错。how = "throw"（直接抛出 name 错误）/ "abort"（事务中途中断）；times 次之后恢复正常
const breakPut = (when, how, name, times = 99) => `(() => { const orig = window.__origPut || (window.__origPut = IDBObjectStore.prototype.put); let n = ${times};
  IDBObjectStore.prototype.put = function (v, ...a) { if (n > 0 && (${when})(v)) { n--; if ("${how}" === "throw") throw new DOMException("测试：故意出错", "${name}");
    const r = orig.call(this, v, ...a); this.transaction.abort(); return r; } return orig.call(this, v, ...a); }; })()`;
const fixPut = `(() => { if (window.__origPut) IDBObjectStore.prototype.put = window.__origPut; })()`;
const errlog = `JSON.parse(localStorage.getItem("yc-errlog") || "[]")`;
const snapshotDb = async b => JSON.stringify({ songs: (await b.ev(idbAll("songs"))).map(s => ({ ...s, audio: s.audio ? s.audio.size : null })), cards: await b.ev(idbAll("cards")), meta: await b.ev(idbAll("meta")) });

// 一份完整的备份：3 首歌（t1 改了歌名、t2 不变、新歌 t9）、37 个生词、打卡 5 天、每天 6 句
function backup(bk) {
  const songs = bk.songs.map(s => s.id === "t1" ? { ...s, title: "改过的歌名" } : s);
  songs.push({ ...bk.songs[1], id: "t9", title: "第三首" });
  const cards = Array.from({ length: 37 }, (_, i) => ({ w: "詞" + i, jp: "ci4", zh: "词", tip: "", oral: false, sources: [], known: false,
    srs: { due: 1, interval: 1, ease: 2.5, reps: 1, lapses: 0 }, created: 1, updated: 1 }));
  const days = {}; for (let i = 1; i <= 5; i++) days[`2026-10-2${i}`] = { type: "done" };
  const meta = [{ key: "daily", goal: 6 }, { key: "checkin", days, restTokens: 1, lastTokenWeek: "2026-W43", lastProcessed: "2026-10-25", bestStreak: 5, unlocked: ["lilac"], theme: "lilac" }];
  return JSON.stringify({ ...bk, songs, cards, meta });
}

module.exports = { name: "restore", async run(b) {
  await F.seed(b);
  await b.ev(click("#btnSettings")); await b.sleep(800);
  const bk = JSON.parse(await b.ev(F.exportText));
  const text = backup(bk);
  const audioT1 = async () => (await b.ev(`(${F.idbGet("songs", "t1")}).then(s => s && s.audio ? s.audio.size : 0)`));
  const size0 = await audioT1();

  // 1. 事务中途出错（模拟 iPhone 写入失败）：本机一点不改，提示真正的原因，不显示「已恢复」
  const before = await snapshotDb(b);
  await b.ev(`localStorage.removeItem("yc-errlog")`);
  await b.ev(breakPut(`v => v && v.w === "詞20"`, "abort"));
  let msg = await b.ev(F.restoreText(text));
  await b.ev(fixPut);
  b.check("abort-msg " + msg, msg.includes("恢复失败，本机数据没有改动") && msg.includes("错误代码：") && !msg.includes("已恢复") && !msg.includes("空间"));
  b.check("abort-nothing-changed", (await snapshotDb(b)) === before);
  const log = await b.ev(errlog);
  b.check("abort-logged", log.some(r => r.where === "恢复备份" && r.name && r.msg));

  // 2. 只有真的空间不够才说空间不够
  await b.ev(breakPut(`v => v && v.w === "詞3"`, "throw", "QuotaExceededError"));
  msg = await b.ev(F.restoreText(text));
  await b.ev(fixPut);
  b.check("quota-msg " + msg, msg.includes("手机存储空间不够") && msg.includes("QuotaExceededError"));
  b.check("quota-nothing-changed", (await snapshotDb(b)) === before);

  // 3. 别的错误按实际原因说，不说空间不够
  await b.ev(breakPut(`v => v && v.w === "詞3"`, "throw", "DataCloneError"));
  msg = await b.ev(F.restoreText(text));
  await b.ev(fixPut);
  b.check("other-msg " + msg, msg.includes("DataCloneError") && !msg.includes("空间"));

  // 4. 连接断了（UnknownError）：重新打开数据库再试一次，成功
  await b.ev(`localStorage.removeItem("yc-errlog")`);
  await b.ev(breakPut(`v => v && v.w === "詞3"`, "throw", "UnknownError", 1));
  msg = await b.ev(F.restoreText(text));
  await b.ev(fixPut);
  b.check("retry-ok " + msg, msg.includes("已恢复 3 首歌、37 个生词，核对无误"));
  b.check("retry-logged", (await b.ev(errlog)).some(r => r.name === "UnknownError" && r.where.includes("重新打开")));

  // 5. 恢复后数据完整：歌、生词、打卡、每天几句和备份一致；已有歌的音频还在（用的是数据库里的音频）
  const songs = await b.ev(idbAll("songs")), cards = await b.ev(idbAll("cards"));
  b.check("songs-complete", songs.length === 3 && songs.find(s => s.id === "t1").title === "改过的歌名" && !!songs.find(s => s.id === "t9"));
  b.check("cards-complete", cards.length === 37);
  const ci = await b.ev(F.idbGet("meta", "checkin"));
  b.check("checkin-complete", [1, 2, 3, 4, 5].every(i => ci.days[`2026-10-2${i}`]?.type === "done"));
  b.check("goal-complete", (await b.ev(F.idbGet("meta", "daily")))?.goal === 6);
  b.check("audio-kept", size0 > 0 && (await audioT1()) === size0);
  b.check("settings-updated", (await b.ev(`document.querySelector("#wordsN").innerText`)) === "37");

  // 6. 再恢复一次同一个备份：没有变化的歌不重写，照样成功
  let songPuts = 0;
  await b.ev(`(() => { const o = IDBObjectStore.prototype.put; window.__origPut = o; window.__songPuts = 0; IDBObjectStore.prototype.put = function (v, ...a) { if (v && v.lines) window.__songPuts++; return o.call(this, v, ...a); }; })()`);
  msg = await b.ev(F.restoreText(text));
  songPuts = await b.ev("window.__songPuts"); await b.ev(fixPut);
  b.check("restore-again " + msg + " songPuts=" + songPuts, msg.includes("核对无误") && songPuts === 0);

  // 7. 调试面板里能看到完整的错误名和信息，有「恢复到更新前的数据」的位置
  await b.ev(breakPut(`v => v && v.key === "daily"`, "throw", "DataCloneError"));
  await b.ev(F.restoreText(text)); await b.ev(fixPut);
  await b.ev(`localStorage.setItem("yc-debug", "1")`); await b.nav("/");
  const dt = await b.ev(`document.querySelector("#dbgData").innerText`);
  b.check("dbg-errors " + dt.replace(/\n/g, " | "), dt.includes("最近的错误") && dt.includes("DataCloneError: 测试：故意出错") && dt.includes("恢复备份"));
  await b.shot("restore-debug-panel");
  await b.ev(click("#dbgErrClear")); await b.sleep(100);
  b.check("dbg-errors-cleared", (await b.ev(`document.querySelector("#dbgData").innerText`)).includes("（0 条）"));
  await b.ev(`localStorage.removeItem("yc-debug")`);

  // 8. 平时保存失败也按真正原因提示（不再一律说空间不够）
  await b.nav("/"); await b.ev(breakPut(`v => v && v.key === "tones"`, "throw", "InvalidStateError"));
  await b.ev(click("#btnToneNext")); await b.sleep(600);
  const t = await b.ev(`document.querySelector("#toast").innerText`);
  await b.ev(fixPut);
  b.check("save-fail-msg " + t, t.includes("保存失败") && t.includes("InvalidStateError") && !t.includes("空间"));
} };
