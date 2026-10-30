// 页面测试工具：静态服务器 + 无界面 Chrome（CDP），跑本目录下全部 *.scenario.js。
// 用法：node tests/browser/run.js [名字过滤]   有一项 FAIL 或出错，退出码为 1。
// 需要本机装有 Chrome。截图存到 tests/browser/out/（不进仓库）。
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(__dirname, "out");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".txt": "text/plain", ".md": "text/markdown; charset=utf-8" };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve() {
  return http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split("?")[0]); if (u.endsWith("/")) u += "index.html";
    const file = path.join(ROOT, u);
    if (!file.startsWith(ROOT)) { s.writeHead(403); s.end(); return; }
    fs.readFile(file, (e, d) => {
      if (e) { s.writeHead(404, { "Content-Type": TYPES[".html"] }); s.end("<!doctype html><title>blank</title>"); return; }
      s.writeHead(200, { "Content-Type": TYPES[path.extname(u)] || "application/octet-stream" }); s.end(d);
    });
  }).listen(8080);
}

async function runScenario(sc, port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "yc-chrome-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + profile,
    "--no-first-run", "--no-default-browser-check", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
  const results = []; const errors = []; const requests = [];
  let ws, id = 0; const pending = new Map(); const waiters = [];
  try {
    let tabs;
    for (let i = 0; i < 60 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); } }
    ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
      if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
      if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push(d.params.args.map(a => a.value ?? a.description).join(" "));
      if (d.method === "Network.requestWillBeSent") requests.push(d.params.request.url);
      for (const w of waiters.splice(0)) if (w.method === d.method) w.resolve(); else waiters.push(w);
    };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const once = method => new Promise(resolve => waiters.push({ method, resolve }));
    await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
    const media = {};
    const applyMedia = () => send("Emulation.setEmulatedMedia", { features: Object.entries(media).map(([name, value]) => ({ name, value })) });
    const b = {
      errors, requests, send, sleep,
      async viewport(width, height) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 3, mobile: true });
        await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
      },
      async nav(p) { const loaded = once("Page.loadEventFired"); await send("Page.navigate", { url: "http://localhost:8080" + p }); await loaded; await sleep(1500); },
      async ev(expr) {
        const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
        if (r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception?.description || "eval failed") + "\n  in: " + expr.slice(0, 160));
        return r.result.result.value;
      },
      check(label, ok) { results.push([label, ok ? "PASS" : "FAIL"]); console.log(`  ${ok ? "PASS" : "FAIL"} ${label}`); },
      skip(label, why) { results.push([label, "SKIP"]); console.log(`  SKIP ${label} — ${why}`); },
      async media(name, value) { if (value == null) delete media[name]; else media[name] = value; await applyMedia(); },
      dark(on) { return b.media("prefers-color-scheme", on ? "dark" : "light"); },
      reducedMotion(on) { return b.media("prefers-reduced-motion", on ? "reduce" : null); },
      async shot(name) {
        fs.mkdirSync(OUT, { recursive: true });
        const r = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.result.data, "base64"));
      },
      touch(type, x, y) { return send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y }] }); },
    };
    await b.viewport(430, 932);
    await sc.run(b);
  } catch (e) {
    results.push(["(scenario error)", "FAIL"]); console.log("  ERROR " + e.message);
  } finally {
    try { ws && ws.close(); } catch {}
    chrome.kill(); await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
  if (errors.length) console.log("  page errors:", errors);
  return results;
}

(async () => {
  const filter = process.argv[2] || "";
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".scenario.js") && f.includes(filter)).sort();
  const server = serve();
  let fail = 0, pass = 0, skip = 0;
  for (const [i, f] of files.entries()) {
    const sc = require(path.join(__dirname, f));
    console.log(`== ${sc.name || f}`);
    for (const [, r] of await runScenario(sc, 9333 + i)) r === "PASS" ? pass++ : r === "SKIP" ? skip++ : fail++;
  }
  server.close();
  console.log(`\n${pass} pass, ${fail} fail, ${skip} skip`);
  process.exitCode = fail ? 1 : 0;
})();
