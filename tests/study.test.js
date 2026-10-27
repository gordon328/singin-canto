// progress 和 daily 的规则（规格 3.3、3.4、3.5、5.7）
const test = require("node:test");
const assert = require("node:assert/strict");
const SRS = require("../srs.js");
const S = require("../study.js");
const song = (id, progress, created = 1, n = 3) => ({ id, created, progress, lines: Array.from({ length: n }, (_, i) => ({ t: i, end: i + 1, text: "句" })) });

test("progressOf: 没有 progress", () => {
  assert.deepEqual(S.progressOf(song("a")), { learned: [], current: false });
  assert.deepEqual(S.progressOf(song("a", "x")), { learned: [], current: false });
});

test("progressOf: 清理 learned", () => {
  assert.deepEqual(S.progressOf(song("a", { learned: [2, 0, 2, "1", -1, 5, 1.5] })).learned, [0, 2]);
  assert.equal(S.progressOf(song("a", { learned: [], current: true })).current, true);
});

test("withLearned: 不改原对象", () => {
  const s = song("a", { learned: [0, 2], current: true });
  assert.deepEqual(S.withLearned(s, 1), { learned: [0, 1, 2], current: true });
  assert.deepEqual(s.progress.learned, [0, 2]);
});

test("mergeProgress", () => {
  assert.deepEqual(S.mergeProgress({ learned: [0, 1], current: true }, { learned: [1, 3], current: false }, 5), { learned: [0, 1, 3], current: true });
  assert.deepEqual(S.mergeProgress(undefined, { learned: [2] }, 5), { learned: [2], current: false });
  assert.deepEqual(S.mergeProgress({ learned: [0] }, undefined, 5), { learned: [0], current: false });
  assert.deepEqual(S.mergeProgress({ learned: [0] }, { learned: [9] }, 5).learned, [0]);
});

test("currentSong", () => {
  const A = song("A", { learned: [], current: false }, 5), B = song("B", { learned: [], current: true }, 1), C = song("C", undefined, 9);
  assert.equal(S.currentSong([A, B, C]).id, "B");
  assert.equal(S.currentSong([A, C]).id, "C");
  assert.equal(S.currentSong([]), null);
});

test("setCurrent", () => {
  const A = song("A", { learned: [1], current: true }), B = song("B");
  const ch = S.setCurrent([A, B], "B");
  assert.equal(ch.length, 2);
  const m = Object.fromEntries(ch.map(s => [s.id, s]));
  assert.deepEqual(m.A.progress, { learned: [1], current: false });
  assert.deepEqual(m.B.progress, { learned: [], current: true });
  assert.equal(A.progress.current, true);
  assert.deepEqual(S.setCurrent([m.A, m.B], "B"), []);
});

test("goalOf", () => {
  for (const g of [6, 7, 1, 20]) assert.equal(S.goalOf({ goal: g }), g);
  for (const d of [{ goal: 0 }, { goal: 21 }, { goal: 2.5 }, undefined, { goal: "7" }]) assert.equal(S.goalOf(d), 4);
  assert.deepEqual([S.GOALS, S.GOAL_MIN, S.GOAL_MAX, S.DEFAULT_GOAL], [[2, 4, 6], 1, 20, 4]);
});

test("dailyFor: 新的一天清零但保留 goal", () => {
  assert.deepEqual(S.dailyFor({ key: "daily", goal: 2, date: "2026-10-27", newLines: 2, extra: 2, reviewed: 9 }, "2026-10-28"),
    { key: "daily", goal: 2, date: "2026-10-28", newLines: 0, extra: 0, reviewed: 0 });
});

test("dailyFor: 同一天不变", () => {
  const r = { key: "daily", goal: 7, date: "2026-10-28", newLines: 3, extra: 2, reviewed: 9 };
  assert.deepEqual(S.dailyFor(r, "2026-10-28"), r);
});

test("dailyFor: 凌晨 4 点前还是同一天", () => {
  const today = SRS.today(new Date(2026, 9, 29, 2, 30).getTime());
  assert.equal(today, "2026-10-28");
  assert.equal(S.dailyFor({ key: "daily", goal: 4, date: "2026-10-28", newLines: 3, extra: 0, reviewed: 0 }, today).newLines, 3);
});

test("dailyFor: 没有记录", () => {
  assert.deepEqual(S.dailyFor(undefined, "2026-10-28"), { key: "daily", goal: 4, date: "2026-10-28", newLines: 0, extra: 0, reviewed: 0 });
});
