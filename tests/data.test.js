// 数据兼容性测试（docs/数据兼容规则.md 第 5 条）：每一种历史数据格式和备份格式，升到最新后数据完整、数量一致
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const DATA = require("../data.js");
const BACKUP = require("../backup.js");

const DIR = path.join(__dirname, "fixtures");
const load = f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".json"));
const dataFiles = files.filter(f => /^data-v\d+\.json$/.test(f));
const backupFiles = files.filter(f => /^backup-/.test(f) && f !== "backup-future.json");

// 升级后：歌、卡片、meta 一条不少，原有字段一个不改
function assertKept(before, after) {
  assert.equal(after.songs.length, before.songs.length, "歌的数量");
  for (const s of before.songs) {
    const a = after.songs.find(x => x.id === s.id);
    assert.ok(a, "歌还在：" + s.id);
    for (const [k, v] of Object.entries(s)) assert.deepEqual(a[k], v, `歌 ${s.id} 的 ${k} 没变`);
  }
  const cards = before.cards || [];
  assert.equal(after.cards.length, cards.length, "卡片数量");
  for (const c of cards) assert.deepEqual(after.cards.find(x => x.w === c.w), c, "卡片没变：" + c.w);
  // meta：原有字段一个不少、值不变；迁移可以新加字段（只加不删）
  for (const m of before.meta || []) { const a = after.meta.find(x => x.key === m.key); assert.ok(a, "meta 还在：" + m.key); for (const k of Object.keys(m)) assert.deepEqual(a[k], m[k], `meta ${m.key}.${k} 没变`); }
}

test("每一版数据格式都有示例数据（以后改数据结构要加一份）", () => {
  for (let v = 1; v <= DATA.VERSION; v++) assert.ok(dataFiles.includes(`data-v${v}.json`), `缺 tests/fixtures/data-v${v}.json`);
  for (let v = 2; v <= DATA.VERSION; v++) assert.equal(typeof DATA.STEPS[v], "function", `缺 ${v - 1} → ${v} 的迁移函数`);
  assert.ok(backupFiles.some(f => load(f).dataVersion === DATA.VERSION), "缺最新格式的备份示例");
});

for (const f of dataFiles) test(`本机数据 ${f} 升到最新：数据完整、数量一致`, () => {
  const fx = load(f);
  const before = JSON.parse(JSON.stringify(fx));
  const r = DATA.migrate({ songs: fx.songs, cards: fx.cards, meta: fx.meta, prefs: fx.prefs }, fx.dataVersion);
  assert.equal(r.to, DATA.VERSION);
  assert.deepEqual(r.steps, Array.from({ length: DATA.VERSION - fx.dataVersion }, (_, i) => fx.dataVersion + 1 + i));
  assertKept(before, r.data);
  assert.deepEqual(fx, before, "迁移不改动原来的对象");
  for (const [k, v] of Object.entries(before.prefs || {})) assert.deepEqual(r.data.prefs[k], v, "偏好设置没丢：" + k);
  // 再迁移一次（已经是最新）什么都不变
  assert.deepEqual(DATA.migrate(r.data, DATA.VERSION).data, r.data);
});

test("第 2 版：prefs.goal 搬到 meta daily（prefs.goal 不删）", () => {
  const r = DATA.migrate(load("data-v2.json"), 2).data;
  assert.equal(r.meta.find(m => m.key === "daily").goal, 6);
  assert.equal(r.prefs.goal, 6);
});
test("第 3 版：已经有 daily 时不覆盖", () => {
  const fx = load("data-v3.json");
  const r = DATA.migrate({ ...fx, prefs: { goal: 2 } }, 2).data;
  assert.equal(r.meta.filter(m => m.key === "daily").length, 1);
  assert.equal(r.meta.find(m => m.key === "daily").goal, 6);
});
test("第 1 版：没有卡片和 meta，升级后是空的", () => {
  const r = DATA.migrate(load("data-v1.json"), 1).data;
  assert.deepEqual(r.cards, []); assert.deepEqual(r.meta, []);
});
test("比 App 新的数据、坏版本号：抛错，不动数据", () => {
  assert.throws(() => DATA.migrate({ songs: [] }, DATA.VERSION + 1), /更新的版本/);
  assert.throws(() => DATA.migrate({ songs: [] }, 0));
  assert.throws(() => DATA.migrate({ songs: [] }, "2"));
});

