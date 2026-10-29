const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const V = require("../voice.js");
const L = require("../lessons.js");

test("plan：每个音节都有录音才用录音", () => {
  assert.deepEqual(V.plan("hoeng1 gong2"), ["hoeng1", "gong2"]);
  assert.deepEqual(V.plan("  NGO5 "), ["ngo5"]);
  assert.equal(V.plan(""), null);
  assert.equal(V.plan(null), null);
  assert.equal(V.plan("hoeng1 xx9"), null); // 有一个没有 → 整个词用系统朗读
});
test("首页 8 组声调字都有录音", () => {
  for (const s of L.TONE_SETS) for (let k = 1; k <= 6; k++) assert.ok(V.HAS.has(s.syl + k), s.syl + k);
});
test("清单里的音节都有 mp3 文件", () => {
  const dir = path.join(__dirname, "..", "audio", "hiujin");
  const files = new Set(fs.readdirSync(dir));
  for (const s of V.HAS) assert.ok(files.has(s + ".mp3"), s);
  assert.equal(files.size, V.HAS.size);
});
test("trimRange：去掉头尾静音，两头留 5 毫秒", () => {
  const ch = new Float32Array(1000); for (let i = 300; i < 600; i++) ch[i] = 0.5;
  assert.deepEqual(V.trimRange(ch, 16000), [220, 680]);
  assert.deepEqual(V.trimRange(new Float32Array(10), 16000), [0, 10]); // 全是静音：不剪
});
test("GAP：正常 0.05 秒，逐字 0.3 秒", () => {
  assert.equal(V.GAP.word, 0.05);
  assert.equal(V.GAP.each, 0.3);
});
