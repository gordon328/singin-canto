const test = require("node:test");
const assert = require("node:assert/strict");
const BACKUP = require("../backup.js");
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();

test("fileName：本地日期，月日补零", () => {
  assert.equal(BACKUP.fileName(at(2026, 3, 5, 23, 59)), "唱学粤语备份-2026-03-05.json");
});
test("build：不含音频，meta 里不带 backup 记录", () => {
  const o = BACKUP.build({ songs: [{ id: "a", lines: [], audio: { size: 1 } }], cards: [{ w: "你" }],
    meta: [{ key: "daily", goal: 4 }, { key: "backup", at: 1 }], now: at(2026, 10, 29) });
  assert.equal(o.app, "yuechang"); assert.equal(o.v, 3);
  assert.ok(!("audio" in o.songs[0]));
  assert.deepEqual(o.meta.map(m => m.key), ["daily"]);
  assert.equal(o.cards.length, 1);
});
test("parse：空文件、不是 JSON、别的 JSON、缺歌曲列表", () => {
  assert.equal(BACKUP.parse("").err, "文件是空的");
  assert.match(BACKUP.parse('{"app":"yuechang","songs":[').err, /不是备份格式/);
  assert.match(BACKUP.parse('{"hello":1}').err, /不是唱学粤语的备份/);
  assert.match(BACKUP.parse("[1,2]").err, /不是唱学粤语的备份/);
  assert.match(BACKUP.parse('{"app":"yuechang"}').err, /没有歌曲列表/);
  const r = BACKUP.parse('{"app":"yuechang","v":1,"songs":[]}');
  assert.ok(r.ok); assert.equal(r.obj.v, 1);
});
test("summary：日期、只数有效的歌和卡片；旧备份没有日期", () => {
  const s = BACKUP.summary({ exported: new Date(at(2026, 10, 29, 10)).toISOString(),
    songs: [{ id: "a", lines: [] }, null, { id: "b" }], cards: [{ w: "你" }, null, { jp: "x" }] });
  assert.deepEqual(s, { date: "2026年10月29日", songs: 1, cards: 1 });
  assert.deepEqual(BACKUP.summary({ songs: [] }), { date: "", songs: 0, cards: 0 });
});
test("ageLabel：没备份过、今天、昨天、7 天不提醒、8 天提醒", () => {
  const now = at(2026, 10, 29, 9);
  assert.deepEqual(BACKUP.ageLabel(0, now), { text: "还没有备份过", stale: true });
  assert.deepEqual(BACKUP.ageLabel(at(2026, 10, 29, 1), now), { text: "上次备份：今天", stale: false });
  assert.deepEqual(BACKUP.ageLabel(at(2026, 10, 28, 23), now), { text: "上次备份：昨天", stale: false });
  assert.deepEqual(BACKUP.ageLabel(at(2026, 10, 22, 23), now), { text: "上次备份：7 天前", stale: false });
  assert.deepEqual(BACKUP.ageLabel(at(2026, 10, 21, 8), now), { text: "上次备份：8 天前", stale: true });
});

test("开发者模式标记只属于这台设备：不放进备份；兑换记录要放进备份", () => {
  const o = BACKUP.build({ songs: [], cards: [], meta: [{ key: "devMode", on: true }, { key: "redeemed", list: [{ hash: "a".repeat(64), at: "2026-10-31", rewards: ["dev"] }] }], now: 0 });
  assert.ok(!o.meta.some(m => m.key === "devMode"));
  assert.ok(o.meta.some(m => m.key === "redeemed"));
  assert.ok(BACKUP.DEVICE_ONLY.includes("devMode"));
});
