// M2 验收反馈：歌词输入框高度和间距、系统右滑和 App 右滑重叠、歌词换行
const F = require("./fixtures.js");
const visible = id => `!!document.querySelector("#${id}") && !document.querySelector("#${id}").hidden`;
// 每句歌词按行分组，找出：标点在行首、一个词被拆到两行、最后一行只剩一个字
const WRAP_PROBLEMS = `(() => { const bad = [];
  if (!document.querySelector("#lyrics .c[data-w]")) bad.push("歌词里没有词的分组标记 data-w");
  document.querySelectorAll("#lyrics .line").forEach(line => {
    const cs = [...line.querySelectorAll(".c")]; const row = c => Math.round(c.getBoundingClientRect().top);
    cs.forEach((c, i) => { if (i && c.classList.contains("punct") && row(c) !== row(cs[i - 1])) bad.push(line.dataset.li + ":标点在行首:" + c.innerText.trim()); });
    const groups = {}; cs.forEach(c => { if (c.dataset.w) (groups[c.dataset.w] ||= new Set()).add(row(c)); });
    for (const [w, rows] of Object.entries(groups)) if (rows.size > 1) bad.push(line.dataset.li + ":词被拆开:" + w);
    const han = cs.filter(c => !c.classList.contains("punct")); const rows = [...new Set(han.map(row))];
    if (rows.length > 1 && han.filter(c => row(c) === rows[rows.length - 1]).length < 2) bad.push(line.dataset.li + ":最后一行只剩一个字");
  }); return bad; })()`;
module.exports = { name: "accept", async run(b) {
  await F.seed(b);
  // 1. 歌词输入框：灰色说明文字（placeholder）要完整放得下；下面状态文字留出间距
  await b.viewport(375, 812);
  await b.ev(`document.querySelector("#btnAdd").click()`); await b.sleep(600);
  const ta = await b.ev(`(() => { const t = document.querySelector("#fLyrics"); const ph = t.placeholder; t.value = ph; const r = { sh: t.scrollHeight, ch: t.clientHeight }; t.value = ""; return r; })()`);
  b.check("textarea-fits-placeholder " + JSON.stringify(ta), ta.sh <= ta.ch);
  await b.ev(`(() => { const t = document.querySelector("#fLyrics"); t.value = "第一句\\n第二句"; t.dispatchEvent(new Event("input")); })()`); await b.sleep(200);
  const gap = await b.ev(`document.querySelector("#lyricsInfo").getBoundingClientRect().top - document.querySelector("#fLyrics").getBoundingClientRect().bottom`);
  b.check("textarea-gap-below " + Math.round(gap), gap >= 12);
  await b.nav("/");

  // 3. 歌词换行（320 宽，逼它换行）
  await b.viewport(320, 700);
  await F.openSong(b, "t1");
  const probs = await b.ev(WRAP_PROBLEMS);
  const wrapped = await b.ev(`[...document.querySelectorAll("#lyrics .line")].filter(l => new Set([...l.querySelectorAll(".c")].map(c => Math.round(c.getBoundingClientRect().top))).size > 1).length`);
  b.check(`lyric-wrapping (${wrapped} 句换了行) ` + probs.join(" "), wrapped >= 2 && probs.length === 0);
  await b.ev(`document.querySelector('[data-play="14"]').click()`); await b.sleep(500);
  const probsCur = await b.ev(WRAP_PROBLEMS);
  b.check("lyric-wrapping (当前句 26px) " + probsCur.join(" "), probsCur.length === 0);
  await b.ev(`window.scrollTo(0, document.querySelector('.line[data-li="13"]').offsetTop - 80)`); await b.sleep(300); await b.shot("wrap-320");
  await b.viewport(430, 932);
  await b.ev(F.tapChar(0, 2)); await b.sleep(500);
  b.check("word-card-still-opens", (await b.ev(F.sheetText)).includes("风衣"));
  await F.closeSheet(b);

  // 2. 右滑：Safari 和主屏幕都只用系统自带的右滑返回，App 自己一次都不接管（包括第一次）
  const clean = `${visible("home")} && document.querySelector("#playerView").hidden && !document.querySelector(".nav-layer, .swipe-shade") && history.state && history.state.view === "home"`;
  for (const [mode, standalone] of [["safari", false], ["standalone", true]]) {
    await b.ev(`Object.defineProperty(navigator, "standalone", { value: ${standalone}, configurable: true })`);
    await b.ev(`(() => { const ob = history.back.bind(history); window.__backs = 0; history.back = () => { window.__backs++; ob(); }; })()`);
    let ok = 0, took = 0;
    for (let i = 0; i < 20; i++) {
      if (await b.ev(visible("home"))) await F.openSong(b, "t1");
      await b.touch("touchStart", 5, 400);
      for (let k = 1; k <= 4; k++) { await b.touch("touchMove", 5 + k * 45, 401); await b.sleep(16); }
      if (await b.ev(`!!document.querySelector(".nav-layer, .swipe-shade")`)) took++;
      await b.touch("touchEnd");
      await b.send("Runtime.evaluate", { expression: "History.prototype.back.call(history)" });   // 系统在松手后完成返回
      await b.sleep(500);
      if (await b.ev(clean)) ok++;
    }
    b.check(`${mode}-20-swipes ok=${ok}/20 app接管=${took} App自己返回=${await b.ev("window.__backs")}`, ok === 20 && took === 0 && (await b.ev("window.__backs")) === 0);
  }
  b.check("accept: 页面没有报错", b.errors.length === 0);
} };
