// 要输入文字的界面不放在底部弹窗里（设计规范 5.16，v0.36）：兑换码、词汇包都是整页；兑换码页输入框在上方、自动聚焦，
// 「兑换」紧跟在下面；键盘弹出（可见区域变矮）时输入框和按钮都完整可见；失败提示在输入框下面；成功关掉弹窗后回到设置页
const fs = require("fs"), path = require("path");
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const rect = sel => `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height }; })()`;
const sheet = `(() => { const s = document.querySelector("#sheet"); return s.hidden ? "" : document.querySelector("#sheetBody").innerText.replace(/\\s+/g, " "); })()`;

module.exports = { name: "inputpages", async run(b) {
  // ---- 规则：代码里所有底部弹窗（openSheet）的内容都不带文字输入框 ----
  const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
  const bad = [];
  for (let i = html.indexOf("openSheet(`"); i >= 0; i = html.indexOf("openSheet(`", i + 1)) {
    let depth = 0, j = i + 11;
    for (; j < html.length; j++) { // 找到这段模板字符串的结尾（跳过里面 ${…} 的嵌套）
      if (html[j] === "\\") { j++; continue; }
      if (html.startsWith("${", j)) { depth++; j++; continue; }
      if (html[j] === "}" && depth) { depth--; continue; }
      if (html[j] === "`" && !depth) break;
      if (html[j] === "`" && depth) { const k = html.indexOf("`", j + 1); if (k > 0) j = k; }
    }
    const tpl = html.slice(i, j);
    if (/<textarea|<input(?![^>]*type="(file|range|checkbox|radio)")/.test(tpl)) bad.push(tpl.slice(11, 50).replace(/\s+/g, " "));
  }
  b.check("no-text-input-in-sheets " + bad.join(" | "), bad.length === 0);

  await F.seed(b);
  await b.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await b.ev(F.addTestCode("TEST-PAGE-2345-ABCD", ["skin:night"]));

  // ---- 兑换码：整页，从右边滑进来，输入框自动聚焦 ----
  await b.ev(click("#btnSettings")); await b.sleep(800);
  const h0 = await b.ev("history.length");
  await b.ev(click("#btnRedeem")); await b.sleep(250);
  b.check("slides-in", await b.ev(`document.querySelector("#redeemView").classList.contains("enter-fwd")`));
  await b.sleep(700);
  b.check("redeem-page", await b.ev(visible("#redeemView")) && (await b.ev("history.state.view")) === "redeemView" && (await b.ev("history.length")) === h0 + 1
    && (await b.ev(`document.querySelector("#sheet").hidden`)));
  b.check("autofocus", (await b.ev(`document.activeElement && document.activeElement.id`)) === "rdIn");
  b.check("no-stray-inputs", (await b.ev(`document.querySelectorAll("body > input").length`)) === 0);
  const inp = await b.ev(rect("#rdIn")), btn = await b.ev(rect("#rdGo")), msg = await b.ev(rect("#rdMsg"));
  b.check("input-near-top " + inp.top, inp.top < 220);
  b.check("button-right-below " + JSON.stringify([inp.bottom, msg.top, btn.top]), msg.top >= inp.bottom && btn.top >= msg.bottom && btn.top - inp.bottom <= 64
    && (await b.ev(`getComputedStyle(document.querySelector("#rdGo")).position`)) !== "fixed");
  // 键盘弹出：可见区域只剩上面 420px（iPhone 上键盘大约占下面一半），输入框和按钮都完整可见
  await b.viewport(430, 420); await b.sleep(300);
  const btn2 = await b.ev(rect("#rdGo")), inp2 = await b.ev(rect("#rdIn"));
  b.check("visible-with-keyboard " + JSON.stringify([inp2.top, btn2.bottom]), inp2.top >= 0 && btn2.bottom <= 420);
  await b.viewport(430, 932); await b.sleep(200);
  await b.shot("redeem-page");
  // 失败：提示在输入框下面
  await b.ev(`(() => { const i = document.querySelector("#rdIn"); i.value = "TEST-NOPE-0000-0000"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev(click("#rdGo")); await b.sleep(600);
  const m = await b.ev(`document.querySelector("#rdMsg").innerText`), mr = await b.ev(rect("#rdMsg"));
  b.check("error-below-input " + m, m === "兑换码无效，请检查后重试" && mr.top >= inp.bottom && mr.bottom <= btn.top + 1 && (await b.ev(visible("#redeemView"))));
  b.check("button-not-moved", Math.abs((await b.ev(rect("#rdGo"))).top - btn.top) < 1);
  await b.shot("redeem-page-error");
  // 成功：弹「兑换成功」，关掉后回到设置页
  await b.ev(`(() => { const i = document.querySelector("#rdIn"); i.value = "test page 2345 abcd"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev(click("#rdGo")); await b.sleep(1200);
  b.check("success-popup " + (await b.ev(sheet)), (await b.ev(sheet)).includes("兑换成功") && (await b.ev(`document.activeElement && document.activeElement.id`)) !== "rdIn");
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(1300);
  b.check("back-to-settings", (await b.ev("history.state.view")) === "settingsView" && await b.ev(visible("#settingsView")) && !(await b.ev(visible("#redeemView"))));
  // 右滑（系统返回）也能回去
  await b.ev(click("#btnRedeem")); await b.sleep(900);
  await b.ev("history.back()"); await b.sleep(900);
  b.check("swipe-back", await b.ev(visible("#settingsView")));

  // ---- 词汇包：整页（歌曲页「⋯」进入），粘贴框在页面里 ----
  await F.openSong(b, "t1");
  await b.ev(click("#btnMenu")); await b.sleep(400); await b.ev(click('[data-menu="pack"]')); await b.sleep(900);
  b.check("pack-page", await b.ev(visible("#packView")) && (await b.ev("history.state.view")) === "packView" && (await b.ev(`document.querySelector("#sheet").hidden`))
    && await b.ev(visible("#packIn")) && (await b.ev(`document.querySelector("#packView").innerText`)).includes("复制提示词"));
  b.check("pack-no-overflow", await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot("pack-page");
  await b.ev("history.back()"); await b.sleep(1000);
  b.check("pack-back-to-song", await b.ev(visible("#playerView")));
  b.check("no-errors", b.errors.length === 0);
} };
