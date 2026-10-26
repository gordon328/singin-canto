// 编辑歌曲：歌名歌手、更换音频、插入/拆开/合并/删除一句，保存后学会记录、手动读音、卡片出处的行号跟着变
const F = require("./fixtures.js");
const { SMALL_BTNS } = require("./base.scenario.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = id => `!document.querySelector("#${id}").hidden`;
const toast = `(document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText)`;
const count = `document.querySelectorAll("#proofView .pl").length`;
const setVal = (sel, v) => `(() => { const i = document.querySelector(${JSON.stringify(sel)}); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`;
const setFile = (sel, secs) => `(() => { const dt = new DataTransfer(); dt.items.add(${F.silentWav(secs, "新音頻.wav")}); const i = document.querySelector(${JSON.stringify(sel)}); i.files = dt.files; i.dispatchEvent(new Event("change", { bubbles: true })); })()`;
async function openEdit(b) { await b.ev(click("#btnMenu")); await b.sleep(500); await b.ev(click('[data-menu="proof"]')); await b.sleep(800); }
async function openLine(b, i) { await b.ev(click(`#proofView .pl[data-i="${i}"] .pl-head`)); await b.sleep(250); }
const op = (i, name) => click(`#proofView .pl[data-i="${i}"] [data-op="${name}"]`);
module.exports = { name: "edit", async run(b) {
  await b.nav("/__blank"); await b.ev(F.SEED_V1); await b.nav("/"); // 先让 App 把数据库升到 v2
  // 准备：t1 学会了第 3、5、9 句；一张卡片的出处指向 t1 的第 5、9 句和 t2 的第 1 句
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction(["songs", "cards"], "readwrite");
    const st = tx.objectStore("songs"); st.get("t1").onsuccess = e => { const s = e.target.result; s.progress = { learned: [3, 5, 9], current: true }; st.put(s); };
    tx.objectStore("cards").put({ w: "佢", jp: "keoi5", zh: "他", tip: "", oral: true, sources: [{ songId: "t1", li: 5 }, { songId: "t1", li: 9 }, { songId: "t2", li: 1 }], known: false,
      srs: { due: 0, interval: 1, ease: 2.5, reps: 1, lapses: 0 }, created: 1, updated: 1 });
    tx.oncomplete = () => { db.close(); res(); }; }; })`);
  await b.nav("/");
  await F.openSong(b, "t1");
  await openEdit(b);
  b.check("title-edit-song", (await b.ev(`document.querySelector("#proofView .bar b").innerText.trim()`)) === "编辑歌曲");
  b.check("meta-fields", (await b.ev(`document.querySelector("#prTitle").value`)) === "測試歌" && (await b.ev(`document.querySelector("#prArtist").value`)) === "測試"
    && (await b.ev(`document.querySelector("#prAudioInfo").innerText`)).includes("t.mp3") && (await b.ev(`document.querySelector('label[for="prAudio"]').innerText.trim()`)) === "更换音频");

  // 歌名、歌手
  await b.ev(setVal("#prTitle", "新歌名")); await b.ev(setVal("#prArtist", "新歌手"));
  await b.ev(click("#proofSave")); await b.sleep(900);
  b.check("meta-saved", await b.ev(visible("playerView")) && (await b.ev(`document.querySelector("#pTitle").innerText`)) === "新歌名"
    && (await b.ev(`document.querySelector("#pArtist").innerText`)) === "新歌手" && (await b.ev(F.idbGet("songs", "t1"))).title === "新歌名");
  await b.ev(click("#playerView [data-back]")); await b.sleep(700);
  b.check("meta-on-home", (await b.ev(`document.querySelector('.song[data-id="t1"] .ttl').innerText`)) === "新歌名");
  await F.openSong(b, "t1");

  // 换音频：不保存就还是原来的；保存后换成新的，歌词和读音不变
  const size = `(async () => (await (${F.idbGet("songs", "t1")})).audio.size)()`;
  const oldSize = await b.ev(size);
  await openEdit(b);
  await b.ev(setFile("#prAudio", 7)); await b.sleep(900);
  b.check("audio-preview " + (await b.ev(`document.querySelector("#prDur").innerText`)), (await b.ev(`document.querySelector("#prDur").innerText`)) === "0:07"
    && (await b.ev(`document.querySelector("#prAudioInfo").innerText`)).includes("新音頻.wav"));
  await b.ev(click("#proofView [data-back]")); await b.sleep(500);
  await b.ev(click('[data-dirty="discard"]')); await b.sleep(900);
  b.check("audio-discard", (await b.ev(size)) === oldSize && (await b.ev(`document.querySelector("#pDur").innerText`)) === "0:50");
  await openEdit(b);
  await b.ev(setFile("#prAudio", 7)); await b.sleep(900);
  await b.ev(click("#proofSave")); await b.sleep(900);
  const s1 = await b.ev(F.idbGet("songs", "t1"));
  b.check("audio-saved", (await b.ev(size)) === 8000 * 7 + 44 && s1.audioName === "新音頻.wav" && s1.lines.length === 16 && s1.overrides["3:0"] === "ngo4" && s1.progress.learned.join() === "3,5,9");

  // 选了新音频、还没读完就返回：读完后不能把新音频装到播放页上
  await openEdit(b);
  await b.ev(`(() => { ${setFile("#prAudio", 9)}; document.querySelector("#proofView [data-back]").click(); })()`);
  await b.sleep(1500);
  b.check("late-audio-ignored " + (await b.ev(`document.querySelector("#pDur").innerText`)), await b.ev(visible("playerView")) && (await b.ev(`document.querySelector("#pDur").innerText`)) === "0:07");

  // 行操作
  await openEdit(b);
  await openLine(b, 0);
  b.check("first-line-no-merge", (await b.ev(`!!document.querySelector('#proofView .pl[data-i="0"] [data-op="insert"]')`)) && !(await b.ev(`!!document.querySelector('#proofView .pl[data-i="0"] [data-op="merge"]')`)));
  await openLine(b, 3);
  b.check("line-ops", await b.ev(`["insert", "split", "merge", "del"].every(n => !!document.querySelector('#proofView .pl[data-i="3"] [data-op="' + n + '"]'))`));
  const small = await b.ev(SMALL_BTNS);
  b.check("buttons-44px " + small.join(" "), small.length === 0);
  await b.shot("edit-light"); await b.dark(true); await b.sleep(300); await b.shot("edit-dark"); await b.dark(false);
  await b.ev(op(3, "insert")); await b.sleep(300);
  b.check("insert " + (await b.ev(count)), (await b.ev(count)) === 17 && (await b.ev(`document.querySelector("#proofView .pl.open").dataset.i`)) === "4"
    && (await b.ev(`document.activeElement && document.activeElement.classList.contains("pl-text")`)));
  await b.ev(click("#proofSave")); await b.sleep(300);
  b.check("empty-line-blocked " + (await b.ev(toast)), (await b.ev(toast)) === "第 5 句是空的" && await b.ev(visible("proofView")) && (await b.ev(`document.querySelector("#proofView .pl.open").dataset.i`)) === "4");
  await b.ev(setVal('#proofView .pl[data-i="4"] .pl-text', "新插入一句"));
  await openLine(b, 6);
  await b.ev(`document.querySelector('#proofView .pl[data-i="6"] .pl-text').setSelectionRange(0, 0)`);
  await b.ev(op(6, "split")); await b.sleep(200);
  b.check("split-needs-cursor " + (await b.ev(toast)), (await b.ev(toast)).includes("把光标放到要拆开的位置") && (await b.ev(count)) === 17);
  await b.ev(`document.querySelector('#proofView .pl[data-i="6"] .pl-text').setSelectionRange(3, 3)`);
  await b.ev(op(6, "split")); await b.sleep(300);
  b.check("split", (await b.ev(count)) === 18 && (await b.ev(`document.querySelector('#proofView .pl[data-i="7"] .pl-txt').innerText`)) === "啲生果");
  await openLine(b, 1);
  await b.ev(op(1, "merge")); await b.sleep(300);
  b.check("merge", (await b.ev(count)) === 17 && (await b.ev(`document.querySelector('#proofView .pl[data-i="0"] .pl-txt').innerText`)) === "我穿風褸出去 第二句測試");
  await openLine(b, 10);
  await b.ev(op(10, "del")); await b.sleep(300);
  b.check("delete-asks", (await b.ev(F.sheetText)).includes("删除这句？") && (await b.ev(count)) === 17);
  await b.ev(click('[data-confirm="ok"]')); await b.sleep(500);
  b.check("delete", (await b.ev(count)) === 16);
  await b.ev(click("#proofSave")); await b.sleep(900);
  const s2 = await b.ev(F.idbGet("songs", "t1")), card = await b.ev(F.idbGet("cards", "佢"));
  b.check("ops-saved-lines", s2.lines.length === 16 && s2.lines[0].text === "我穿風褸出去 第二句測試" && s2.lines[3].text === "新插入一句"
    && s2.lines[5].text === "佢買咗" && s2.lines[6].text === "啲生果" && s2.lines[9].text === "落雨要帶遮" && s2.lines[9].end === 31 && s2.lines[10].text === "夜晚好凍");
  b.check("ops-remap " + JSON.stringify([s2.overrides, s2.progress.learned, card.sources]), JSON.stringify(s2.overrides) === JSON.stringify({ "0:7": "dai2", "2:0": "ngo4" })
    && s2.progress.learned.join() === "2,5,6" && s2.progress.current === true
    && JSON.stringify(card.sources) === JSON.stringify([{ songId: "t1", li: 5 }, { songId: "t2", li: 1 }]));
  b.check("ops-player", (await b.ev(`document.querySelectorAll("#lyrics .line").length`)) === 16
    && (await b.ev(`document.querySelector('#lyrics .line[data-li="0"] .c[data-ci="7"] .jp').innerText.trim()`)) === "dai2");
  b.check("edit: 页面没有报错", b.errors.length === 0);
} };
