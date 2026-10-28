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
  assert.deepEqual(S.dailyFor({ key: "daily", goal: 2, date: "2026-10-27", newLines: 2, extra: 2, reviewed: 9, songId: "t1", done: [3] }, "2026-10-28"),
    { key: "daily", goal: 2, date: "2026-10-28", newLines: 0, extra: 0, reviewed: 0, songId: null, done: [] });
});

test("dailyFor: 同一天不变", () => {
  const r = { key: "daily", goal: 7, date: "2026-10-28", newLines: 3, extra: 2, reviewed: 9, songId: "t1", done: [3, 4] };
  assert.deepEqual(S.dailyFor(r, "2026-10-28"), r);
});

test("dailyFor: 凌晨 4 点前还是同一天", () => {
  const today = SRS.today(new Date(2026, 9, 29, 2, 30).getTime());
  assert.equal(today, "2026-10-28");
  assert.equal(S.dailyFor({ key: "daily", goal: 4, date: "2026-10-28", newLines: 3, extra: 0, reviewed: 0 }, today).newLines, 3);
});

test("mergeDaily: 恢复备份时用备份里的 goal，今天的计数留本机的", () => {
  const local = { key: "daily", goal: 4, date: "2026-10-28", newLines: 2, extra: 0, reviewed: 5 };
  assert.deepEqual(S.mergeDaily(local, { key: "daily", goal: 7, date: "2026-10-20", newLines: 9, extra: 2, reviewed: 1 }, "2026-10-28"),
    { key: "daily", goal: 7, date: "2026-10-28", newLines: 2, extra: 0, reviewed: 5, songId: null, done: [] });
  assert.equal(S.mergeDaily(local, { key: "daily", goal: 99 }, "2026-10-28").goal, 4);
  assert.equal(S.mergeDaily(undefined, { key: "daily", goal: 6, date: "2026-10-28", newLines: 3 }, "2026-10-28").newLines, 3);
  assert.equal(S.mergeDaily({ ...local, date: "2026-10-27" }, { key: "daily", goal: 6, date: "2026-10-28", newLines: 3 }, "2026-10-28").newLines, 3);
});

test("dailyFor: 没有记录", () => {
  assert.deepEqual(S.dailyFor(undefined, "2026-10-28"), { key: "daily", goal: 4, date: "2026-10-28", newLines: 0, extra: 0, reviewed: 0, songId: null, done: [] });
});

// ---------- M4b：学习规则 ----------
const P = require("../pack.js");
const auto = t => [...t].map(c => [c, c === "𪚥" ? null : "x1"]);
const L = (text, words = [], overrides = {}) => P.computeLineFor({ lines: [{ t: 0, end: 1, text }], pack: { words, fix: [] }, overrides }, 0, auto);
const brief = us => us.map(u => ({ w: u.w, jp: u.jp, pack: u.word !== null }));

test("lineUnits: 按词、单字、去重、跳过标点", () => {
  const us = S.lineUnits(L("我哋去，我哋", [{ w: "我哋", jp: "ngo5 dei6", key: true, zh: "我们" }]));
  assert.deepEqual(brief(us), [{ w: "我哋", jp: "ngo5 dei6", pack: true }, { w: "去", jp: "x1", pack: false }]);
  assert.deepEqual(us[0].chars, [{ ch: "我", jp: "ngo5" }, { ch: "哋", jp: "dei6" }]);
  assert.equal(us[0].word.zh, "我们");
});

test("lineUnits: 挨着的同一个词拆开、去重", () => {
  assert.deepEqual(brief(S.lineUnits(L("好好", [{ w: "好", jp: "hou2" }]))), [{ w: "好", jp: "hou2", pack: true }]);
});

test("lineUnits: 没读音的字跳过", () => {
  assert.deepEqual(S.lineUnits(L("𪚥去")).map(u => u.w), ["去"]);
});

test("lineUnits: overrides 的读音", () => {
  assert.equal(S.lineUnits(L("我哋", [{ w: "我哋", jp: "ngo5 dei6" }], { "0:0": "ngo4" }))[0].jp, "ngo4 dei6");
});

test("nextLine", () => {
  const texts = ["甲乙", "丙丁", "甲乙", "...", "戊"];
  assert.deepEqual(S.nextLine(texts, [0]), { li: 1, skip: [] });
  assert.deepEqual(S.nextLine(texts, [0, 1]), { li: 4, skip: [2, 3] });
  assert.deepEqual(S.nextLine(texts, [0, 1, 2, 3, 4]), { li: null, skip: [] });
  assert.deepEqual(S.nextLine(["甲乙", "甲乙"], []), { li: 0, skip: [] });
  assert.deepEqual(S.nextLine([" 甲乙", "甲乙 "], [0]), { li: null, skip: [1] });
});

test("upcoming", () => {
  assert.deepEqual(S.upcoming(["甲乙", "丙丁", "甲乙", "...", "戊"], [], 3), [0, 1, 4]);
  assert.deepEqual(S.upcoming(["甲"], [0], 3), []);
});

test("remaining", () => {
  assert.equal(S.remaining({ goal: 4, extra: 2, newLines: 5 }), 1);
  assert.equal(S.remaining({ goal: 4, extra: 0, newLines: 6 }), 0);
});

test("dueCount", () => {
  const c = (due, known = false) => ({ known, srs: { due } });
  const cs = [c(1), c(2), c(3), c(999), c(1, true)];
  assert.equal(S.dueCount(cs, 10), 3);
  assert.equal(S.dueCount(cs, 10, 2), 2);
});
