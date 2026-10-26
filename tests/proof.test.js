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
test("clearLineOverrides 不误删 11:0", () => {
  assert.deepEqual(P.clearLineOverrides({ "1:0": "a", "1:3": "b", "2:0": "c", "11:0": "d" }, 1), { "2:0": "c", "11:0": "d" });
});
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
