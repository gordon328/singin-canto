const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../proof.js");
const L = () => [{ t: 1, end: 4, text: "一" }, { t: 4, end: 8, text: "二" }, { t: 8, end: 12, text: "三" }];
test("shiftAll +0.4", () => {
  assert.deepEqual(P.shiftAll(L(), 0.4).map(l => [l.t, l.end]), [[1.4, 4.4], [4.4, 8.4], [8.4, 12.4]]);
});
test("shiftAll 连挪三次 0.2 没有小数误差", () => {
  let x = L(); for (let k = 0; k < 3; k++) x = P.shiftAll(x, 0.2);
  assert.equal(x[0].t, 1.6);
});
test("shiftAll 早于 0 → null", () => { assert.equal(P.shiftAll(L(), -1.2), null); });
test("shiftAll 不修改传入的", () => { const a = L(); P.shiftAll(a, 1); assert.equal(a[0].t, 1); });
test("setStart：改开始时间，上一句 end 跟着变", () => {
  const x = P.setStart(L(), 1, 4.5);
  assert.equal(x[1].t, 4.5); assert.equal(x[0].end, 4.5); assert.equal(x[1].end, 8);
});
test("setStart：不能早于上一句开始 + 0.1", () => { assert.equal(P.setStart(L(), 1, 0.5)[1].t, 1.1); });
test("setStart：不能晚于下一句开始 − 0.1", () => { assert.equal(P.setStart(L(), 1, 9)[1].t, 7.9); });
test("setStart：第一句不能早于 0", () => { assert.equal(P.setStart(L(), 0, -2)[0].t, 0); });
test("setStart：最后一句挪过自己的 end → end = t + 3", () => {
  const x = P.setStart(L(), 2, 20); assert.equal(x[2].t, 20); assert.equal(x[2].end, 23);
});
test("setStart 不修改传入的", () => { const a = L(); P.setStart(a, 1, 5); assert.equal(a[1].t, 4); assert.equal(a[0].end, 4); });
test("fmtT", () => { assert.equal(P.fmtT(51.34), "0:51.3"); assert.equal(P.fmtT(62.06), "1:02.1"); });
test("fmtOffset", () => { assert.equal(P.fmtOffset(0.4), "+0.4s"); assert.equal(P.fmtOffset(-0.2), "−0.2s"); assert.equal(P.fmtOffset(0), "0.0s"); });
test("setStart：前后两句时间几乎一样时不动（顺序不能颠倒）", () => {
  const a = [{ t: 5, end: 5, text: "一" }, { t: 5, end: 5, text: "二" }, { t: 5, end: 9, text: "三" }];
  const x = P.setStart(a, 1, 5.1);
  assert.deepEqual(x.map(l => l.t), [5, 5, 5]); assert.equal(x[0].end, 5);
});
test("setStart：不会出现负数时间", () => {
  const x = P.setStart([{ t: 0, end: 0.05, text: "一" }, { t: 0.05, end: 3, text: "二" }], 0, 0);
  assert.ok(x[0].t >= 0); assert.ok(x[0].t <= x[1].t);
});

