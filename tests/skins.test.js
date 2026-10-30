// 皮肤颜色自动检查（规格 2.2）：每次跑测试都检查所有皮肤。不通过不能上线
const test = require("node:test");
const assert = require("node:assert/strict");
const SKIN_IDS = require("../skins/registry.js");
const SKIN = require("../skins/skin.js");
const defs = SKIN_IDS.map(id => require(`../skins/${id}.js`));
const UNLOCK_TYPES = Object.keys(require("../skins/unlock-rules.js").RULES);
const sets = def => (def.modes === "dark-only" ? ["dark"] : def.modes === "light-only" ? ["light"] : ["light", "dark"]);

test("每个皮肤文件都注册了、id 和文件名一致、不重复", () => {
  assert.ok(SKIN_IDS.length >= 3);
  assert.equal(new Set(SKIN_IDS).size, SKIN_IDS.length);
  defs.forEach((d, i) => { assert.equal(d.id, SKIN_IDS[i]); assert.match(d.id, /^[a-z][a-z-]*$/); });
  assert.ok(SKIN_IDS.includes("lilac"), "要有默认皮肤 lilac");
});

test("必填变量齐全、数组长度对、modes 和 unlock 合法", () => {
  for (const d of defs) {
    assert.ok(SKIN.MODES.includes(d.modes), `${d.id} modes`);
    assert.ok(UNLOCK_TYPES.includes(d.unlock && d.unlock.type), `${d.id} unlock.type`);
    assert.ok(d.name && d.intro && Number.isFinite(d.order), `${d.id} name/intro/order`);
    for (const m of sets(d)) {
      const c = d[m];
      assert.ok(c, `${d.id} 缺少 ${m}`);
      for (const k of SKIN.REQUIRED) assert.ok(k in c, `${d.id} ${m} 缺少 ${k}`);
      assert.equal(c.tones.length, 6, `${d.id} ${m} tones`);
      assert.ok(c.songTiles.length >= 2 && c.songTiles.every(t => t.length === 2), `${d.id} ${m} songTiles`);
    }
  }
});

test("对比度达标（ink/bg、ink/surface、onAccent/accent、onInverse/inverse、heroBtnInk/heroBtn、accent/surface ≥ 4.5；muted/surface、声调/surface ≥ 3）", () => {
  const problems = defs.flatMap(d => SKIN.check(d));
  assert.deepEqual(problems, []);
});

test("check 能发现问题", () => {
  const bad = { ...defs[0], light: { ...defs[0].light, ink: "#DDDDDD" } };
  delete bad.light.heroBtn;
  const p = SKIN.check(bad);
  assert.ok(p.some(x => x.includes("缺少 heroBtn")), p.join("\n"));
  assert.ok(p.some(x => x.includes("ink/bg")), p.join("\n"));
});

test("contrast 算得对", () => {
  assert.ok(Math.abs(SKIN.contrast("#000000", "#FFFFFF") - 21) < 0.01);
  assert.ok(Math.abs(SKIN.contrast("#777777", "#FFFFFF") - 4.48) < 0.01);
});

test("cssVars 变量名", () => {
  const lilac = defs.find(d => d.id === "lilac");
  const css = SKIN.cssVars(lilac.light);
  for (const v of ["--surface-press:", "--ink-2:", "--hero-btn-ink:", "--hero-tile:", "--t6:", "--sq4-ink:", "--sq-count:4", "color-scheme:light"]) assert.ok(css.includes(v), v);
  assert.ok(SKIN.cssVars({ ...lilac.dark, shadowStrength: 0 }).includes("--shadow-1:none"));
  assert.ok(SKIN.cssVars(lilac.dark).includes("color-scheme:dark"));
});

test("丁香和改版前一样", () => {
  const lilac = defs.find(d => d.id === "lilac");
  const css = SKIN.cssVars(lilac.light);
  for (const v of ["--bg:#F7F6FB;", "--accent:#5B4BDB;", "--shadow-1:0 2px 10px rgba(34,31,51,.05);", "--seg-current:#B7AEF2;", "--cur-glow:0 8px 24px rgba(91,75,219,.14);",
    "--shadow-sheet:0 -8px 40px rgba(34,31,51,.18),0 0 0 1px var(--rule);", "--hero-tile:rgba(255,255,255,.14);", "--sq2-bg:#FDEDE3;"]) assert.ok(css.includes(v), v);
  const dark = SKIN.cssVars(lilac.dark);
  for (const v of ["--bg:#15131F;", "--shadow-1:none;", "--seg-current:#5A4FB0;", "--shadow-sheet:0 -8px 40px rgba(0,0,0,.5),0 0 0 1px var(--rule);"]) assert.ok(dark.includes(v), v);
});

test("stylesheet：自动皮肤跟着系统，始终深色的不跟", () => {
  const css = SKIN.stylesheet(Object.fromEntries(defs.map(d => [d.id, d])));
  assert.ok(css.includes(':root[data-skin="lilac"]{'));
  assert.ok(/@media \(prefers-color-scheme: dark\)\{:root\[data-skin="lilac"\]\{/.test(css));
  assert.ok(!/@media \(prefers-color-scheme: dark\)\{:root\[data-skin="night"\]/.test(css));
});

test("colorsFor", () => {
  const night = defs.find(d => d.id === "night"), mist = defs.find(d => d.id === "mist");
  assert.equal(SKIN.colorsFor(night, false).bg, "#10131B");
  assert.equal(SKIN.colorsFor(mist, false).bg, "#F3F5F4");
  assert.equal(SKIN.colorsFor(mist, true).bg, "#111816");
});

test("pick：不存在或没解锁就用丁香", () => {
  const all = Object.fromEntries(defs.map(d => [d.id, d]));
  assert.equal(SKIN.pick("night", ["lilac"], all), "lilac");
  assert.equal(SKIN.pick("sakura", ["lilac", "sakura"], all), "lilac");
  assert.equal(SKIN.pick("night", ["lilac", "night"], all), "night");
  assert.equal(SKIN.pick(undefined, ["lilac"], all), "lilac");
});

test("夜曲和晨雾的颜色和规格一样", () => {
  const night = defs.find(d => d.id === "night"), mist = defs.find(d => d.id === "mist");
  assert.equal(night.modes, "dark-only"); assert.deepEqual(night.unlock, { type: "streak", value: 3 });
  assert.equal(mist.modes, "auto"); assert.deepEqual(mist.unlock, { type: "songs", value: 1 });
  assert.equal(night.dark.accent, "#F4A462"); assert.equal(night.dark.onAccent, "#1A1208");
  assert.deepEqual(night.dark.tones, ["#FF7A70", "#FFB547", "#5FD38D", "#6FA8FF", "#B794FF", "#4CC9DB"]);
  assert.equal(mist.light.accent, "#1F7A6B"); assert.equal(mist.dark.accent, "#4FB8A5"); assert.equal(mist.dark.bg, "#111816");
  assert.deepEqual(mist.light.tones, ["#D14B45", "#C9761F", "#2E8F52", "#3A6FD0", "#8455CF", "#16808F"]);
});
