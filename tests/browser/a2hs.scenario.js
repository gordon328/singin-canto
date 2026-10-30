// 添加到主屏幕教程（v0.38）：只在 iPhone Safari、不是从主屏幕打开时第一次自动弹出；分步骤（截图 + 一句说明，截图还没有时用文字占位）；
// 最后一步讲清楚数据分开 + 「现在导出备份」；「我知道了」「继续用网页」之后不再自动弹；设置页开关和「查看教程」（主屏幕模式不显示）；
// 数据组下面那行提示点了打开教程
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const sheet = `(() => { const s = document.querySelector("#sheet"); return s.hidden ? "" : document.querySelector("#sheetBody").innerText.replace(/\\s+/g, " "); })()`;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const LAST = "Safari 和主屏幕 App 的数据是分开的。如果已经在 Safari 里导入过歌，请先在这里导出备份，再到主屏幕 App 的设置里恢复（音频需要重新选择）";
const ua = (b, u) => b.send("Emulation.setUserAgentOverride", { userAgent: u, platform: "iPhone" });

module.exports = { name: "a2hs", async run(b) {
  await F.seed(b);
  // 电脑浏览器：不自动弹
  b.check("desktop-no-popup", (await b.ev(sheet)) === "");
  // iPhone 上的 Chrome：不弹（只在 Safari 里）
  await ua(b, IPHONE_CHROME); await b.nav("/"); await b.sleep(1200);
  b.check("ios-chrome-no-popup", (await b.ev(sheet)) === "");
  // iPhone Safari 第一次打开：自动弹出
  await ua(b, IPHONE); await b.nav("/"); await b.sleep(1500);
  let s = await b.ev(sheet);
  b.check("first-open-popup " + s.slice(0, 60), s.includes("添加到主屏幕") && s.includes("我知道了") && s.includes("继续用网页"));
  const steps = await b.ev(`document.querySelectorAll("#sheetBody .a2-step").length`);
  b.check("steps-with-dots " + steps, steps >= 3 && (await b.ev(`document.querySelectorAll("#sheetBody .a2-dots i").length`)) === steps);
  b.check("placeholder-when-no-screenshot", await b.ev(`[...document.querySelectorAll("#sheetBody .a2-step")].every(st => !!st.querySelector(".a2-shot"))`)
    && (await b.ev(`document.querySelector("#sheetBody .a2-shot").innerText`)).includes("截图"));
  b.check("44px", await b.ev(`[...document.querySelectorAll("#sheetBody .btn")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  b.check("no-overflow", await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot("a2hs-step1");
  // 「下一步」翻到最后一步：数据分开的说明 + 「现在导出备份」
  for (let i = 1; i < steps; i++) { await b.ev(click("#sheetBody [data-a2='next']")); await b.sleep(500); }
  const last = await b.ev(`document.querySelector("#sheetBody .a2-step:last-child").innerText.replace(/\\s+/g, " ")`);
  b.check("last-step-text", last.includes(LAST));
  b.check("last-step-visible", await b.ev(`(() => { const t = document.querySelector("#sheetBody .a2-track"), l = document.querySelector("#sheetBody .a2-step:last-child"); return Math.abs(t.getBoundingClientRect().left - l.getBoundingClientRect().left) < 2; })()`)
    && (await b.ev(`document.querySelectorAll("#sheetBody .a2-dots i.on").length`)) === 1 && await b.ev(`document.querySelectorAll("#sheetBody .a2-dots i")[${steps - 1}].classList.contains("on")`));
  await b.shot("a2hs-last");
  // 现在导出备份：用分享面板导出（和设置页同一个功能）
  const got = await b.ev(`(async () => { let f = null; navigator.canShare = () => true; navigator.share = async d => { f = d.files[0]; };
    document.querySelector("#sheetBody [data-a2='export']").click(); await new Promise(r => setTimeout(r, 400)); return f ? f.name : null; })()`);
  b.check("export-now " + got, !!got && got.startsWith("唱学粤语备份-") && (await b.ev(F.idbGet("meta", "backup")))?.at > 0);
  // 我知道了：关掉，之后不再自动弹
  await b.ev(click("#sheetBody [data-a2='ok']")); await b.sleep(600);
  b.check("closed", (await b.ev(sheet)) === "");
  await b.nav("/"); await b.sleep(1500);
  b.check("not-again", (await b.ev(sheet)) === "");

  // 设置页：「提示添加到主屏幕」开关（现在是关）和「查看教程」
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("settings-rows", await b.ev(visible("#a2hsSw")) && await b.ev(visible("#a2hsOpen"))
    && (await b.ev(`document.querySelector("#a2hsSw").getAttribute("aria-checked")`)) === "false");
  await b.ev(click("#a2hsOpen")); await b.sleep(600);
  b.check("view-tutorial", (await b.ev(sheet)).includes("添加到主屏幕"));
  await b.ev(click("#sheetBody [data-a2='web']")); await b.sleep(600);
  // 数据组下面那行提示：点了打开教程
  b.check("tip-is-button", (await b.ev(`document.querySelector("#bkTip").tagName`)) === "BUTTON" && (await b.ev(`document.querySelector("#bkTip").innerText.trim()`)) === "建议添加到主屏幕使用，数据更不容易丢失");
  await b.ev(click("#bkTip")); await b.sleep(600);
  b.check("tip-opens-tutorial", (await b.ev(sheet)).includes("添加到主屏幕"));
  await b.ev(click("#sheetBody [data-a2='web']")); await b.sleep(600);
  // 打开开关：下次打开又会弹；「继续用网页」也会关掉开关
  await b.ev(click("#a2hsSw")); await b.sleep(200);
  b.check("switch-on", (await b.ev(`document.querySelector("#a2hsSw").getAttribute("aria-checked")`)) === "true");
  await b.nav("/"); await b.sleep(1500);
  b.check("pops-when-on", (await b.ev(sheet)).includes("添加到主屏幕"));
  await b.ev(click("#sheetBody [data-a2='web']")); await b.sleep(600);
  await b.nav("/"); await b.sleep(1500);
  b.check("web-also-stops", (await b.ev(sheet)) === "");

  // 主屏幕模式：设置页没有这两项，也不弹、不显示那行提示
  const hook = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `Object.defineProperty(navigator, "standalone", { get: () => true });` });
  await b.ev(`localStorage.setItem("yc-prefs", JSON.stringify({ ...JSON.parse(localStorage.getItem("yc-prefs") || "{}"), a2hs: true }))`);
  await b.nav("/"); await b.sleep(1500);
  b.check("standalone-no-popup", (await b.ev(sheet)) === "");
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("standalone-no-rows", !(await b.ev(visible("#a2hsSw"))) && !(await b.ev(visible("#a2hsOpen"))) && !(await b.ev(visible("#bkTip"))));
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: hook.result.identifier });
  await b.send("Emulation.setUserAgentOverride", { userAgent: "" });
  b.check("no-errors", b.errors.filter(e => !/a2hs\/step\d\.png|404|Failed to load resource/.test(e)).length === 0);
} };
