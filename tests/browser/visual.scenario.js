// 视觉对齐自检（设计规范「视觉对齐规则」）：iPhone 17 Pro Max 尺寸 440×956，每个页面、弹窗在浅色和深色下各截一张图，
// 并检查页面没有横向溢出（document.documentElement.scrollWidth 不超过屏幕宽度）。
// 截图在 tests/browser/out/visual-<页面>-<light|dark>.png；设环境变量 SHOT_TAG 可以在文件名前加前缀（比如对比改动前后）。
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const TAG = process.env.SHOT_TAG ? process.env.SHOT_TAG + "-" : "";
const putCards = cs => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("cards", "readwrite"); const st = tx.objectStore("cards");
  ${JSON.stringify(cs)}.forEach(c => st.put(c)); tx.oncomplete = () => { db.close(); res(); }; }; })`;
const mk = (w, jp, zh, due) => ({ w, jp, zh, tip: "", oral: false, sources: [], known: false, created: 1, updated: 1, srs: { due, interval: 5, ease: 2.5, reps: 3, lapses: 0 } });
const setCurrent = `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get("t1").onsuccess = e => { const s = e.target.result; s.progress = { learned: [], current: true }; st.put(s).onsuccess = () => { db.close(); res(); }; }; }; })`;
module.exports = { name: "visual", async run(b) {
  await b.viewport(440, 956);
  b.errors.length = 0;
  async function page(name) {
    await b.sleep(150);
    const w = await b.ev(`[document.documentElement.scrollWidth, innerWidth]`);
    b.check(`${name}: 没有横向溢出 ${w[0]}/${w[1]}`, w[0] <= w[1]);
    await b.shot(`visual-${TAG}${name}-light`);
    await b.dark(true); await b.sleep(300); await b.shot(`visual-${TAG}${name}-dark`); await b.dark(false); await b.sleep(200);
  }
  await F.seed(b);
  const now = Date.now();
  await b.ev(putCards([mk("風褸", "fung1 lau1", "风衣", now - 1000), mk("街", "gaai1", "街道", now - 1000), mk("飲茶", "jam2 caa4", "喝早茶", now + 3 * 864e5)]));
  await b.ev(setCurrent);
  await b.nav("/");
  await page("home");
  await b.ev(click("#btnSelect")); await b.sleep(300); await b.ev(click(".song")); await page("home-select");
  await b.ev(click("#btnDone")); await b.sleep(300);

  await b.ev(click("#btnAdd")); await b.sleep(800); await page("import");
  await b.ev(`(() => { const dt = new DataTransfer(); dt.items.add(${F.silentWav(5, "示例.wav")}); const i = document.querySelector("#fAudio"); i.files = dt.files; i.dispatchEvent(new Event("change")); })()`);
  await b.ev(`(() => { const t = document.querySelector("#fLyrics"); t.value = "第一句測試\\n第二句測試\\n第三句測試"; t.dispatchEvent(new Event("input")); })()`);
  await b.sleep(800); await b.ev(click("#btnSave")); await b.sleep(900); await page("sync");
  await b.ev(`history.back()`); await b.sleep(900);
  await b.nav("/");

  await F.openSong(b, "t1"); await page("player");
  await b.ev(click("#btnMenu")); await b.sleep(500); await page("player-menu");
  await b.ev(click('[data-menu="pack"]')); await b.sleep(700); await page("sheet-pack");
  await F.closeSheet(b);
  await b.ev(F.tapChar(0, 2)); await b.sleep(700); await page("sheet-word");
  await F.closeSheet(b);

  await b.ev(click("#btnMenu")); await b.sleep(500); await b.ev(click('[data-menu="proof"]')); await b.sleep(900); await page("edit");
  await b.ev(click('#proofView .pl[data-i="2"] .pl-head')); await b.sleep(300);
  await b.ev(`document.querySelector('#proofView .pl.open').scrollIntoView({block: "center"})`); await b.sleep(300); await page("edit-line");
  await b.ev(click('#proofView .pl.open [data-op="del"]')); await b.sleep(700); await page("sheet-confirm");
  await b.ev(click('[data-confirm="cancel"]')); await b.sleep(500);
  await b.nav("/");

  await b.ev(click("#btnSettings")); await b.sleep(900); await page("settings");
  await b.ev(click("#wordsRow")); await b.sleep(900); await page("words");
  await b.ev(click("#wSelect")); await b.sleep(300); await b.ev(click(".wrow")); await b.sleep(300); await page("words-select");
  await b.ev(click("#wDone")); await b.sleep(300);
  await b.ev(click(".wrow")); await b.sleep(700); await page("sheet-wordcard");
  await b.nav("/");

  // 打卡日历：前 10 天有打卡（学习量各不相同）和一个休息日
  await b.ev(`new Promise(res => { const day = SRS.today(Date.now()), days = {};
    [[-1, 50], [-2, 20], [-3, 0], [-4, 8], [-5, 30], [-6, 45], [-8, 12], [-9, 3], [-10, 18]].forEach(([k, n]) => { days[CHECKIN.addDays(day, k)] = n ? { type: "done", reviewed: n, newLines: 2, newWords: 0, more: n >= 40 } : { type: "rest" }; });
    const rec = { ...CHECKIN.fresh(day), days, lastProcessed: CHECKIN.addDays(day, -1), bestStreak: 6 };
    const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; db.transaction("meta", "readwrite").objectStore("meta").put(rec).onsuccess = () => { db.close(); res(); }; }; })`);
  await b.nav("/"); await page("home-streak");
  await b.ev(click("#streak")); await b.sleep(900); await page("calendar");
  await b.ev(`document.querySelector("#calGrid .cal-day[data-st='more']").click()`); await page("calendar-detail");
  await b.nav("/");

  await b.ev(`window.speechSynthesis.speak = () => {}`);
  await b.ev(click('#today [data-today="start"]')); await b.sleep(1000); await page("study");
  b.check("visual: 页面没有报错", b.errors.length === 0);
}};
