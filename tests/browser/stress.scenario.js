// 反复进出歌曲页 30 次：事件监听、页面元素、音频地址、动画循环都不能越积越多
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
module.exports = { name: "stress", async run(b) {
  await F.seed(b);
  await b.ev(`(() => { window.__urls = 0; const c = URL.createObjectURL, r = URL.revokeObjectURL;
    URL.createObjectURL = x => { window.__urls++; return c.call(URL, x); }; URL.revokeObjectURL = u => { window.__urls--; return r.call(URL, u); };
    window.__raf = 0; const q = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => q(t => { window.__raf++; f(t); }); })()`);
  await b.send("Performance.enable");
  const metrics = async () => { await b.send("HeapProfiler.collectGarbage"); await b.sleep(200);
    const m = (await b.send("Performance.getMetrics")).result.metrics; return Object.fromEntries(m.filter(x => ["JSEventListeners", "Nodes"].includes(x.name)).map(x => [x.name, x.value])); };
  const cycle = async () => {
    await F.openSong(b, "t1");
    await b.ev(`document.querySelector("#au").play().catch(() => {})`); await b.sleep(250);
    await b.ev(click("#playerView [data-back]")); await b.sleep(600);
  };
  await cycle();
  const m1 = await metrics();
  const times = [];
  for (let k = 1; k < 30; k++) { const t0 = Date.now(); await cycle(); times.push(Date.now() - t0); }
  const m30 = await metrics();
  b.check(`listeners-stable ${m1.JSEventListeners}→${m30.JSEventListeners}`, m30.JSEventListeners <= m1.JSEventListeners);
  b.check(`nodes-stable ${m1.Nodes}→${m30.Nodes}`, m30.Nodes - m1.Nodes < 200);
  b.check("object-urls-released " + (await b.ev("window.__urls")), (await b.ev("window.__urls")) <= 0);
  b.check("home-releases-audio", await b.ev(`!document.querySelector("#au").getAttribute("src")`));
  await b.ev("window.__raf = 0"); await b.sleep(1000);
  b.check("no-raf-on-home " + (await b.ev("window.__raf")), (await b.ev("window.__raf")) === 0);
  b.check("no-filter-in-page-animation", await b.ev(`[...document.styleSheets[0].cssRules].filter(r => r instanceof CSSKeyframesRule && /^(enter|leave)(Fwd|Back)$/.test(r.name)).every(r => !/filter/.test(r.cssText))`));
  console.log("  cycle ms (first 5 / last 5):", times.slice(0, 5).join(","), "/", times.slice(-5).join(","));
  b.check("stress: 页面没有报错", b.errors.length === 0);
} };
