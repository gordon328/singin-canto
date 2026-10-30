// M4a：词汇包 v3——新提示词、导入新格式、只有重点词有下划线、旧词汇包照常。句子都是编的。
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const charCls = (li, ci) => `document.querySelector('#lyrics .line[data-li="${li}"] .c[data-ci="${ci}"]').className`;
const hasW = (li, ci) => `document.querySelector('#lyrics .line[data-li="${li}"] .c[data-ci="${ci}"]').hasAttribute("data-w")`;
async function openPack(b) { await b.ev(click("#btnMenu")); await b.sleep(400); await b.ev(click('[data-menu="pack"]')); await b.sleep(900); } // v0.36 起是整页
// 第 0 句是「我穿風褸出去」
const V3 = JSON.stringify({ summary: "测试大意", fix: [], words: [
  { w: "風褸", jp: "fung1 lau1", zh: "风衣", key: true, tip: "褸读 lau1" },
  { w: "我", jp: "ngo5", zh: "我（测试释义）" },
  { w: "穿", jp: "cyun1", zh: "穿" },
  { w: "出去", jp: "ceot1 heoi3", zh: "出去" }] });
module.exports = { name: "pack", async run(b) {
  await F.seed(b);
  await F.openSong(b, "t1");
  b.check("old-pack-underline", (await b.ev(charCls(0, 2))).includes("key") && (await b.ev(charCls(0, 3))).includes("key"));

  await openPack(b);
  const prompt = await b.ev(`document.querySelector("#promptBox").value`);
  b.check("prompt-v3", prompt.includes("所有") && prompt.includes('"key": true'));
  const sheet = await b.ev(`document.querySelector("#packView").innerText`);
  b.check("pack-sheet-copy", sheet.includes("每个词") && !sheet.includes("挑出这首歌的重点词"));

  await b.ev(`document.querySelector("#packIn").value = ${JSON.stringify(V3)}`);
  await b.ev(click("#doImport")); await b.sleep(1100); // 导入成功回到歌曲页
  b.check("import-v3", (await b.ev(charCls(0, 2))).includes("key") && (await b.ev(charCls(0, 3))).includes("key")
    && !(await b.ev(charCls(0, 0))).includes("key") && await b.ev(hasW(0, 0)) && !(await b.ev(charCls(0, 4))).includes("key"));

  await b.ev(F.tapChar(0, 0)); await b.sleep(500);
  const card = await b.ev(F.sheetText);
  b.check("non-key-word-card", card.includes("我（测试释义）") && !card.includes("不在词汇包的重点词里"));
  await F.closeSheet(b);
  // 第 1 句「第二句測試」不在新词汇包里：提示改成新说法
  await b.ev(F.tapChar(1, 1)); await b.sleep(500);
  b.check("uncovered-char-note", (await b.ev(F.sheetText)).includes("这个字不在词汇包里"));
  await F.closeSheet(b);

  b.check("saved-v3", (await b.ev(F.idbGet("songs", "t1")))?.pack?.v === 3);
  b.check("no-errors", b.errors.length === 0);
} };