for (const f of backupFiles) test(`备份文件 ${f}：能读、升到最新、数量一致`, () => {
  const text = fs.readFileSync(path.join(DIR, f), "utf8");
  const r = BACKUP.parse(text);
  assert.ok(r.ok, r.err);
  const before = JSON.parse(text);
  const up = DATA.upgradeBackup(r.obj);
  assert.equal(up.dataVersion, DATA.VERSION);
  assertKept({ songs: before.songs, cards: before.cards || [], meta: before.meta || [] }, up);
  assert.deepEqual(BACKUP.summary(up), BACKUP.summary(before));
});
test("备份格式推断：v1 = 第 1 版，v2 = 第 2 版，新备份看 dataVersion", () => {
  assert.equal(DATA.backupVersion(load("backup-v1.json")), 1);
  assert.equal(DATA.backupVersion(load("backup-v2-m1.json")), 2);
  assert.equal(DATA.backupVersion(load("backup-v3.json")), 4);
});
test("比 App 新的备份：提示先更新 App，不导入", () => {
  const r = BACKUP.parse(fs.readFileSync(path.join(DIR, "backup-future.json"), "utf8"));
  assert.equal(r.ok, false);
  assert.equal(r.err, "这个备份来自更新的版本，请先更新 App");
});
test("新导出的备份：记着 dataVersion 和 App 版本，不带本机专用的 meta，能原样导回", () => {
  const fx = load("data-v4.json");
  const o = BACKUP.build({ songs: fx.songs, cards: fx.cards, meta: [...fx.meta, { key: "dataVersion", v: 4 }, { key: "backup", at: 1 }], now: Date.UTC(2026, 9, 30), appVersion: "v0.30" });
  assert.equal(o.dataVersion, DATA.VERSION); assert.equal(o.appVersion, "v0.30"); assert.equal(o.v, 3);
  assert.ok(!o.meta.some(m => m.key === "dataVersion" || m.key === "backup"));
  const back = DATA.upgradeBackup(BACKUP.parse(JSON.stringify(o)).obj);
  assertKept({ songs: o.songs, cards: o.cards, meta: o.meta }, back);
});

test("第 5 版：打卡记录补上 unlockedInfo，其他不动", () => {
  const fx = load("data-v4.json");
  const r = DATA.migrate(fx, 4).data;
  const ci = r.meta.find(m => m.key === "checkin");
  assert.deepEqual(ci.unlocked, ["lilac"]);
  assert.deepEqual(ci.unlockedInfo, { lilac: { by: "default" } });
  const old = fx.meta.find(m => m.key === "checkin");
  for (const k of Object.keys(old)) assert.deepEqual(ci[k], old[k], k);
  const r2 = DATA.migrate({ ...fx, meta: fx.meta.filter(m => m.key !== "checkin") }, 4).data;
  assert.ok(!r2.meta.some(m => m.key === "checkin"), "没有打卡记录就不建");
});

test("第 6 版：兑换记录 redeemed（新记录，没有就是空的），旧数据不用改", () => {
  assert.equal(DATA.VERSION >= 6, true);
  const fx = load("data-v6.json");
  const r = fx.meta.find(m => m.key === "redeemed");
  assert.ok(r && Array.isArray(r.list) && r.list.every(x => /^[0-9a-f]{64}$/.test(x.hash)));
  assert.deepEqual(DATA.migrate(load("data-v5.json"), 5).data.meta, load("data-v5.json").meta);
});
