// M1 回归：数据库升级、加入生词、备份 v2
const F = require("./fixtures.js");
module.exports = { name: "m1", async run(b) {
  await F.seed(b);
  b.check("upgrade: 首页还有测试歌", (await b.ev(`document.querySelector("#home").innerText`)).includes("測試歌"));
  const db = await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const d = r.result; res({ v: d.version, s: [...d.objectStoreNames] }); d.close(); }; })`);
  b.check("upgrade: 数据库版本 2，三张表", db.v === 2 && ["cards", "meta", "songs"].every(s => db.s.includes(s)));
  const song = await b.ev(F.idbGet("songs", "t1") + `.then(s => ({ size: s.audio && s.audio.size, ov: s.overrides["1:0"] }))`);
  b.check("upgrade: 音频和改过的读音还在", song.size > 1000 && song.ov === "dai2");

  await F.openSong(b, "t1");
  await b.ev(F.tapChar(0, 2)); await b.sleep(400);
  b.check("addcard: 词卡有「＋ 加入生词」", (await b.ev(F.sheetText)).includes("＋ 加入生词"));
  await b.ev(`document.querySelector("[data-addcard]").click()`); await b.sleep(600);
  b.check("addcard: 加入后显示 已在生词本 · 明天复习", (await b.ev(F.sheetText)).includes("已在生词本 · 明天复习"));
  const c1 = await b.ev(F.idbGet("cards", "風褸"));
  b.check("addcard: 卡片 jp 是自动粤拼、zh/出处正确", !!c1 && /^[a-z]+[1-6] [a-z]+[1-6]$/.test(c1.jp) && c1.zh === "风衣" && c1.sources[0].li === 0);
  await F.closeSheet(b);
  await b.ev(F.tapChar(1, 0)); await b.sleep(400);
  await b.ev(`document.querySelector("[data-addcard]").click()`); await b.sleep(600);
  b.check("addcard: 改过读音的字用改后的读音", (await b.ev(F.idbGet("cards", "第")))?.jp === "dai2");
  await F.closeSheet(b);
  await b.ev(F.tapChar(12, 3)); await b.sleep(400);
  await b.ev(`document.querySelector("[data-addcard]").click()`); await b.sleep(600);
  b.check("addcard: 同句两个「你」只建「你」", !!(await b.ev(F.idbGet("cards", "你"))) && !(await b.ev(F.idbGet("cards", "你你"))));
  await F.closeSheet(b);
  await b.ev(F.tapChar(13, 0)); await b.sleep(400);
  b.check("addcard: 有字没读音不显示加入按钮", !(await b.ev(`!!document.querySelector("[data-addcard]")`)));
  await F.closeSheet(b);

  await b.nav("/");
  await b.ev(`document.querySelector("#btnSettings").click()`); await b.sleep(800);
  const text = await b.ev(F.exportText);
  const obj = JSON.parse(text);
  b.check("backup: v3（带 dataVersion），含 cards 和 meta，不含音频", obj.v === 3 && obj.dataVersion === 4 && obj.cards.length === 3 && Array.isArray(obj.meta) && obj.songs.every(s => !("audio" in s)));
  b.check("settings: 我的生词 3", (await b.ev(`document.querySelector("#wordsN").innerText`)) === "3");
  const restore = F.restoreText;
  await b.ev(F.WIPE); await b.nav("/");
  b.check("backup: 新设备恢复", (await b.ev(restore(text))).includes("已恢复 2 首歌、3 个生词") && (await b.ev(F.idbCount("cards"))) === 3);
  const v1 = { ...obj, v: 1 }; delete v1.cards; delete v1.meta;
  await b.nav("/");
  b.check("backup: v1 备份能恢复，卡片不变", (await b.ev(restore(JSON.stringify(v1)))).includes("3 个生词") && (await b.ev(F.idbCount("cards"))) === 3);
  await b.nav("/");
  b.check("backup: 坏卡片不让恢复中断", (await b.ev(restore(JSON.stringify({ ...obj, cards: [null, { w: "" }, { jp: "x" }] })))).includes("3 个生词"));
  b.check("m1: 页面没有报错", b.errors.length === 0);
} };
