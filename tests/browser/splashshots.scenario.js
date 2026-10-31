// 开屏检查截图（v0.40，给开发者看，存在 tests/browser/out/splash/）：
// 1) 开屏最后一帧里的图标 vs apple-touch-icon.png 套上 iOS 连续圆角，放大并排 + 差异图
// 2) 440×956 深色、浅色各一组连续帧（把动画定格在各个时间点）  3) 375×667 最后一帧
const fs = require("fs"), path = require("path");
const F = require("./fixtures.js");
const OUT = path.join(__dirname, "out/splash");
// 数据读得慢（打开数据库晚 20 秒），开屏会停在完整画面，方便定格截图
const SLOW_DB = `(() => { const open = indexedDB.open.bind(indexedDB); indexedDB.open = (...a) => { const r = open(...a), fake = {};
  for (const ev of ["success", "error", "upgradeneeded", "blocked"]) r["on" + ev] = e => setTimeout(() => fake["on" + ev] && fake["on" + ev].call(r, e), ev === "upgradeneeded" ? 0 : 20000);
  return new Proxy(r, { set(t, k, v) { if (/^on/.test(k)) { fake[k] = v; return true; } t[k] = v; return true; }, get(t, k) { const v = t[k]; return typeof v === "function" ? v.bind(t) : v; } }); }; })()`;
const TIMES = [0, 100, 200, 300, 400, 500, 600, 700, 800, 950, 1100, 1250, 1450];

