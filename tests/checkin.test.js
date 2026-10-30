const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../checkin.js");
const rec = (o) => ({ ...C.fresh("2026-10-30"), ...o });

test("addDays / weekday", () => {
  assert.equal(C.addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(C.addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(C.weekday("2026-10-26"), 1);
  assert.equal(C.weekday("2026-11-01"), 7);
});
test("isoWeek", () => {
  assert.equal(C.isoWeek("2026-10-30"), "2026-W44");
  assert.equal(C.isoWeek("2026-10-26"), "2026-W44");
  assert.equal(C.isoWeek("2026-11-02"), "2026-W45");
  assert.equal(C.isoWeek("2027-01-01"), "2026-W53");
  assert.equal(C.isoWeek("2027-01-04"), "2027-W01");
});
test("fresh", () => {
  const r = C.fresh("2026-10-30");
  assert.equal(r.restTokens, 1);
  assert.equal(r.lastProcessed, "2026-10-29");
  assert.equal(r.lastTokenWeek, "2026-W44");
});
test("qualifies", () => {
  assert.equal(C.qualifies({ due: 0, newLines: 4, goal: 4, finished: false }), true);
  assert.equal(C.qualifies({ due: 1, newLines: 4, goal: 4, finished: false }), false);
  assert.equal(C.qualifies({ due: 0, newLines: 2, goal: 4, finished: true }), true);
  assert.equal(C.qualifies({ due: 0, newLines: 2, goal: 4, finished: false }), false);
});
test("markDone：第一次 / 同一天第二次", () => {
  const a = C.markDone(C.fresh("2026-10-30"), "2026-10-30", { reviewed: 3, newLines: 4, newWords: 5 });
  assert.equal(a.first, true);
  assert.equal(a.rec.days["2026-10-30"].type, "done");
  const b = C.markDone(a.rec, "2026-10-30", { reviewed: 9, newLines: 6, newWords: 8 });
  assert.equal(b.first, false);
  assert.equal(b.rec.days["2026-10-30"].reviewed, 9);
  assert.equal(C.total(b.rec), 1);
  assert.equal(b.rec.bestStreak, 1);
});
test("process：漏一天用一张", () => {
  const r = rec({ days: { "2026-10-30": { type: "done" } }, restTokens: 1, lastProcessed: "2026-10-30", lastTokenWeek: "2026-W44" });
  const p = C.process(r, "2026-11-01");
  assert.equal(p.used, 1);
  assert.deepEqual(p.rec.days["2026-10-31"], { type: "rest" });
  assert.equal(p.rec.restTokens, 0);
  assert.equal(C.streak(p.rec, "2026-11-01"), 2);
  assert.equal(C.total(p.rec), 1);
  assert.equal(r.restTokens, 1);
  assert.equal(r.days["2026-10-31"], undefined);
});
test("process：漏的比卡多", () => {
  const r = rec({ days: { "2026-10-25": { type: "done" } }, restTokens: 2, lastProcessed: "2026-10-25", lastTokenWeek: "2026-W44" });
  const p = C.process(r, "2026-10-31");
  assert.equal(p.used, 0);
  assert.equal(p.rec.restTokens, 2);
  assert.equal(C.streak(p.rec, "2026-10-31"), 0);
});
test("process：连续 0 不用卡", () => {
  const r = rec({ days: {}, restTokens: 1, lastProcessed: "2026-10-29", lastTokenWeek: "2026-W44" });
  const p = C.process(r, "2026-10-31");
  assert.equal(p.used, 0);
  assert.equal(p.rec.restTokens, 1);
});
test("process：周一发卡、最多 3 张", () => {
  const a = C.process(rec({ restTokens: 1, lastTokenWeek: "2026-W44", lastProcessed: "2026-11-01" }), "2026-11-02");
  assert.equal(a.rec.restTokens, 2);
  assert.equal(a.rec.lastTokenWeek, "2026-W45");
  const b = C.process(rec({ restTokens: 3, lastTokenWeek: "2026-W44", lastProcessed: "2026-11-01" }), "2026-11-02");
  assert.equal(b.rec.restTokens, 3);
});
test("process：先发卡再用", () => {
  const r = rec({ days: { "2026-11-01": { type: "done" } }, restTokens: 0, lastProcessed: "2026-11-01", lastTokenWeek: "2026-W44" });
  const p = C.process(r, "2026-11-03");
  assert.equal(p.rec.days["2026-11-02"].type, "rest");
  assert.equal(p.used, 1);
  assert.equal(p.rec.restTokens, 0);
});
test("process：三周没开", () => {
  const r = rec({ days: { "2026-10-30": { type: "done" } }, restTokens: 0, lastProcessed: "2026-10-30", lastTokenWeek: "2026-W44" });
  const p = C.process(r, "2026-11-20");
  assert.equal(p.rec.restTokens, 3);
  assert.equal(p.used, 0);
  assert.equal(C.streak(p.rec, "2026-11-20"), 0);
});
test("process：同一天调两次不变", () => {
  const r = rec({ days: { "2026-10-30": { type: "done" } }, restTokens: 1, lastProcessed: "2026-10-30", lastTokenWeek: "2026-W44" });
  const p1 = C.process(r, "2026-11-01");
  const p2 = C.process(p1.rec, "2026-11-01");
  assert.equal(p2.used, 0);
  assert.deepEqual(p2.rec, p1.rec);
});
test("streak：今天没打卡从昨天数", () => {
  const r = rec({ days: { "2026-10-28": { type: "done" }, "2026-10-29": { type: "done" } } });
  assert.equal(C.streak(r, "2026-10-30"), 2);
  r.days["2026-10-30"] = { type: "done" };
  assert.equal(C.streak(r, "2026-10-30"), 3);
});
test("dayState：不按学习量分深浅，只分打卡 / 多学了 / 休息日", () => {
  assert.equal(C.dayState({ type: "done", newWords: 1, reviewed: 0 }), "done");
  assert.equal(C.dayState({ type: "done", newWords: 60, reviewed: 60 }), "done");
  assert.equal(C.dayState({ type: "done", newWords: 2, reviewed: 0, more: true }), "more");
  assert.equal(C.dayState({ type: "rest" }), "rest");
  assert.equal(C.dayState(undefined), "");
});
test("markDone：记下多学了", () => {
  const a = C.markDone(C.fresh("2026-10-30"), "2026-10-30", { reviewed: 3, newLines: 4, newWords: 5 });
  assert.equal(a.rec.days["2026-10-30"].more, false);
  const b = C.markDone(a.rec, "2026-10-30", { reviewed: 3, newLines: 6, newWords: 9, more: true });
  assert.equal(b.rec.days["2026-10-30"].more, true);
  assert.equal(b.first, false);
});
test("weekOf / monthGrid", () => {
  const w = C.weekOf("2026-10-30");
  assert.equal(w.length, 7);
  assert.equal(w[0], "2026-10-26");
  assert.equal(w[6], "2026-11-01");
  const g = C.monthGrid(2026, 11);
  assert.equal(g.length, 42);
  assert.deepEqual(g.slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(g[6], "2026-11-01");
  const f = C.monthGrid(2026, 2);
  assert.equal(f.length, 35);
  assert.equal(f[0], null);
});
test("detail", () => {
  assert.equal(C.detail({ type: "done", reviewed: 12, newLines: 4, newWords: 17 }), "复习 12 个词 · 新学 4 句、17 个词");
  assert.equal(C.detail({ type: "rest" }), "休息日");
  assert.equal(C.detail(undefined), "没有打卡");
});
test("merge", () => {
  const local = rec({ days: { "2026-10-30": { type: "rest" } }, restTokens: 1, bestStreak: 5, theme: "a" });
  const inc = rec({ days: { "2026-10-30": { type: "done" }, "2026-10-29": { type: "done" } }, restTokens: 2, bestStreak: 3, theme: "b", unlocked: ["lilac", "x"] });
  const m = C.merge(local, inc);
  assert.equal(m.days["2026-10-30"].type, "done");
  assert.equal(m.days["2026-10-29"].type, "done");
  assert.equal(m.restTokens, 2);
  assert.equal(m.bestStreak, 5);
  assert.equal(m.theme, "a");
  assert.deepEqual(m.unlocked.sort(), ["lilac", "x"]);
  assert.deepEqual(C.merge(local, undefined), local);
  assert.deepEqual(C.merge(undefined, inc), inc);
});
test("normalize", () => {
  assert.deepEqual(C.normalize(null, "2026-10-30"), C.fresh("2026-10-30"));
  assert.deepEqual(C.normalize({ key: "checkin", days: "x" }, "2026-10-30").days, {});
  // 坏条目去掉：不像日期的键、类型不对的、null
  assert.deepEqual(C.normalize({ days: { "bad": { type: "done" }, "2026-10-29": { type: "bogus" }, "2026-10-28": null, "2026-10-27": { type: "rest" } } }, "2026-10-30").days,
    { "2026-10-27": { type: "rest" } });
});

// ---- 皮肤解锁记录（v0.33，数据格式第 5 版）：unlocked 保持文字数组，来源记在 unlockedInfo ----
test("fresh：丁香是默认解锁的", () => {
  const f = C.fresh("2026-10-31");
  assert.deepEqual(f.unlocked, ["lilac"]);
  assert.deepEqual(f.unlockedInfo, { lilac: { by: "default" } });
});
test("normalize-keeps-unknown-fields：不认识的字段原样留着", () => {
  const n = C.normalize(rec({ future: { x: 1 }, note: "以后加的" }), "2026-10-31");
  assert.deepEqual(n.future, { x: 1 }); assert.equal(n.note, "以后加的");
});
test("normalize：旧记录补上 unlockedInfo（丁香 default，其他 legacy）", () => {
  const n = C.normalize({ ...rec({}), unlocked: ["lilac", "night"], unlockedInfo: undefined }, "2026-10-31");
  assert.deepEqual(n.unlocked, ["lilac", "night"]);
  assert.deepEqual(n.unlockedInfo, { lilac: { by: "default" }, night: { by: "legacy" } });
});
test("normalize-object-format：规格里的对象格式也认", () => {
  const n = C.normalize({ ...rec({}), unlocked: [{ id: "night", by: "streak", at: "2026-11-02" }, "lilac", { bad: 1 }] }, "2026-11-03");
  assert.deepEqual(n.unlocked, ["night", "lilac"]);
  assert.deepEqual(n.unlockedInfo.night, { by: "streak", at: "2026-11-02" });
  assert.deepEqual(n.unlockedInfo.lilac, { by: "default" });
});
test("normalize：已有的 unlockedInfo 保留", () => {
  const n = C.normalize(rec({ unlocked: ["lilac", "mist"], unlockedInfo: { lilac: { by: "default" }, mist: { by: "songs", at: "2026-10-31" } } }), "2026-10-31");
  assert.deepEqual(n.unlockedInfo.mist, { by: "songs", at: "2026-10-31" });
});
test("unlock-adds-once", () => {
  const a = C.unlock(C.fresh("2026-10-31"), "night", "streak", "2026-11-02");
  assert.deepEqual(a.unlocked, ["lilac", "night"]);
  assert.deepEqual(a.unlockedInfo.night, { by: "streak", at: "2026-11-02" });
  const b = C.unlock(a, "night", "code", "2026-11-05");
  assert.equal(b, a, "已经有就原样返回");
});
test("merge-unlocked-info：按 id 合并，两边都有时留早的", () => {
  const local = rec({ unlocked: ["lilac", "night"], unlockedInfo: { lilac: { by: "default" }, night: { by: "streak", at: "2026-11-05" } } });
  const inc = rec({ unlocked: ["lilac", "night", "mist"], unlockedInfo: { lilac: { by: "default" }, night: { by: "streak", at: "2026-11-02" }, mist: { by: "songs", at: "2026-11-04" } } });
  const m = C.merge(local, inc);
  assert.deepEqual(m.unlocked, ["lilac", "night", "mist"]);
  assert.equal(m.unlockedInfo.night.at, "2026-11-02");
  assert.deepEqual(m.unlockedInfo.mist, { by: "songs", at: "2026-11-04" });
  assert.equal(m.theme, local.theme);
});