// ---- 编辑歌曲：插入、拆开、合并、删除，以及保存时的行号重映射 ----
const S = () => [{ t: 1, end: 4, text: "一二三" }, { t: 4, end: 8, text: "四五六" }, { t: 8, end: 12, text: "七八九" }];
const E = () => P.toEdit(S(), { "0:1": "ji2", "1:0": "sei2", "1:2": "luk2", "2:2": "gau1" }, [0, 1]);
test("toEdit：每句带上自己的手动读音、学会状态、原来的行号", () => {
  const x = E();
  assert.deepEqual(x[1], { t: 4, end: 8, text: "四五六", orig: "四五六", ov: { 0: "sei2", 2: "luk2" }, learned: true, srcs: [1] });
  assert.equal(x[2].learned, false);
});
test("toSong：没改动时原样还回去", () => {
  const r = P.toSong(E());
  assert.deepEqual(r.lines, S());
  assert.deepEqual(r.overrides, { "0:1": "ji2", "1:0": "sei2", "1:2": "luk2", "2:2": "gau1" });
  assert.deepEqual(r.learned, [0, 1]);
  assert.deepEqual(r.map, { 0: 0, 1: 1, 2: 2 });
});
test("insertAfter：新句放在这句和下一句开始时间的中间，后面的行号 +1", () => {
  const x = P.insertAfter(E(), 0);
  assert.equal(x.length, 4); assert.equal(x[1].t, 2.5); assert.equal(x[1].end, 4); assert.equal(x[0].end, 2.5);
  assert.equal(x[1].text, ""); assert.equal(x[1].learned, false);
  x[1].text = "新句";
  const r = P.toSong(x);
  assert.deepEqual(r.overrides, { "0:1": "ji2", "2:0": "sei2", "2:2": "luk2", "3:2": "gau1" });
  assert.deepEqual(r.learned, [0, 2]); assert.deepEqual(r.map, { 0: 0, 1: 2, 2: 3 });
});
test("insertAfter：最后一句后面插入，放在它开始和结束的中间", () => {
  const x = P.insertAfter(E(), 2); assert.equal(x[3].t, 10); assert.equal(x[3].end, 12); assert.equal(x[2].end, 10);
});
test("split：在光标处拆开，第二句时间取中间，读音按位置分开，都继承学会", () => {
  const x = P.split(E(), 1, 2);
  assert.deepEqual(x.map(l => [l.t, l.end, l.text]), [[1, 4, "一二三"], [4, 6, "四五"], [6, 8, "六"], [8, 12, "七八九"]]);
  const r = P.toSong(x);
  assert.deepEqual(r.overrides, { "0:1": "ji2", "1:0": "sei2", "2:0": "luk2", "3:2": "gau1" });
  assert.deepEqual(r.learned, [0, 1, 2]); assert.deepEqual(r.map, { 0: 0, 1: 1, 2: 3 });
});
test("split：去掉切口两边的空格，字序号跟着挪", () => {
  const x = P.split(P.toEdit([{ t: 0, end: 2, text: "甲 乙丙" }], { "0:3": "bing2" }, []), 0, 1);
  assert.deepEqual(x.map(l => l.text), ["甲", "乙丙"]);
  assert.deepEqual(P.toSong(x).overrides, { "1:1": "bing2" });
});
test("split：光标在最前或最后 → null", () => {
  assert.equal(P.split(E(), 1, 0), null); assert.equal(P.split(E(), 1, 3), null);
});
test("split：改过文字的句子，拆开后手动读音清掉", () => {
  const x = E(); x[1].text = "四五六七";
  assert.deepEqual(P.toSong(P.split(x, 1, 2)).overrides, { "0:1": "ji2", "3:2": "gau1" });
});
test("mergeUp：文字中间加空格，时间取上一句开始、这句结束，读音往后挪", () => {
  const x = P.mergeUp(E(), 2);
  assert.deepEqual(x.map(l => [l.t, l.end, l.text]), [[1, 4, "一二三"], [4, 12, "四五六 七八九"]]);
  const r = P.toSong(x);
  assert.deepEqual(r.overrides, { "0:1": "ji2", "1:0": "sei2", "1:2": "luk2", "1:6": "gau1" });
  assert.deepEqual(r.learned, [0]);  // 第 3 句没学会，合并后不算学会
  assert.deepEqual(r.map, { 0: 0, 1: 1, 2: 1 });
});
test("mergeUp：两句都学会了，合并后算学会", () => { assert.deepEqual(P.toSong(P.mergeUp(E(), 1)).learned, [0]); });
test("remove：上一句结束时间延长，行号往前挪，删掉的句子的读音和学会都不要了", () => {
  const x = P.remove(E(), 1);
  assert.deepEqual(x.map(l => [l.t, l.end]), [[1, 8], [8, 12]]);
  const r = P.toSong(x);
  assert.deepEqual(r.overrides, { "0:1": "ji2", "1:2": "gau1" }); assert.deepEqual(r.learned, [0]); assert.deepEqual(r.map, { 0: 0, 2: 1 });
});
test("remove：只剩一句时不能删 → null", () => { assert.equal(P.remove(P.toEdit([{ t: 0, end: 1, text: "一" }], {}, []), 0), null); });
test("连着做：插入 → 拆开 → 合并 → 删除，行号都对得上", () => {
  let x = P.insertAfter(E(), 2); x[3].text = "十";          // 一二三 | 四五六 | 七八九 | 十
  x = P.split(x, 0, 1);                                      // 一 | 二三 | 四五六 | 七八九 | 十
  x = P.mergeUp(x, 3);                                       // 一 | 二三 | 四五六 七八九 | 十
  x = P.remove(x, 0);                                        // 二三 | 四五六 七八九 | 十
  const r = P.toSong(x);
  assert.deepEqual(r.lines.map(l => l.text), ["二三", "四五六 七八九", "十"]);
  assert.deepEqual(r.overrides, { "0:0": "ji2", "1:0": "sei2", "1:2": "luk2", "1:6": "gau1" });
  assert.deepEqual(r.learned, [0]);
  assert.deepEqual(r.map, { 1: 1, 2: 1 });
});
test("toSong：按开始时间排序，结束时间不晚于下一句开始；文字去掉首尾空格", () => {
  const x = E(); x[0].t = 9; x[0].end = 15; x[2].text = " 七八九 ";
  const r = P.toSong(x);
  assert.deepEqual(r.lines.map(l => [l.t, l.end, l.text]), [[4, 8, "四五六"], [8, 9, "七八九"], [9, 15, "一二三"]]);
  assert.deepEqual(r.map, { 0: 2, 1: 0, 2: 1 });
  assert.deepEqual(r.overrides, { "2:1": "ji2", "0:0": "sei2", "0:2": "luk2" }); // 第 3 句改过（加了空格），读音清掉
});
test("编辑函数都不修改传入的数组", () => {
  const x = E(), snap = JSON.stringify(x);
  P.insertAfter(x, 0); P.split(x, 1, 1); P.mergeUp(x, 1); P.remove(x, 1); P.toSong(x);
  assert.equal(JSON.stringify(x), snap);
});
test("mergeUp：合并到空的一句（比如刚插入的），手动读音不错位，学会状态跟着有字的那句", () => {
  let x = P.insertAfter(E(), 0);            // 一二三 | (空) | 四五六 | 七八九
  x = P.mergeUp(x, 2);                       // 一二三 | 四五六 | 七八九
  assert.equal(x[1].text, "四五六");
  const r = P.toSong(x);
  assert.deepEqual(r.overrides, { "0:1": "ji2", "1:0": "sei2", "1:2": "luk2", "2:2": "gau1" });
  assert.deepEqual(r.learned, [0, 1]);
});
