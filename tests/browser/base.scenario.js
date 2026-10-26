// 设计变量、字体、输入框、按钮高度、box-sizing
const F = require("./fixtures.js");
const tok = n => `getComputedStyle(document.documentElement).getPropertyValue("${n}").trim().toUpperCase()`;
// 页面上所有可见按钮里高度不到 44px 的（歌词里的字 .c、读音候选 .cand 除外）
const SMALL_BTNS = `[...document.querySelectorAll("button,.btn")].filter(e => e.offsetParent && !e.closest(".c") && !e.classList.contains("cand"))
  .filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className || e.tagName) + ":" + Math.round(e.getBoundingClientRect().height))`;
module.exports = { name: "base", SMALL_BTNS, async run(b) {
  await F.seed(b);
  b.check("tokens-light", (await b.ev(tok("--bg"))) === "#F7F6FB" && (await b.ev(tok("--accent"))) === "#5B4BDB");
  await b.dark(true);
  b.check("tokens-dark", (await b.ev(tok("--bg"))) === "#15131F" && (await b.ev(tok("--accent"))) === "#8E80FF" && (await b.ev(tok("--t1"))) === "#FF7A70");
  await b.dark(false);
  const oldFonts = `[...document.querySelectorAll("*")].map(e => getComputedStyle(e).fontFamily).filter(f => /Noto Serif|JetBrains/.test(f)).length`;
  b.check("box-sizing", (await b.ev(`getComputedStyle(document.querySelector(".song")).boxSizing`)) === "border-box");
  const smallHome = await b.ev(SMALL_BTNS);
  b.check("buttons-44px home " + smallHome.join(" "), smallHome.length === 0);
  let old = await b.ev(oldFonts);
  await b.ev(`document.querySelector("#btnAdd").click()`); await b.sleep(500);
  b.check("inputs-16px", await b.ev(`[...document.querySelectorAll("input[type=text],textarea")].every(e => parseFloat(getComputedStyle(e).fontSize) >= 16)`));
  const smallImport = await b.ev(SMALL_BTNS);
  b.check("buttons-44px import " + smallImport.join(" "), smallImport.length === 0);
  old += await b.ev(oldFonts);
  await b.nav("/"); await F.openSong(b, "t1");
  old += await b.ev(oldFonts);
  b.check("no-old-fonts", old === 0);
} };
