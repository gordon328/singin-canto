// 皮肤解锁条件（规格 7.10.3）
const test = require("node:test");
const assert = require("node:assert/strict");
global.STUDY = require("../study.js");
const UNLOCK = require("../skins/unlock-rules.js");
const SKIN_IDS = require("../skins/registry.js");
const defs = Object.fromEntries(SKIN_IDS.map(id => [id, require(`../skins/${id}.js`)]));
const ctx = o => ({ streak: 0, best: 0, total: 0, songs: 0, words: 0, ...o });
const song = (texts, learned) => ({ id: "s", lines: texts.map((text, i) => ({ t: i, text })), progress: { learned, current: true } });

test("streak 3：达到过一次就永久解锁，进度按当前连续", () => {
  const r = UNLOCK.RULES.streak;
  assert.equal(r.done(ctx({ streak: 3, best: 3 }), 3), true);
  assert.equal(r.done(ctx({ streak: 2, best: 2 }), 3), false);
  assert.deepEqual(r.progress(ctx({ streak: 2, best: 2 }), 3), { cur: 2, max: 3 });
  assert.equal(r.done(ctx({ streak: 0, best: 5 }), 3), true, "断了以后 best 还在");
  assert.deepEqual(r.progress(ctx({ streak: 9, best: 9 }), 3), { cur: 3, max: 3 });
});

test("songs：一首歌所有要学的句子都 learned 才算（没汉字的句子、重复的副歌跳过）", () => {
  const texts = ["第一句", "……", "第三句", "第一句"];
  const c = learned => UNLOCK.context({ checkin: null, songs: [song(texts, learned)], cards: [], today: "2026-10-31" }).songs;
  assert.equal(c([0]), 0);
  assert.equal(c([0, 2]), 1);
  assert.equal(UNLOCK.context({ songs: [song([], [])], cards: [], today: "2026-10-31" }).songs, 0, "没有句子的歌不算");
});

test("words：known 或 reps ≥ 3 算掌握", () => {
  const cards = [{ w: "a", known: true, srs: { reps: 0 } }, { w: "b", known: false, srs: { reps: 3 } }, { w: "c", known: false, srs: { reps: 2 } }];
  assert.equal(UNLOCK.context({ songs: [], cards, today: "2026-10-31" }).words, 2);
});

test("context：连续、最长连续、累计来自打卡记录", () => {
  const checkin = { days: { "2026-10-29": { type: "done" }, "2026-10-30": { type: "rest" }, "2026-10-31": { type: "done" } }, bestStreak: 5 };
  const c = UNLOCK.context({ checkin, songs: [], cards: [], today: "2026-10-31" });
  assert.equal(c.streak, 3); assert.equal(c.total, 2); assert.equal(c.best, 5);
});

test("code 永远不会自动解锁、没有进度；default 一开始就有", () => {
  assert.equal(UNLOCK.RULES.code.done(ctx({ streak: 99, best: 99, songs: 99, words: 999, total: 99 }), 0), false);
  assert.equal(UNLOCK.RULES.code.progress(ctx({}), 0), null);
  assert.equal(UNLOCK.RULES.default.done(ctx({}), 0), true);
});

test("newlyUnlocked：不返回已解锁的，按 order 排", () => {
  const all = UNLOCK.newlyUnlocked(defs, ctx({ streak: 3, best: 3, songs: 1 }), ["lilac"]);
  assert.deepEqual(all, [{ id: "night", by: "streak" }, { id: "mist", by: "songs" }]);
  assert.deepEqual(UNLOCK.newlyUnlocked(defs, ctx({ streak: 3, best: 3, songs: 1 }), ["lilac", "night"]), [{ id: "mist", by: "songs" }]);
  assert.deepEqual(UNLOCK.newlyUnlocked(defs, ctx({}), []), [{ id: "lilac", by: "default" }]);
});

test("文字", () => {
  const R = UNLOCK.RULES;
  assert.equal(R.default.label(), "默认皮肤");
  assert.equal(R.streak.label(3), "连续打卡 3 天解锁"); assert.equal(R.streak.reached(3), "连续打卡 3 天达成");
  assert.equal(R.total.label(30), "累计打卡 30 天解锁"); assert.equal(R.total.reached(30), "累计打卡 30 天达成");
  assert.equal(R.songs.label(1), "学会第一首歌解锁"); assert.equal(R.songs.label(3), "学会 3 首歌解锁");
  assert.equal(R.songs.reached(1), "学会第一首歌"); assert.equal(R.songs.reached(3), "学会 3 首歌");
  assert.equal(R.words.label(100), "掌握 100 个词解锁"); assert.equal(R.words.reached(100), "掌握 100 个词");
  assert.equal(R.code.label(), "用兑换码解锁");
});

test("每个皮肤的 unlock.type 都是支持的类型", () => {
  for (const d of Object.values(defs)) assert.ok(d.unlock.type in UNLOCK.RULES, d.id);
});
