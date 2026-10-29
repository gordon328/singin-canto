// 弹簧动画（设计规范 6.1）、首页底部渐进模糊、设置齿轮转 90 度
const F = require("./fixtures.js");
const sheetY = `(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector("#sheet")).transform); return Math.round(m.m42); })()`;
// 拿一个元素的样式（学词卡片、完成页的勾平时不在页面上，临时放一个进去量）
const probe = (cls, prop) => `(() => { const e = document.createElement("div"); e.className = ${JSON.stringify(cls)}; document.body.append(e);
  const v = getComputedStyle(e)[${JSON.stringify(prop)}]; e.remove(); return v; })()`;
module.exports = { name: "spring", async run(b) {
  await F.seed(b);
  // 首页底部：列表下面留够空白，最后的内容能滚到「＋ 导入新歌」上方；渐进模糊层没有背景色、不能点、在按钮下面
  const blur = await b.ev(`(() => { const e = document.querySelector(".edge-blur"), s = getComputedStyle(e), r = e.getBoundingClientRect(), add = document.querySelector("#btnAdd");
    const layers = [...e.children].map(i => getComputedStyle(i)), fs = layers.map(l => l.backdropFilter);
    return { vis: !e.hidden && r.height > 0, h: Math.round(r.height), bottom: Math.round(innerHeight - r.bottom), bg: s.backgroundColor, pe: s.pointerEvents, pos: s.position,
      z: +s.zIndex < +getComputedStyle(add).zIndex, fs, mask: layers.every(l => (l.maskImage || l.webkitMaskImage).includes("gradient")), lbg: layers.every(l => l.backgroundColor === "rgba(0, 0, 0, 0)") }; })()`);
  b.check("edge-blur " + JSON.stringify(blur), blur.vis && blur.h === 140 && blur.bottom === 0 && blur.bg === "rgba(0, 0, 0, 0)" && blur.lbg && blur.pe === "none" && blur.pos === "fixed"
    && blur.z && blur.mask && blur.fs.length >= 4 && blur.fs.every(f => f.startsWith("blur(")) && blur.fs[0] !== blur.fs[blur.fs.length - 1]);
  const room = await b.ev(`(() => { scrollTo(0, document.documentElement.scrollHeight); const add = document.querySelector("#btnAdd").getBoundingClientRect();
    const songs = [...document.querySelectorAll("#songs .song")], last = songs[songs.length - 1].getBoundingClientRect(); const r = { gap: Math.round(add.top - last.bottom) }; scrollTo(0, 0); return r; })()`);
  b.check("last-song-above-add " + JSON.stringify(room), room.gap >= 24);
  b.check("blur-tap-through", await b.ev(`(() => { const e = document.querySelector(".edge-blur").getBoundingClientRect(); const t = document.elementFromPoint(20, e.top + 30); return !!t && !t.closest(".edge-blur"); })()`));
  await b.shot("edge-blur");

  // 齿轮：点了带弹簧转 90 度，同时跳转到设置页；回首页后齿轮是新的（不带转过的状态）
  await b.ev(`document.querySelector("#btnSettings").click()`); await b.sleep(60);
  const gear = await b.ev(`(() => { const s = getComputedStyle(document.querySelector("#btnSettings svg")); return [document.querySelector("#btnSettings").classList.contains("turn"), s.animationName, s.animationTimingFunction]; })()`);
  b.check("gear-turn " + JSON.stringify(gear), gear[0] && gear[1] === "gearTurn" && gear[2].startsWith("linear("));
  await b.sleep(900);
  b.check("gear-goes-settings", (await b.ev(`history.state && history.state.view`)) === "settingsView" && !(await b.ev(`document.querySelector(".edge-blur").getBoundingClientRect().height`)));
  await b.ev(`history.back()`); await b.sleep(800);
  b.check("gear-fresh", !(await b.ev(`document.querySelector("#btnSettings").classList.contains("turn")`)));

  // 声调键帽松手用弹簧弹回，按下还是 100ms；学词新卡片滑入、完成页的勾都用弹簧
  b.check("key-release-spring", (await b.ev(`getComputedStyle(document.querySelector(".tones .key .key-face")).transitionTimingFunction`)).startsWith("linear("));
  b.check("key-press-fast", await b.ev(`(() => { const k = document.querySelector(".tones .key"); k.classList.add("is-pressed"); const s = getComputedStyle(k.querySelector(".key-face"));
    const r = s.transitionDuration.startsWith("0.1s") && !s.transitionTimingFunction.startsWith("linear("); k.classList.remove("is-pressed"); return r; })()`));
  b.check("card-in-spring", (await b.ev(probe("st-anim in", "animationTimingFunction"))).startsWith("linear(") && (await b.ev(probe("st-anim in", "animationName"))) === "stIn");
  b.check("check-pop-spring", (await b.ev(probe("st-check pop", "animationTimingFunction"))).startsWith("linear("));

  // 「⋯」菜单弹出用弹簧
  await F.openSong(b, "t1");
  await b.ev(`document.querySelector("#btnMenu").click()`); await b.sleep(50);
  b.check("menu-spring", (await b.ev(`getComputedStyle(document.querySelector("#songMenu")).transitionTimingFunction`)).includes("linear("));
  await b.ev(`document.querySelector("#btnMenu").click()`); await b.sleep(300);

  // 底部弹窗：跟着手指走；拖一点点松手 → 弹簧弹回原位；往上拖有橡皮筋阻力
  await b.ev(F.tapChar(0, 2)); await b.sleep(600);
  const g = await b.ev(`(() => { const r = document.querySelector("#sheet .grab").getBoundingClientRect(); return [r.left + r.width / 2, r.top + 2]; })()`);
  await b.touch("touchStart", g[0], g[1]);
  for (let i = 1; i <= 6; i++) { await b.touch("touchMove", g[0], g[1] + i * 10); await b.sleep(60); }
  const follow = await b.ev(sheetY);
  b.check("drag-follows " + follow, follow === 60);
  await b.sleep(150); await b.touch("touchMove", g[0], g[1] + 60); await b.sleep(150);
  await b.touch("touchEnd"); await b.sleep(80);
  const mid = await b.ev(sheetY); await b.sleep(700);
  b.check("spring-back " + JSON.stringify([mid, await b.ev(sheetY)]), mid > 0 && mid < 60 && (await b.ev(sheetY)) === 0 && !(await b.ev(`document.querySelector("#sheet").hidden`)));
  await b.touch("touchStart", g[0], g[1]);
  for (let i = 1; i <= 6; i++) { await b.touch("touchMove", g[0], g[1] - i * 20); await b.sleep(30); }
  const up = await b.ev(sheetY);
  b.check("rubber-band " + up, up < 0 && up > -120);
  await b.touch("touchEnd"); await b.sleep(800);
  b.check("rubber-back", (await b.ev(sheetY)) === 0 && !(await b.ev(`document.querySelector("#sheet").hidden`)));
  // 慢慢拖过 1/3 高度 → 顺势滑下关闭
  const third = await b.ev(`Math.ceil(document.querySelector("#sheet").offsetHeight / 3) + 10`);
  await b.touch("touchStart", g[0], g[1]);
  for (let i = 1; i <= 10; i++) { await b.touch("touchMove", g[0], g[1] + third * i / 10); await b.sleep(40); }
  await b.sleep(200); await b.touch("touchMove", g[0], g[1] + third); await b.sleep(200);
  await b.touch("touchEnd"); await b.sleep(600);
  b.check("past-third-closes", await b.ev(`document.querySelector("#sheet").hidden`));
  // 减弱动态效果：松手直接回原位，不弹
  await b.reducedMotion(true);
  await b.ev(F.tapChar(0, 2)); await b.sleep(600);
  await b.touch("touchStart", g[0], g[1]); for (let i = 1; i <= 4; i++) { await b.touch("touchMove", g[0], g[1] + i * 10); await b.sleep(80); }
  await b.touch("touchEnd"); await b.sleep(30);
  const rm = await b.ev(`[${sheetY}, document.querySelector("#sheet").hidden, document.querySelector("#sheet").style.transform, document.querySelector("#sheet").className]`);
  b.check("reduced-no-spring " + JSON.stringify(rm), rm[0] === 0 && !rm[1]);
  b.check("reduced-card-fade", !(await b.ev(probe("st-anim in", "animationName"))).includes("stIn"));
  await b.reducedMotion(false);
  b.check("spring: 页面没有报错", b.errors.length === 0);
} };
