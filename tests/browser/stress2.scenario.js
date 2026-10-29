// 反复进出 学习页（听原唱）、自由听（播放）、编辑歌曲 30 次以上：音频元素、事件监听、object URL、页面元素、内存都不能一直增加
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const patchSong = (id, patch) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get(${JSON.stringify(id)}).onsuccess = e => { st.put(Object.assign(e.target.result, ${JSON.stringify(patch)})).onsuccess = () => { db.close(); res(); }; }; }; })`;
module.exports = { name: "stress2", async run(b) {
  await F.seed(b);
  await b.ev(patchSong("t1", { progress: { learned: [], current: true } }));
  await b.nav("/");
  await b.ev(`(() => { speechSynthesis.speak = () => {}; speechSynthesis.cancel = () => {};
    window.__urls = 0; const c = URL.createObjectURL, r = URL.revokeObjectURL;
    URL.createObjectURL = x => { window.__urls++; return c.call(URL, x); }; URL.revokeObjectURL = u => { window.__urls--; return r.call(URL, u); };
    window.__audios = 0; const A = window.Audio; window.Audio = function (...a) { window.__audios++; return new A(...a); }; })()`);
  await b.send("Performance.enable");
  // #au 上挂着的事件监听（用浏览器调试接口直接数）
  const auListeners = async () => { const o = await b.send("Runtime.evaluate", { expression: `document.querySelector("#au")` });
    return (await b.send("DOMDebugger.getEventListeners", { objectId: o.result.result.objectId })).result.listeners.length; };
  const metrics = async () => { await b.send("HeapProfiler.collectGarbage"); await b.sleep(300);
    const m = Object.fromEntries((await b.send("Performance.getMetrics")).result.metrics.map(x => [x.name, x.value]));
    return { listeners: m.JSEventListeners, nodes: m.Nodes, heapMB: Math.round(m.JSHeapUsedSize / 1e5) / 10, au: await auListeners(),
      audios: await b.ev(`document.querySelectorAll("audio").length`), urls: await b.ev("window.__urls"), newAudio: await b.ev("window.__audios") }; };
  const cycle = async () => {
    // 学习页：听原唱，关掉
    await b.ev(click('#today [data-today="start"]')); await b.sleep(900);
    await b.ev(`(document.querySelector('#studyView [data-act="orig"]') || document.querySelector('#studyView [data-act="loop"]') || { click() {} }).click()`); await b.sleep(300);
    await b.ev(click("#studyView [data-back]")); await b.sleep(800);
    // 自由听：播放一下，返回
    await F.openSong(b, "t1");
    await b.ev(click("#bPlay")); await b.sleep(250);
    // 编辑歌曲：进去，试听一下，返回两层
    await b.ev(click("#btnMenu")); await b.sleep(300); await b.ev(click('[data-menu="proof"]')); await b.sleep(800);
    await b.ev(click("#prPlay")); await b.sleep(200);
    await b.ev(click("#proofView [data-back]")); await b.sleep(800);
    await b.ev(click("#playerView [data-back]")); await b.sleep(800);
  };
  for (let k = 0; k < 3; k++) await cycle();
  const m1 = await metrics();
  const times = [];
  for (let k = 3; k < 33; k++) { const t0 = Date.now(); await cycle(); times.push(Date.now() - t0); }
  const m2 = await metrics();
  console.log("  after 3:", JSON.stringify(m1)); console.log("  after 33:", JSON.stringify(m2));
  console.log("  cycle ms (first 5 / last 5):", times.slice(0, 5).join(","), "/", times.slice(-5).join(","));
  b.check(`au-listeners-stable ${m1.au}→${m2.au}`, m2.au <= m1.au);
  b.check(`listeners-stable ${m1.listeners}→${m2.listeners}`, m2.listeners <= m1.listeners);
  b.check(`nodes-stable ${m1.nodes}→${m2.nodes}`, m2.nodes - m1.nodes < 200);
  b.check(`one-audio-element ${m2.audios}`, m2.audios === 1 && m2.newAudio === 0);
  b.check(`object-urls-released ${m2.urls}`, m2.urls <= 0);
  b.check(`heap-stable ${m1.heapMB}→${m2.heapMB}MB`, m2.heapMB - m1.heapMB < 3);
  b.check("no-errors", b.errors.length === 0);
} };
