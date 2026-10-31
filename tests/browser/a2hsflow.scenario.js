// 开屏和「添加到主屏幕」教程（v0.41 修复）：Safari 里开屏照常放完，淡出以后才弹教程；
// 开屏刚结束时开着别的弹窗或不在首页，等弹窗关掉、回到首页再弹（以前只看一次，错过就不弹了）；从主屏幕打开永远不弹
const F = require("./fixtures.js");
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
// 在页面最早的时候记下：开屏消失的时间、教程弹出的时间、开屏还在时有没有弹过窗
const WATCH = `(() => { window.__a = { sheetDuringSplash: false };
  new MutationObserver(() => { const sp = document.querySelector("#splash"), sh = document.querySelector("#sheet"), now = performance.now();
    if (sp) window.__a.seen = true; else if (window.__a.seen && !window.__a.gone) window.__a.gone = now;
    if (sh && !sh.hidden) { if (sp) window.__a.sheetDuringSplash = true;
      if (!window.__a.a2 && document.querySelector("#sheetBody .a2")) window.__a.a2 = now; }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class"] }); })()`;
// 开屏一消失就打开一个别的弹窗，1.5 秒后关掉
const OTHER_SHEET = `(() => { let done = false; new MutationObserver(() => { if (done || document.querySelector("#splash") || !document.querySelector("#sheet")) return;
  if (!window.__a || !window.__a.seen) return; done = true; const s = document.querySelector("#sheet");
  s.hidden = false; document.querySelector("#sheetBody").innerHTML = "<p>别的弹窗</p>"; window.__a.otherClosed = 0;
  setTimeout(() => { s.hidden = true; window.__a.otherClosed = performance.now(); }, 1500); }).observe(document, { subtree: true, childList: true }); })()`;
const STANDALONE = `Object.defineProperty(navigator, "standalone", { get: () => true });`;
const open = async b => { await b.send("Page.navigate", { url: "http://localhost:8080/" }); await b.sleep(5000); return b.ev("window.__a"); };
const fresh = b => b.ev(`localStorage.removeItem("yc-prefs")`);

module.exports = { name: "a2hsflow", async run(b) {
  await F.seed(b);
  await b.send("Emulation.setUserAgentOverride", { userAgent: IPHONE, platform: "iPhone" });
  const watch = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH });

  // Safari：开屏放完、淡出后才弹（淡出后 0.6 秒左右）
  await fresh(b); let a = await open(b);
  b.check("safari-splash-played", !!a.seen && !!a.gone && a.gone > 1500);
  b.check("safari-popup-after-splash " + JSON.stringify(a), !!a.a2 && !a.sheetDuringSplash && a.a2 > a.gone && a.a2 - a.gone < 1200);

  // 开屏刚结束时开着别的弹窗：等它关掉以后再弹
  await fresh(b);
  const other = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: OTHER_SHEET });
  a = await open(b);
  b.check("waits-for-other-sheet " + JSON.stringify(a), !!a.otherClosed && !!a.a2 && a.a2 > a.otherClosed && a.a2 - a.otherClosed < 1000);
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: other.result.identifier });

  // 开屏刚结束时不在首页：回到首页再弹
  await fresh(b); await b.send("Page.navigate", { url: "http://localhost:8080/" });
  for (let i = 0; i < 100 && !(await b.ev(`!!(window.__a && window.__a.gone)`)); i++) await b.sleep(20);
  await b.ev(`document.querySelector("#btnSettings").click()`); await b.sleep(1500);
  b.check("not-on-settings-page", (await b.ev(`document.querySelector("#sheet").hidden`)));
  await b.ev(`history.back()`); await b.sleep(1500);
  b.check("pops-back-on-home", !!(await b.ev(`document.querySelector("#sheetBody .a2") && !document.querySelector("#sheet").hidden`)));

  // 主屏幕模式：永远不弹
  await fresh(b);
  const sa = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: STANDALONE });
  a = await open(b);
  b.check("standalone-never " + JSON.stringify(a), !!a.gone && !a.a2 && (await b.ev(`document.querySelector("#sheet").hidden`)));
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: sa.result.identifier });

  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: watch.result.identifier });
  await b.send("Emulation.setUserAgentOverride", { userAgent: "" });
  b.check("no-errors", b.errors.length === 0);
} };
