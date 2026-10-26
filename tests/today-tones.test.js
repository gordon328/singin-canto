const test = require("node:test");
const assert = require("node:assert/strict");
const SRS = require("../srs.js");
const L = require("../lessons.js");
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
test("today：凌晨 4 点前算前一天", () => {
  assert.equal(SRS.today(at(2026, 10, 27, 3, 59)), "2026-10-26");
  assert.equal(SRS.today(at(2026, 10, 27, 4, 0)), "2026-10-27");
});
test("today：跨月、补零", () => {
  assert.equal(SRS.today(at(2026, 11, 1, 1)), "2026-10-31");
  assert.equal(SRS.today(at(2026, 3, 5, 12)), "2026-03-05");
});
test("TONE_SETS：8 组，顺序和内容照抄规格", () => {
  assert.deepEqual(L.TONE_SETS.map(s => s.syl), ["si", "fu", "fan", "ji", "jau", "wai", "jan", "seoi"]);
  assert.deepEqual(L.TONE_SETS[0].chars, ["詩", "史", "試", "時", "市", "事"]);
  assert.deepEqual(L.TONE_SETS[4].chars, ["優", "柚", "幼", "油", "友", "又"]);
  assert.deepEqual(L.TONE_SETS[7].chars, ["雖", "水", "歲", "誰", "緒", "睡"]);
});
test("toneSetFor：没有记录 → 第 0 组", () => {
  assert.deepEqual(L.toneSetFor(undefined, "2026-10-27"), { key: "tones", setIndex: 0, date: "2026-10-27" });
  assert.deepEqual(L.toneSetFor({ key: "tones", setIndex: "x" }, "2026-10-27").setIndex, 0);
  assert.deepEqual(L.toneSetFor({ key: "tones", setIndex: 9, date: "2026-10-26" }, "2026-10-27").setIndex, 0);
});
test("toneSetFor：同一天不变，新的一天 +1，7 之后回到 0", () => {
  assert.equal(L.toneSetFor({ key: "tones", setIndex: 3, date: "2026-10-27" }, "2026-10-27").setIndex, 3);
  assert.deepEqual(L.toneSetFor({ key: "tones", setIndex: 3, date: "2026-10-26" }, "2026-10-27"), { key: "tones", setIndex: 4, date: "2026-10-27" });
  assert.equal(L.toneSetFor({ key: "tones", setIndex: 7, date: "2026-10-26" }, "2026-10-27").setIndex, 0);
});
