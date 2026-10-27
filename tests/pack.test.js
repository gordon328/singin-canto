// 词汇包 v3（规格第 4 节）：提示词、导入、算每句的字和词。句子都是编的，不是真实歌词。
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../pack.js");

const auto = t => [...t].map(c => [c, "x1"]);
const lines = [{ t: 1, end: 3, text: "我哋去飲茶" }, { t: 3, end: 5, text: "佢唔去" }];
const V3 = { summary: "大意", fix: [], words: [
  { w: "我哋", jp: "ngo5 dei6", zh: "我们", key: true, tip: "哋表示复数", oral: true },
  { w: "去", jp: "heoi3", zh: "去" },
  { w: "飲茶", jp: "jam2 caa4", zh: "喝早茶", key: true, tip: "饮读 jam2" },
  { w: "佢", jp: "keoi5", zh: "他", key: true, oral: true, tip: "口语" },
  { w: "唔", jp: "m4", zh: "不", oral: true }] };
const v3 = JSON.stringify(V3);
const byW = pack => Object.fromEntries(pack.words.map(w => [w.w, w]));
const strip = r => ({ ...r, pack: r.pack && { ...r.pack, imported: 0 } });

test("parsePack: 新格式只有写了 key:true 的是重点词", () => {
  const r = P.parsePack(v3, lines);
  assert.deepEqual(r.errs, []);
  assert.equal(r.pack.v, 3);
  const m = byW(r.pack);
  assert.equal(m["去"].key, false); assert.equal(m["唔"].key, false);
  assert.equal(m["我哋"].key, true); assert.equal(m["飲茶"].key, true); assert.equal(m["佢"].key, true);
  assert.equal(m["唔"].zh, "不"); assert.equal(m["唔"].oral, true);
});

test("parsePack: 旧格式（整包没有 key 字段）全部当重点词", () => {
  const old = { ...V3, words: V3.words.map(({ key, ...w }) => w) };
  const r = P.parsePack(JSON.stringify(old), lines);
  assert.ok(r.pack.words.every(w => w.key === true));
  assert.ok(!r.warns.some(x => x.includes("没有标出重点词")));
});

test("parsePack: 新格式忘了写 key", () => {
  const chars = [..."一二三四五六七八九十百千萬億甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥春夏秋冬東南西北上下左右前後天地日月山水火木金土風雲雨雪花草"].slice(0, 65);
  assert.equal(new Set(chars).size, 65);
  const r = P.parsePack(JSON.stringify({ summary: "", fix: [], words: chars.map(c => ({ w: c, jp: "", zh: c })) }), [{ t: 0, end: 1, text: chars.join("") }]);
  assert.ok(r.pack.words.every(w => w.key === true));
  assert.ok(r.warns.some(x => x.includes("没有标出重点词")));
});

test("parsePack: 重复的词合并", () => {
  const r = P.parsePack(JSON.stringify({ words: [{ w: "去", zh: "去" }, { w: "去", key: true, tip: "提示" }, { w: "我哋", zh: "我们" }] }), lines);
  const gos = r.pack.words.filter(w => w.w === "去");
  assert.equal(gos.length, 1);
  assert.equal(gos[0].key, true); assert.equal(gos[0].tip, "提示"); assert.equal(gos[0].zh, "去");
});

test("parsePack: 带代码块和前后说明也能读", () => {
  const r = P.parsePack("好的，词汇包如下：\n```json\n" + v3 + "\n```\n希望有帮助", lines);
  assert.deepEqual(strip(r), strip(P.parsePack(v3, lines)));
});

test("parsePack: 没被覆盖的字给提醒", () => {
  const r = P.parsePack(JSON.stringify({ words: [{ w: "我哋", key: true, zh: "我们" }] }), lines);
  assert.ok(r.warns.some(x => x.includes("5 个字没被词汇包覆盖")), r.warns.join("|"));
  assert.ok(!P.parsePack(v3, lines).warns.some(x => x.includes("没被词汇包覆盖")));
});

test("parsePack: 原有的报错照旧", () => {
  assert.match(P.parsePack("", lines).errs[0], /没找到 JSON/);
  assert.match(P.parsePack('{"words":', lines).errs[0], /没找到 JSON|JSON 格式有误/);
  assert.match(P.parsePack('{"words": [}', lines).errs[0], /JSON 格式有误/);
  assert.match(P.parsePack('{"summary":"x"}', lines).errs[0], /缺少 words/);
  const r = P.parsePack(JSON.stringify({ words: [{ w: "飲茶", jp: "jam2", key: true }] }), lines);
  assert.ok(r.warns.some(x => x.includes("改用自动粤拼")));
  assert.equal(r.pack.words[0].jp, "");
});

test("computeLineFor: 长词优先、只有 key 词带 key", () => {
  const song = { lines, pack: P.parsePack(v3, lines).pack, overrides: {} };
  const { items, words } = P.computeLineFor(song, 0, auto);
  assert.equal(words[items[0].word].w, "我哋"); assert.equal(items[1].word, items[0].word);
  assert.equal(words[items[2].word].w, "去");
  assert.equal(words[items[2].word].key, false);
  assert.equal(items[0].jp, "ngo5"); assert.equal(items[1].jp, "dei6");
});

test("computeLineFor: overrides 和 fix 照旧", () => {
  const pack = { ...P.parsePack(v3, lines).pack, fix: [{ from: "飲茶", to: "飲咖啡" }] };
  const r = P.computeLineFor({ lines, pack, overrides: { "0:0": "ngo4" } }, 0, auto);
  assert.equal(r.text, "我哋去飲咖啡");
  assert.equal(r.items[0].jp, "ngo4"); assert.equal(r.items[0].ov, true);
  assert.equal(P.fixText({ pack }, "飲茶"), "飲咖啡");
  assert.equal(P.fixText({ pack: null }, "飲茶"), "飲茶");
});

test("computeLineFor: 没有词汇包", () => {
  const r = P.computeLineFor({ lines, pack: null, overrides: {} }, 1, auto);
  assert.ok(r.items.every(it => it.word === -1 && it.jp === "x1"));
});

test("buildPrompt: 包含新要求", () => {
  const p = P.buildPrompt({ title: "測試歌", artist: "某人", lines });
  for (const s of ["所有", '"key": true', "顺序随意", "不要按歌词顺序", "不要输出完整歌词", "測試歌", "我哋去飲茶", "佢唔去"]) assert.ok(p.includes(s), s);
  assert.ok(!p.includes("30 到 50 个值得学的词"));
});
