const test = require("node:test");
const assert = require("node:assert/strict");
const SRS = require("../srs.js");
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const st = (o) => ({ due: 0, interval: 0, ease: 2.5, reps: 0, lapses: 0, ...o });

test("newSrs：明天凌晨 4 点到期，reps=1", () => {
  assert.deepEqual(SRS.newSrs(at(2026, 10, 27, 12)), { due: at(2026, 10, 28, 4), interval: 1, ease: 2.5, reps: 1, lapses: 0 });
});
test("newSrs：晚上 11 点建卡 → 第二天凌晨 4 点", () => {
  assert.equal(SRS.newSrs(at(2026, 10, 27, 23)).due, at(2026, 10, 28, 4));
});
test("newSrs：凌晨 2 点建卡（还算前一天）→ 当天凌晨 4 点，显示明天", () => {
  const now = at(2026, 10, 27, 2);
  assert.equal(SRS.newSrs(now).due, at(2026, 10, 27, 4));
  assert.equal(SRS.dueLabel(SRS.newSrs(now).due, now), "明天");
});
test("新卡连续记得 → 3、8、20 天", () => {
  const now = at(2026, 10, 27, 12);
  let s = SRS.review(SRS.newSrs(now), "good", now);
  assert.equal(s.interval, 3); assert.equal(s.reps, 2); assert.equal(s.due, at(2026, 10, 30, 4));
  s = SRS.review(s, "good", now); assert.equal(s.interval, 8);
  s = SRS.review(s, "good", now); assert.equal(s.interval, 20); assert.equal(s.reps, 4);
});
test("reps=0 时记得 → 1 天", () => {
  assert.equal(SRS.review(st({}), "good", 0).interval, 1);
});
test("忘了 → 10 分钟后、ease 降 0.2、reps 清零", () => {
  const now = at(2026, 10, 27, 12);
  const s = SRS.review(st({ interval: 8, reps: 3 }), "again", now);
  assert.deepEqual(s, { due: now + 10 * 60000, interval: 0, ease: 2.3, reps: 0, lapses: 1 });
});
test("ease 最低 1.3", () => {
  assert.equal(SRS.review(st({ ease: 1.35 }), "again", 0).ease, 1.3);
});
test("模糊：reps=0 → 1 天；否则 interval×1.2 四舍五入，reps 不变", () => {
  const now = at(2026, 10, 27, 12);
  assert.equal(SRS.review(st({}), "hard", now).interval, 1);
  const s = SRS.review(st({ interval: 8, reps: 2 }), "hard", now);
  assert.equal(s.interval, 10); assert.equal(s.reps, 2); assert.ok(Math.abs(s.ease - 2.35) < 1e-9);
});
test("interval 上限 365 天", () => {
  assert.equal(SRS.review(st({ interval: 300, reps: 5 }), "good", at(2026, 10, 27)).interval, 365);
});
test("不修改传入对象", () => {
  const input = Object.freeze(st({ interval: 3, reps: 2 }));
  SRS.review(input, "good", 0); SRS.review(input, "again", 0); SRS.review(input, "hard", 0);
});
test("未知 grade 报错", () => {
  assert.throws(() => SRS.review(st({}), "easy", 0));
});

test("newCard 结构", () => {
  const c = SRS.newCard({ w: "風褸", jp: "fung1 lau1", zh: "风衣", tip: "t", oral: 0 }, { songId: "s1", li: 3 }, 500);
  assert.deepEqual(c, { w: "風褸", jp: "fung1 lau1", zh: "风衣", tip: "t", oral: false,
    sources: [{ songId: "s1", li: 3 }], known: false, srs: SRS.newSrs(500), created: 500, updated: 500 });
  const bare = SRS.newCard({ w: "嘅", jp: "ge3" }, null, 1);
  assert.deepEqual(bare.sources, []); assert.equal(bare.zh, ""); assert.equal(bare.tip, "");
});
test("dueLabel：凌晨 4 点换日", () => {
  const now = at(2026, 10, 27, 22);
  assert.equal(SRS.dueLabel(now - 1, now), "今天");
  assert.equal(SRS.dueLabel(at(2026, 10, 27, 23), now), "今天");
  assert.equal(SRS.dueLabel(at(2026, 10, 28, 4), now), "明天");
  assert.equal(SRS.dueLabel(at(2026, 10, 30, 4), now), "3 天后");
  assert.equal(SRS.dueLabel(at(2026, 10, 28, 4), at(2026, 10, 28, 2)), "明天");
  assert.equal(SRS.dueLabel(SRS.newSrs(now).due, now), "明天");
});
const card = (w, reps, updated, sources) => ({ w, jp: "x1", zh: "", tip: "", oral: false, known: false,
  sources, srs: { due: 0, interval: 0, ease: 2.5, reps, lapses: 0 }, created: 0, updated });
test("mergeCards：incoming 不是数组 → 本机卡片不变", () => {
  const local = [card("甲", 1, 1, [])];
  assert.deepEqual(SRS.mergeCards(local, undefined, 0), local);
});
test("mergeCards：reps 大的胜出，sources 并集去重", () => {
  const out = SRS.mergeCards([card("甲", 1, 9, [{ songId: "a", li: 1 }])],
    [card("甲", 2, 1, [{ songId: "a", li: 1 }, { songId: "b", li: 0 }])], 0);
  assert.equal(out.length, 1); assert.equal(out[0].srs.reps, 2);
  assert.deepEqual(out[0].sources, [{ songId: "a", li: 1 }, { songId: "b", li: 0 }]);
});
test("mergeCards：reps 相同 → updated 新的胜出；新词直接加入", () => {
  const out = SRS.mergeCards([card("甲", 1, 1, [])], [card("甲", 1, 5, []), card("乙", 0, 0, [])], 0);
  assert.equal(out.find(c => c.w === "甲").updated, 5);
  assert.ok(out.find(c => c.w === "乙"));
});
test("mergeCards：坏卡片跳过或补齐", () => {
  const out = SRS.mergeCards([], [null, { jp: "x" }, { w: "" }, { w: "丙", jp: "bing2", sources: "坏" }], 77);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].srs, SRS.newSrs(77)); assert.deepEqual(out[0].sources, []);
});
test("dayDue：导出", () => {
  assert.equal(SRS.dayDue(at(2026, 10, 28, 10), 1), at(2026, 10, 29, 4));
});
