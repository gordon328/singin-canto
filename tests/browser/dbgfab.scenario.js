// 调试面板可以收起（v0.32）：打开后默认收起成屏幕边上 44px 的半透明小圆按钮；点一下展开（占屏幕下半部分，能滚动，上面的页面照常能点），
// 再点一下或点「收起」收起；圆按钮能拖动，松手吸到最近的左边或右边并记住位置；收起时照常记录
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const rect = sel => `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`;
const tapVer = `(async () => { for (let i = 0; i < 3; i++) { document.querySelector("#appVer").click(); await new Promise(r => setTimeout(r, 80)); } })()`;
const shown = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
async function tapAt(b, x, y) { await b.touch("touchStart", x, y); await b.sleep(60); await b.touch("touchEnd"); await b.sleep(150); }
async function drag(b, from, to) {
  await b.touch("touchStart", from[0], from[1]);
  for (let i = 1; i <= 8; i++) { await b.touch("touchMove", from[0] + (to[0] - from[0]) * i / 8, from[1] + (to[1] - from[1]) * i / 8); await b.sleep(16); }
  await b.touch("touchEnd"); await b.sleep(400);
}

module.exports = { name: "dbgfab", async run(b) {
  await F.seed(b);
  await b.ev(F.DEV_ON); await b.nav("/"); // 调试面板只在开发者模式下有效（v0.35）
  const W = await b.ev("innerWidth"), H = await b.ev("innerHeight");
  b.check("off-no-fab", !(await b.ev(shown("#dbgFab"))));

  // 打开：默认收起，只有右边一个 44px 半透明圆按钮
  await b.ev(tapVer); await b.sleep(300);
  let f = await b.ev(rect("#dbgFab"));
  b.check("collapsed-by-default " + JSON.stringify(f), await b.ev(shown("#dbgFab")) && !(await b.ev(shown("#dbgPanel"))) && f.w === 44 && f.h === 44
    && Math.round(f.x + f.w) === W - 8 && f.y >= 120);
  b.check("fab-round-translucent", await b.ev(`(() => { const s = getComputedStyle(document.querySelector("#dbgFab")); return s.borderRadius === "50%" && +s.opacity < 1; })()`));
  await b.shot("dbgfab-collapsed");

  // 收起时照常记录：点几下页面，展开后能看到
  await b.ev(click("#btnToneNext")); await b.sleep(100);
  await b.ev(click("#btnSettings")); await b.sleep(900);
  b.check("fab-on-settings", await b.ev(shown("#dbgFab")) && !(await b.ev(shown("#dbgPanel"))));
  await b.ev(click("#settingsView [data-back]")); await b.sleep(1300);

  // 点圆按钮展开：占下半屏，能滚动，看到收起期间的记录
  f = await b.ev(rect("#dbgFab"));
  await tapAt(b, f.x + 22, f.y + 22); await b.sleep(200);
  const p = await b.ev(rect("#dbgPanel"));
  b.check("expanded-bottom-half " + JSON.stringify(p), await b.ev(shown("#dbgPanel")) && Math.abs(p.h - H / 2) <= 2 && Math.round(p.y + p.h) === H
    && (await b.ev(`document.querySelector("#dbgFab").getAttribute("aria-expanded")`)) === "true");
  const txt = await b.ev(`document.querySelector("#dbg").innerText`);
  b.check("recorded-while-collapsed", txt.includes("btnSettings") && txt.includes("返回方式：返回按钮") && (txt.match(/click/g) || []).length >= 2);
  b.check("panel-scrolls", await b.ev(`(() => { const e = document.querySelector("#dbgPanel .dbg-body"); return getComputedStyle(e).overflowY === "auto" && e.scrollHeight > e.clientHeight; })()`));
  b.check("panel-has-sections", await b.ev(shown("#dbgSim")) && await b.ev(shown("#dbgData")) && await b.ev(shown("#dbg")));
  await b.shot("dbgfab-expanded");
  // 面板上方的页面照常能点：上半屏中间点到的是页面，不是面板
  b.check("page-above-clickable", await b.ev(`(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 4); return !!e && !e.closest("#dbgWrap"); })()`));
  await b.ev(`window.scrollTo(0, 0)`); const tones = await b.ev(rect("#btnToneNext"));
  if (tones.y + tones.h < H / 2) {
    await tapAt(b, tones.x + tones.w / 2, tones.y + tones.h / 2);
    b.check("tap-above-works", await b.ev(`document.querySelector("#btnToneNext").classList.contains("spin")`));
  } else b.skip("tap-above-works", "换一组按钮不在上半屏");

  // 面板上的「收起」；再点圆按钮展开、再点一下收起
  await b.ev(click("#dbgClose")); await b.sleep(200);
  b.check("close-button", !(await b.ev(shown("#dbgPanel"))) && await b.ev(shown("#dbgFab")));
  f = await b.ev(rect("#dbgFab"));
  await tapAt(b, f.x + 22, f.y + 22); await b.sleep(300);
  const fo = await b.ev(rect("#dbgFab"));
  b.check("fab-above-panel " + JSON.stringify(fo), await b.ev(shown("#dbgPanel")) && fo.y + fo.h <= H / 2 - 8 + 1);
  await tapAt(b, fo.x + 22, fo.y + 22); await b.sleep(300);
  b.check("tap-twice-collapses", !(await b.ev(shown("#dbgPanel"))));
  await b.sleep(500); const fb = await b.ev(rect("#dbgFab"));
  b.check("fab-back-in-place " + JSON.stringify([fb, f]), Math.abs(fb.x - f.x) < 1 && Math.abs(fb.y - f.y) < 1);

  // 拖到左半边偏上：松手吸到左边，记住位置；拖动不算点击（不展开）
  await drag(b, [f.x + 22, f.y + 22], [W * 0.3, 300]);
  f = await b.ev(rect("#dbgFab"));
  b.check("snap-left " + JSON.stringify(f), Math.round(f.x) === 8 && Math.abs(f.y + 22 - 300) <= 2 && !(await b.ev(shown("#dbgPanel"))));
  const saved = JSON.parse(await b.ev(`localStorage.getItem("yc-dbgpos")`));
  b.check("pos-saved " + JSON.stringify(saved), saved.side === "left" && Math.abs(saved.y - f.y) <= 1);
  // 拖到屏幕最上面：不进状态栏那一块（top ≥ 120）
  await drag(b, [f.x + 22, f.y + 22], [W * 0.8, 10]);
  f = await b.ev(rect("#dbgFab"));
  b.check("snap-right-not-top " + JSON.stringify(f), Math.round(f.x + f.w) === W - 8 && Math.round(f.y) === 120);
  // 刷新后位置还在，并且还是收起的
  await b.nav("/");
  const g = await b.ev(rect("#dbgFab"));
  b.check("pos-persists " + JSON.stringify(g), Math.round(g.x + g.w) === W - 8 && Math.round(g.y) === 120 && !(await b.ev(shown("#dbgPanel"))));

  // 关掉调试：圆按钮和面板都不见
  await b.ev(tapVer); await b.sleep(300);
  b.check("off-again", !(await b.ev(shown("#dbgFab"))) && !(await b.ev(shown("#dbgPanel"))));
  b.check("no-errors", b.errors.length === 0);
} };
