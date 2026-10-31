// 添加到主屏幕教程（v0.38；v0.41 换成开发者的截图；v0.42 按设计画布重排）：只在 iPhone Safari、不是从主屏幕打开时第一次自动弹出；
// 三步，每步一个一样大的截图展台 + 「第 N 步」+ 操作说明；第 3 步下面存储提醒，「导出备份」是链接；主按钮前两步「下一步」、第 3 步「我知道了」，
// 下面只有「继续用网页」；「我知道了」「继续用网页」之后不再自动弹；设置页开关和「查看教程」（主屏幕模式不显示）；数据组下面那行提示点了打开教程
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const sheet = `(() => { const s = document.querySelector("#sheet"); return s.hidden ? "" : document.querySelector("#sheetBody").innerText.replace(/\\s+/g, " "); })()`;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const LAST = "Safari 和主屏幕里的数据是分开的。在 Safari 里已经有歌的话，先导出备份，再到主屏幕 App 里恢复。";
const TEXTS = ["点底部的「分享」按钮", "往下滑，选「添加到主屏幕」", "名字保留 Singin’ Canto，点右上角「添加」"];
const IMGS = [["img/a2hs/1-share.jpg", 750, 890], ["img/a2hs/2-add-to-home.jpg", 750, 1131], ["img/a2hs/3-add.jpg", 750, 555]];
const ua = (b, u) => b.send("Emulation.setUserAgentOverride", { userAgent: u, platform: "iPhone" });
const goText = `document.querySelector("#sheetBody [data-a2='go']").innerText.trim()`;
const goTopExpr = `document.querySelector("#sheetBody [data-a2='go']").getBoundingClientRect().top`;

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
  b.check("first-open-popup " + s.slice(0, 60), s.includes("添加到主屏幕") && s.includes("继续用网页"));
  const steps = await b.ev(`document.querySelectorAll("#sheetBody .a2-step").length`);
  b.check("steps-with-dots " + steps, steps === 3 && (await b.ev(`document.querySelectorAll("#sheetBody .a2-dots i").length`)) === steps);
  b.check("title-sub", (await b.ev(`document.querySelector("#sheetBody .a2 h3").innerText`)) === "添加到主屏幕" && (await b.ev(`document.querySelector("#sheetBody .a2-sub").innerText`)) === "跟着截图里的红框按，一共 3 步");
  b.check("step-numbers", JSON.stringify(await b.ev(`[...document.querySelectorAll("#sheetBody .a2-no")].map(e => e.innerText)`)) === JSON.stringify(["第 1 步", "第 2 步", "第 3 步"]));
  b.check("step-texts", JSON.stringify(await b.ev(`[...document.querySelectorAll("#sheetBody .a2-text")].map(e => e.innerText)`)) === JSON.stringify(TEXTS));
  // 底部只有两个按钮：主按钮（下一步）和「继续用网页」
  b.check("two-buttons", (await b.ev(`[...document.querySelectorAll("#sheetBody .btn")].filter(e => e.getClientRects().length).map(e => e.innerText.trim()).join("|")`)) === "下一步|继续用网页");
  // 字号、间距（设计稿数值）
  const ty = await b.ev(`(() => { const q = s => document.querySelector("#sheetBody " + s), cs = s => getComputedStyle(q(s)), r = s => q(s).getBoundingClientRect();
    return { h3: cs(".a2 h3").fontSize + " " + cs(".a2 h3").fontWeight, sub: cs(".a2-sub").fontSize, subGap: Math.round(r(".a2-sub").top - r(".a2 h3").bottom), stageGap: Math.round(r(".a2-stage").top - r(".a2-sub").bottom),
      noGap: Math.round(r(".a2-no").top - r(".a2-stage").bottom), no: cs(".a2-no").fontSize + " " + cs(".a2-no").fontWeight,
      text: cs(".a2-text").fontSize + " " + cs(".a2-text").fontWeight + " " + cs(".a2-text").lineHeight, textGap: Math.round(r(".a2-text").top - r(".a2-no").bottom),
      dotsToGo: Math.round(r("[data-a2='go']").top - r(".a2-dots").bottom), radius: cs(".a2-stage").borderRadius, pad: cs(".a2-stage").padding, imgRadius: cs(".a2-stage img").borderRadius }; })()`);
  b.check("type-spacing " + JSON.stringify(ty), ty.h3 === "22px 700" && ty.sub === "15px" && ty.subGap === 6 && ty.stageGap === 24 && ty.noGap === 24 && ty.no === "14px 700" && ty.text === "19px 700 26.6px" && ty.textGap === 8
    && ty.dotsToGo === 20 && ty.radius === "22px" && ty.pad === "20px" && ty.imgRadius === "14px");
  await b.ev(`Promise.all([...document.querySelectorAll("#sheetBody .a2-stage img")].map(i => i.decode()))`);
  const st = await b.ev(`[...document.querySelectorAll("#sheetBody .a2-stage")].map(e => { const r = e.getBoundingClientRect(), i = e.querySelector("img"), ir = i.getBoundingClientRect(), stp = e.closest(".a2-step").getBoundingClientRect();
    return { src: i.getAttribute("src"), nw: i.naturalWidth, nh: i.naturalHeight, w: r.width, h: r.height, stepW: stp.width, iw: ir.width, ih: ir.height,
      cx: (ir.left + ir.right) / 2 - (r.left + r.right) / 2, cy: (ir.top + ir.bottom) / 2 - (r.top + r.bottom) / 2, inside: ir.left >= r.left + 19.5 && ir.right <= r.right - 19.5 && ir.top >= r.top + 19.5 && ir.bottom <= r.bottom - 19.5,
      bg: getComputedStyle(e).backgroundColor }; })`);
  b.check("images " + JSON.stringify(st.map(x => [x.src, x.nw, x.nh])), st.every((x, k) => x.src === IMGS[k][0] && x.nw === IMGS[k][1] && x.nh === IMGS[k][2]));
  // 三个展台一样大（翻页版面不跳），宽度占满；440×932 下高 340 左右
  b.check("stages-same-size " + JSON.stringify(st.map(x => [Math.round(x.w), Math.round(x.h)])), st.every(x => Math.abs(x.w - st[0].w) < 0.5 && Math.abs(x.h - st[0].h) < 0.5 && Math.abs(x.w - x.stepW) < 0.5) && st[0].h > 320 && st[0].h <= 340);
  b.check("stage-bg-lilac-light " + st[0].bg, st[0].bg === "rgb(241, 239, 248)");
  // 截图按原比例完整显示、居中，在内边距里面
  b.check("img-fit-centered " + JSON.stringify(st.map(x => [Math.round(x.iw), Math.round(x.ih)])), st.every(x => Math.abs(x.iw / x.ih - x.nw / x.nh) < 0.01 && Math.abs(x.cx) < 0.5 && Math.abs(x.cy) < 0.5 && x.inside));
  // 图片加载前也占好位置（img 带 width/height，展台高度固定）
  b.check("space-reserved", await b.ev(`[...document.querySelectorAll("#sheetBody .a2-stage img")].every(i => i.getAttribute("width") && i.getAttribute("height"))`));
  b.check("44px", await b.ev(`[...document.querySelectorAll("#sheetBody .btn")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  b.check("no-overflow", await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot("a2hs-step1");
  // 主按钮「下一步」翻页，按钮位置不动；最后一步变成「我知道了」
  const goTop = await b.ev(goTopExpr);
  for (let i = 1; i < steps; i++) { await b.ev(click("#sheetBody [data-a2='go']")); await b.sleep(600); }
  b.check("last-step-button " + (await b.ev(goText)), (await b.ev(goText)) === "我知道了" && Math.abs((await b.ev(goTopExpr)) - goTop) < 0.5);
  const last = await b.ev(`document.querySelector("#sheetBody .a2-step:last-child .a2-store").innerText`);
  b.check("last-step-text " + last, last === LAST);
  b.check("export-is-link", (await b.ev(`(() => { const l = document.querySelector("#sheetBody .a2-store [data-a2='export']"); return !!l && l.innerText === "导出备份" && getComputedStyle(l).fontWeight === "700"; })()`))
    && (await b.ev(`document.querySelectorAll("#sheetBody [data-a2='export']").length`)) === 1);
  b.check("last-step-visible", await b.ev(`(() => { const t = document.querySelector("#sheetBody .a2-track"), l = document.querySelector("#sheetBody .a2-step:last-child"); return Math.abs(t.getBoundingClientRect().left - l.getBoundingClientRect().left) < 2; })()`)
    && (await b.ev(`document.querySelectorAll("#sheetBody .a2-dots i.on").length`)) === 1 && await b.ev(`document.querySelectorAll("#sheetBody .a2-dots i")[${steps - 1}].classList.contains("on")`));
  await b.shot("a2hs-last");
  // 「导出备份」链接：用分享面板导出（和设置页同一个功能）
  const got = await b.ev(`(async () => { let f = null; navigator.canShare = () => true; navigator.share = async d => { f = d.files[0]; };
    document.querySelector("#sheetBody [data-a2='export']").click(); await new Promise(r => setTimeout(r, 400)); return f ? f.name : null; })()`);
  b.check("export-now " + got, !!got && got.startsWith("唱学粤语备份-") && (await b.ev(F.idbGet("meta", "backup")))?.at > 0);
  // 往回滑到第 1 步：主按钮变回「下一步」（左右滑动切换）
  await b.ev(`document.querySelector("#sheetBody .a2-track").scrollTo({ left: 0 })`); await b.sleep(300);
  b.check("swipe-back-next", (await b.ev(goText)) === "下一步");
  await b.ev(`(() => { const t = document.querySelector("#sheetBody .a2-track"); t.scrollTo({ left: t.scrollWidth }); })()`); await b.sleep(300);
  // 我知道了：关掉，之后不再自动弹
  await b.ev(click("#sheetBody [data-a2='go']")); await b.sleep(600);
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
  b.check("no-errors", b.errors.length === 0);
} };
