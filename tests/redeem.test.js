// 兑换码（开发规格 7.10.4）：只存哈希；规范化；判断能不能兑换；生成脚本；仓库里不能出现任何兑换码原文
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const REDEEM = require("../skins/redeem.js");
const CODES = require("../skins/codes.js");
const SKIN_IDS = require("../skins/registry.js");
const ROOT = path.join(__dirname, "..");

test("normalize：转大写，去掉空格和连字符", () => {
  assert.equal(REDEEM.normalize(" canto-7kq2 m9xa-4f8r "), "CANTO7KQ2M9XA4F8R");
  assert.equal(REDEEM.normalize("ab\tc—d"), "ABC—D");
  assert.equal(REDEEM.normalize(""), "");
});

test("sha256：标准结果", async () => {
  assert.equal(await REDEEM.sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("generate：CANTO-XXXX-XXXX-XXXX，不含容易混淆的 0/O/1/I，每次不一样", () => {
  const a = REDEEM.generate(), b = REDEEM.generate();
  assert.match(a, /^CANTO-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  assert.notEqual(a, b);
  assert.ok(!/[01OI]/.test(a.slice(6)));
});

const st = o => ({ unlocked: ["lilac"], devMode: false, redeemed: [], skinIds: SKIN_IDS, ...o });
test("plan：无效、成功、已经拥有、已经用过", () => {
  assert.equal(REDEEM.plan(null, st()).status, "invalid");
  assert.deepEqual(REDEEM.plan({ hash: "h", rewards: ["skin:night"] }, st()), { status: "ok", skins: ["night"], dev: false });
  assert.deepEqual(REDEEM.plan({ hash: "h", rewards: ["skin:*"] }, st({ unlocked: ["lilac", "mist"] })), { status: "ok", skins: ["night"], dev: false });
  assert.equal(REDEEM.plan({ hash: "h", rewards: ["skin:night"] }, st({ unlocked: ["lilac", "night"] })).status, "owned");
  assert.equal(REDEEM.plan({ hash: "h", rewards: ["skin:night"] }, st({ unlocked: ["lilac", "night"], redeemed: ["h"] })).status, "used");
  // 以后加了新皮肤：用过的「全部皮肤」码还能再领新皮肤
  assert.deepEqual(REDEEM.plan({ hash: "h", rewards: ["skin:*"] }, st({ unlocked: ["lilac", "night"], redeemed: ["h"] })), { status: "ok", skins: ["mist"], dev: false });
  // 不存在的皮肤 id 忽略
  assert.equal(REDEEM.plan({ hash: "h", rewards: ["skin:sakura"] }, st()).status, "owned");
});
test("plan：开发者模式——关掉后同一个码能再打开；开着时再兑换提示已经开着", () => {
  assert.deepEqual(REDEEM.plan({ hash: "d", rewards: ["dev"] }, st()), { status: "ok", skins: [], dev: true });
  assert.deepEqual(REDEEM.plan({ hash: "d", rewards: ["dev"] }, st({ redeemed: ["d"] })), { status: "ok", skins: [], dev: true });
  assert.equal(REDEEM.plan({ hash: "d", rewards: ["dev"] }, st({ devMode: true })).status, "devOn");
  assert.equal(REDEEM.plan({ hash: "d", rewards: ["dev"] }, st({ devMode: true, redeemed: ["d"] })).status, "used");
});
test("提示文字", () => {
  assert.equal(REDEEM.MESSAGES.invalid, "兑换码无效，请检查后重试");
  assert.equal(REDEEM.MESSAGES.used, "这个兑换码已经用过了");
  assert.equal(REDEEM.MESSAGES.owned, "这些皮肤你已经拥有了");
});

test("codes.js：每条只有哈希、奖励、备注；哈希是 64 位十六进制；奖励合法", () => {
  assert.ok(Array.isArray(CODES));
  for (const c of CODES) {
    assert.deepEqual(Object.keys(c).sort(), ["hash", "note", "rewards"]);
    assert.match(c.hash, /^[0-9a-f]{64}$/);
    for (const r of c.rewards) assert.ok(r === "dev" || r === "skin:*" || (r.startsWith("skin:") && SKIN_IDS.includes(r.slice(5))), r);
  }
  assert.equal(new Set(CODES.map(c => c.hash)).size, CODES.length, "哈希不重复");
});

test("仓库里不能出现任何兑换码原文：所有文件里像兑换码的字符串，算出来的哈希都不在 codes.js 里", async () => {
  const hashes = new Set(CODES.map(c => c.hash));
  const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(f => /\.(js|md|html|json|txt)$/.test(f));
  const RE = /CANTO[-\s]?[0-9A-Z]{4}[-\s]?[0-9A-Z]{4}[-\s]?[0-9A-Z]{4}/gi;
  for (const f of files) {
    const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
    for (const m of fs.readFileSync(p, "utf8").match(RE) || [])
      assert.ok(!hashes.has(await REDEEM.sha256(REDEEM.normalize(m))), `${f} 里有兑换码原文`);
  }
  const log = execFileSync("git", ["log", "--format=%B"], { cwd: ROOT, encoding: "utf8" });
  for (const m of log.match(RE) || []) assert.ok(!hashes.has(await REDEEM.sha256(REDEEM.normalize(m))), "提交说明里有兑换码原文");
});

test("tools/make-code.js：只在终端显示原文，往 codes.js 里加哈希", async () => {
  const tmp = path.join(os.tmpdir(), `codes-${Date.now()}.js`);
  fs.copyFileSync(path.join(ROOT, "skins/codes.js"), tmp);
  const out = execFileSync("node", [path.join(ROOT, "tools/make-code.js"), "skin:night,dev", "测试用"], { env: { ...process.env, CODES_FILE: tmp }, encoding: "utf8" });
  const code = (out.match(/CANTO-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/) || [])[0];
  assert.ok(code, out);
  const text = fs.readFileSync(tmp, "utf8");
  assert.ok(!text.includes(code) && !text.includes(REDEEM.normalize(code)), "文件里不能有原文");
  delete require.cache[require.resolve(tmp)];
  const list = require(tmp);
  const e = list.find(x => x.note === "测试用");
  assert.ok(e && e.hash === await REDEEM.sha256(REDEEM.normalize(code)));
  assert.deepEqual(e.rewards, ["skin:night", "dev"]);
  assert.throws(() => execFileSync("node", [path.join(ROOT, "tools/make-code.js"), "skin:nope", "x"], { env: { ...process.env, CODES_FILE: tmp }, stdio: "pipe" }));
  fs.unlinkSync(tmp);
});