module.exports = { name: "splashshots", async run(b) {
  fs.mkdirSync(OUT, { recursive: true });
  const save = (name, data) => fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(data, "base64"));
  const shot = async (name, clip) => save(name, (await b.send("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}) })).result.data);
  await F.seed(b);
  const slow = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: SLOW_DB });
  const open = async () => { await b.send("Page.navigate", { url: "http://localhost:8080/" }); await b.sleep(600); await b.ev(`window.hideSplash = () => {}`); // 截图期间不让开屏淡出
    await b.ev(`document.fonts.ready.then(() => true)`); };
  // 把开屏所有动画定格在 t 毫秒（t 从开屏出现开始算）
  const seek = t => b.ev(`(() => { const a = document.querySelector("#splash").getAnimations({ subtree: true }); a.forEach(x => { x.pause(); x.currentTime = ${t}; }); return a.length; })()`);

  for (const [mode, dark] of [["light", false], ["dark", true]]) {
    await b.viewport(440, 956); await b.dark(dark); await open();
    for (const t of TIMES) { await seek(t); await b.sleep(80); await shot(`${mode}-440x956-${String(t).padStart(4, "0")}ms`); }
  }
  await b.dark(false);

  // 小屏最后一帧
  await b.viewport(375, 667); await open(); await seek(1450); await b.sleep(80); await shot("light-375x667-final");
  const small = await b.ev(`(() => { const r = document.querySelector(".sp-box").getBoundingClientRect(), i = document.querySelector(".sp-icon").getBoundingClientRect(), n = document.querySelector(".sp-name").getBoundingClientRect();
    return { box: [r.left, r.top, r.width, r.height], icon: [i.width, i.height], name: [n.left, n.width, n.top - i.bottom] }; })()`);
  b.check("small-screen " + JSON.stringify(small), Math.abs(small.box[0] + small.box[2] / 2 - 187.5) < 0.5 && Math.abs(small.box[1] + small.box[3] / 2 - (667 / 2 - 24)) < 0.5
    && small.icon.join() === "96,96" && Math.abs(small.name[2] - 20) < 0.01);

  // 图标对比：开屏最后一帧的图标（3 倍屏 = 288px）
  await b.viewport(440, 956); await open(); await seek(1450); await b.sleep(80);
  const ic = await b.ev(`(r => [r.left, r.top, r.width, r.height])(document.querySelector(".sp-icon").getBoundingClientRect())`);
  const splashPng = (await b.send("Page.captureScreenshot", { format: "png", clip: { x: ic[0], y: ic[1], width: ic[2], height: ic[3], scale: 1 } })).result.data;
  save("icon-splash-final-288px", splashPng);
  // 并排页面：左 = 开屏截图；中 = apple-touch-icon.png 套上 iOS 连续圆角（和 splash-icon.svg 同一条外形路径）；右 = 差异 ×4
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: slow.result.identifier });
  await b.viewport(1300, 560); await b.dark(false);
  await b.send("Page.navigate", { url: "http://localhost:8080/__blank" }); await b.sleep(500);
  const shape = fs.readFileSync(path.join(__dirname, "../../icons/splash-icon.svg"), "utf8").match(/<clipPath id="sc-shape"><path d="([^"]+)"/)[1];
  const stats = await b.ev(`(async () => {
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const N = 288, a = await load("data:image/png;base64,${splashPng}"), t = await load("/icons/apple-touch-icon.png");
    const cv = () => { const c = document.createElement("canvas"); c.width = c.height = N; return c; };
    const bg = "#F7F6FB", clip = new Path2D(${JSON.stringify(shape)});
    const A = cv(), B = cv(), D = cv(); const ca = A.getContext("2d"), cb = B.getContext("2d"), cd = D.getContext("2d");
    ca.drawImage(a, 0, 0, N, N);
    cb.fillStyle = bg; cb.fillRect(0, 0, N, N); cb.save(); cb.scale(N / 100, N / 100); cb.clip(clip); cb.setTransform(1, 0, 0, 1, 0, 0); cb.imageSmoothingQuality = "high"; cb.drawImage(t, 0, 0, N, N); cb.restore();
    const pa = ca.getImageData(0, 0, N, N).data, pb = cb.getImageData(0, 0, N, N).data, out = cd.createImageData(N, N);
    let sum = 0, max = 0, big = 0;
    for (let i = 0; i < pa.length; i += 4) { let m = 0; for (let k = 0; k < 3; k++) { const d = Math.abs(pa[i + k] - pb[i + k]); sum += d; m = Math.max(m, d); }
      max = Math.max(max, m); if (m > 48) big++; const v = Math.min(255, m * 4); out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255; }
    cd.putImageData(out, 0, 0);
    document.body.style.cssText = "margin:0;background:" + bg + ";font:16px -apple-system,sans-serif;color:#221F33";
    document.body.innerHTML = '<div style="display:flex;gap:40px;padding:40px">' + [["开屏最后一帧（截图）", A], ["apple-touch-icon.png + iOS 圆角", B], ["差异 ×4（越黑越一样）", D]]
      .map(([l, c]) => '<figure style="margin:0;text-align:center"><img src="' + c.toDataURL() + '" style="width:384px;height:384px;image-rendering:auto"><figcaption style="margin-top:12px">' + l + '</figcaption></figure>').join("") + '</div>';
    await new Promise(r => setTimeout(r, 200));
    return { meanDiff: sum / (N * N * 3), maxDiff: max, pxOver48: big, pxTotal: N * N }; })()`);
  await shot("icon-compare");
  // 正常读数据：淡出开始后约 0.12 秒截一张（首页已经在下面画好），再截淡出后的首页
  await b.viewport(440, 956);
  for (const [mode, dark] of [["light", false], ["dark", true]]) { await b.dark(dark);
    await b.send("Page.navigate", { url: "http://localhost:8080/" });
    await b.sleep(300); // 淡出一开始就定格在一半（0.125 秒），先不让它删掉
    await b.ev(`new Promise(res => { const sp = document.querySelector("#splash"); sp.remove = () => {}; const t = setInterval(() => { if (!sp.classList.contains("out")) return; const x = sp.getAnimations()[0]; if (!x) return; clearInterval(t); x.pause(); x.currentTime = 125; requestAnimationFrame(() => requestAnimationFrame(res)); }, 5); })`);
    await shot(`${mode}-440x956-1575ms-fading`);
    await b.ev(`document.querySelector("#splash").getAnimations()[0].finish(); Element.prototype.remove.call(document.querySelector("#splash"))`); await b.sleep(300); await shot(`${mode}-440x956-1700ms-home`); }
  await b.dark(false);
  console.log("  icon diff", JSON.stringify(stats));
  b.check("icon-matches-apple-touch-icon " + JSON.stringify(stats), stats.meanDiff < 3 && stats.pxOver48 / stats.pxTotal < 0.01);
  // 连续帧总览：每组一张（时间标在下面）
  for (const mode of ["light", "dark"]) {
    const files = fs.readdirSync(OUT).filter(f => f.startsWith(mode + "-440x956-")).sort();
    const cells = files.map(f => [f.replace(mode + "-440x956-", "").replace(".png", ""), fs.readFileSync(path.join(OUT, f)).toString("base64")]);
    await b.viewport(1640, 1240); await b.send("Page.navigate", { url: "http://localhost:8080/__blank" }); await b.sleep(300);
    await b.ev(`(async () => { const c = ${JSON.stringify(cells)}; document.body.style.cssText = "margin:0;padding:16px;background:#888;font:13px -apple-system,sans-serif;color:#fff";
      document.body.innerHTML = '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px">' + c.map(([t, d]) => '<figure style="margin:0;text-align:center"><img src="data:image/png;base64,' + d + '" style="width:100%;display:block;border-radius:6px"><figcaption>' + t + '</figcaption></figure>').join("") + '</div>';
      await Promise.all([...document.images].map(i => i.decode())); return true; })()`);
    await shot(`sheet-${mode}-440x956`);
  }
  b.check("no-errors", b.errors.length === 0);
} };
