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

  // 2a. Safari（非主屏幕）：从左边缘拖，App 不接管
  await b.ev(`document.querySelector("#playerView [data-back]").click()`); await b.sleep(600);
  await F.openSong(b, "t1");
  await b.touch("touchStart", 5, 400); await b.touch("touchMove", 60, 401); await b.touch("touchMove", 120, 402);
  const safariLayer = await b.ev(`!!document.querySelector(".nav-layer, .swipe-shade")`);
  await b.touch("touchEnd"); await b.sleep(400);
  b.check("safari-no-app-swipe", !safariLayer && await b.ev(visible("playerView")));

  // 2b. 主屏幕：App 右滑进行中，系统先完成了返回（popstate）→ App 立刻收手，不再多返回一次，并记住以后不用自己的手势
  await b.ev(`Object.defineProperty(navigator, "standalone", { value: true, configurable: true })`);
  await b.ev(`(() => { const ob = history.back.bind(history); window.__backs = 0; history.back = () => { window.__backs++; ob(); }; })()`);
  await b.touch("touchStart", 5, 400);
  for (let i = 1; i <= 4; i++) { await b.touch("touchMove", 5 + i * 40, 401); await b.sleep(16); }
  const appLayer = await b.ev(`!!document.querySelector(".swipe-shade")`);
  await b.send("Runtime.evaluate", { expression: "History.prototype.back.call(history)" }); await b.sleep(400);   // 模拟系统手势完成返回
  const midClean = await b.ev(`!document.querySelector(".swipe-shade") && !document.querySelector(".nav-layer")`);
  for (let i = 5; i <= 6; i++) { await b.touch("touchMove", 5 + i * 40, 401); await b.sleep(16); }
  await b.touch("touchEnd"); await b.sleep(600);
  b.check(`system-swipe-wins (appLayer=${appLayer} midClean=${midClean} backs=${await b.ev("window.__backs")})`,
    midClean && (await b.ev("window.__backs")) === 0 && await b.ev(visible("home")) && await b.ev(`!document.querySelector(".swipe-shade") && !document.querySelector(".nav-layer")`));
  // 记住了：下次从边缘拖，App 不再接管
  await F.openSong(b, "t1");
  await b.touch("touchStart", 5, 400); await b.touch("touchMove", 60, 401); await b.touch("touchMove", 120, 402);
  const again = await b.ev(`!!document.querySelector(".nav-layer, .swipe-shade")`);
  await b.touch("touchEnd"); await b.sleep(400);
  b.check("remembers-system-swipe", !again && await b.ev(visible("playerView")));
  // 连续 20 次：Safari 模式（系统返回）和主屏幕模式（App 右滑），每次都要干净地回到首页，只有一个首页
  const clean = `${visible("home")} && document.querySelector("#playerView").hidden && !document.querySelector(".nav-layer, .swipe-shade") && history.state && history.state.view === "home"`;
  await b.ev(`Object.defineProperty(navigator, "standalone", { value: false, configurable: true })`);
  let okSafari = 0;
  for (let i = 0; i < 20; i++) {
    await F.openSong(b, "t1");
    await b.touch("touchStart", 5, 400); await b.touch("touchMove", 80, 401);
    await b.send("Runtime.evaluate", { expression: "History.prototype.back.call(history)" });
    await b.touch("touchMove", 200, 402); await b.touch("touchEnd"); await b.sleep(500);
    if (await b.ev(clean)) okSafari++;
  }
  b.check(`safari-20-swipes ${okSafari}/20`, okSafari === 20);
  await b.ev(`(() => { localStorage.removeItem("yc-sysback"); location.reload(); })()`); await b.sleep(2500);
  await b.ev(`Object.defineProperty(navigator, "standalone", { value: true, configurable: true })`);
  let okHome = 0;
  for (let i = 0; i < 20; i++) {
    await F.openSong(b, "t1");
    await b.touch("touchStart", 5, 400);
    for (let k = 1; k <= 6; k++) { await b.touch("touchMove", 5 + k * 45, 401); await b.sleep(16); }
    await b.touch("touchEnd"); await b.sleep(600);
    if (await b.ev(clean)) okHome++;
  }
  b.check(`standalone-20-swipes ${okHome}/20`, okHome === 20);
  b.check("accept: 页面没有报错", b.errors.length === 0);
} };
