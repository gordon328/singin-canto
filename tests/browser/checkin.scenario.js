// M5.5a：打卡（开发规格 7.9）——完成今天的学习就打卡、首页连续/累计天数、完成页本周格子和动画、休息卡、跨天、备份。句子都是编的。
// 跨天用调试面板的「模拟日期」（+1 天按钮）。
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const streak = `document.querySelector("#streak").innerText.replace(/\\s+/g, " ").trim()`;
const meta = F.idbGet("meta", "checkin");
// 火焰是不是某个颜色变量的颜色
const flameIs = v => `(() => { const p = document.createElement("span"); p.style.color = "var(${v})"; document.body.append(p); const c = getComputedStyle(p).color; p.remove();
  return getComputedStyle(document.querySelector("#streak .flame")).color === c; })()`;
const plus = async (b, n = 1) => { for (let i = 0; i < n; i++) { await b.ev(click("#simPlus")); await b.sleep(150); } await b.sleep(200); };
// 一下子往后跳 n 天（中间那几天没打开 App）：用日期选择框
const jump = async (b, n) => { await b.ev(`(() => { const i = document.querySelector("#simDate"), [y, m, d] = i.value.split("-").map(Number), t = new Date(Date.UTC(y, m - 1, d + ${n}));
  i.value = t.toISOString().slice(0, 10); i.dispatchEvent(new Event("change", { bubbles: true })); })()`); await b.sleep(400); };
// 学完一天：t1 只剩最后一句没学，清空卡片（没有复习、每个词都是新的），从首页开始学到完成页。
// 返回完成页刚出现时今天那格有没有填色（data-lv），以及 1 秒后的样子
async function finishDay(b) {
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction(["songs", "cards"], "readwrite");
    tx.objectStore("cards").clear(); const st = tx.objectStore("songs");
    st.get("t1").onsuccess = e => { st.put(Object.assign(e.target.result, { progress: { learned: Array.from({ length: 15 }, (_, i) => i), current: true } })); };
    tx.oncomplete = () => { db.close(); res(); }; }; })`);
  await b.nav("/");
  await b.ev(click('#today [data-today="start"]')); await b.sleep(900);
  for (let i = 0; i < 25; i++) {
    if (await b.ev(`!!document.querySelector("#stBody .st-done")`)) break;
    await b.ev(`(() => { const x = document.querySelector('#studyView [data-act="got"]') || document.querySelector('#studyView [data-act="lineok"]'); if (x) x.click(); })()`);
    if (await b.ev(`!!document.querySelector('#studyView [data-act="lineok"]')`)) {
      // 最后一下：点完马上开始看完成页
      const first = await b.ev(`new Promise(res => { document.querySelector('#studyView [data-act="lineok"]').click(); const t0 = Date.now();
        (function poll() { const d = document.querySelector("#stBody .st-done .cal-day.today"); if (d) return res(d.dataset.lv || "");
          if (Date.now() - t0 > 3000) return res("timeout"); setTimeout(poll, 20); })(); })`);
      await b.sleep(1100);
      const later = await b.ev(`(() => { const d = document.querySelector("#stBody .st-done .cal-day.today"); return d ? d.dataset.lv || "" : "none"; })()`);
      return { first, later };
    }
    await b.sleep(450);
  }
  return { first: "none", later: await b.ev(`(() => { const d = document.querySelector("#stBody .st-done .cal-day.today"); return d ? d.dataset.lv || "" : "none"; })()`) };
}
const doneText = `document.querySelector("#stBody .st-done").innerText.replace(/\\s+/g, " ")`;
const home = async b => { await b.ev(click('#studyView [data-act="home"]')); await b.sleep(900); };

module.exports = { name: "checkin", async run(b) {
  await F.seed(b);
  await b.ev(`localStorage.setItem("yc-debug", "1")`);
  await b.nav("/");
  b.check("first-day " + (await b.ev(streak)), (await b.ev(streak)) === "今天开始第一天" && await b.ev(flameIs("--muted")));
  const m0 = await b.ev(meta);
  b.check("fresh-record " + JSON.stringify(m0), !!m0 && m0.restTokens === 1 && Object.keys(m0.days).length === 0);
  b.check("streak-44px", (await b.ev(`document.querySelector("#streak").getBoundingClientRect().height`)) >= 44);

  // 第一天：完成页有本周 7 格，今天那格先空着，0.3 秒后填色；「连续 1 天」
  let r = await finishDay(b);
  b.check("done-week " + JSON.stringify(r), (await b.ev(`document.querySelectorAll("#stBody .st-week .wk:nth-child(2) .cal-day").length`)) === 7
    && r.first === "" && +r.later >= 1 && (await b.ev(`document.querySelector("#stBody .cal-day.today").classList.contains("fill")`))
    && (await b.ev(doneText)).includes("连续") && (await b.ev(`document.querySelector("#stBody .st-streak").innerText`)).replace(/\s+/g, "").endsWith("1天"));
  await b.shot("checkin-done-light");
  await home(b);
  b.check("home-1 " + (await b.ev(streak)), (await b.ev(streak)) === "连续 1 天 · 累计 1 天" && await b.ev(flameIs("--accent")));

  // 同一天再学完一次：不重复打卡、没有动画，数字更新
  r = await finishDay(b);
  const m1 = await b.ev(meta), day0 = Object.keys(m1.days)[0];
  b.check("second-done-no-anim " + JSON.stringify(r), r.first !== "" && r.first !== "timeout" && !(await b.ev(`document.querySelector("#stBody .cal-day.today").classList.contains("fill")`))
    && Object.keys(m1.days).length === 1 && m1.days[day0].type === "done" && m1.days[day0].newLines === 2);
  await home(b);
  b.check("total-still-1 " + (await b.ev(streak)), (await b.ev(streak)) === "连续 1 天 · 累计 1 天");

  // 第二天：还没打卡时从昨天数；学完后连续 2 天
  await plus(b);
  b.check("next-day-before " + (await b.ev(streak)), (await b.ev(streak)) === "连续 1 天 · 累计 1 天" && await b.ev(flameIs("--muted")));
  await finishDay(b); await home(b);
  b.check("next-day " + (await b.ev(streak)), (await b.ev(streak)) === "连续 2 天 · 累计 2 天");

  // 跳过一天：自动用 1 张休息卡
  await jump(b, 2);
  const m2 = await b.ev(meta), restDay = Object.keys(m2.days).find(k => m2.days[k].type === "rest");
  const note = await b.ev(`document.querySelector("#restNote").innerText`);
  b.check("rest-used " + note, note === `昨天没学，用了 1 张休息卡，连续天数保住了 · 还剩 ${m2.restTokens} 张` && !!restDay
    && (await b.ev(streak)) === "连续 3 天 · 累计 2 天");
  await b.ev(click("#btnSettings")); await b.sleep(900); await b.ev(`history.back()`); await b.sleep(900);
  b.check("banner-gone", (await b.ev(`document.querySelector("#restNote").innerText.trim()`)) === "");

  // 一次跳过 5 天（休息卡不够）：一张都不用，连续断了
  const t0 = m2.restTokens;
  await jump(b, 5);
  const m3 = await b.ev(meta);
  b.check("break-streak " + (await b.ev(streak)) + " " + JSON.stringify([t0, m3]), m3.restTokens >= t0 && Object.values(m3.days).filter(x => x.type === "rest").length === 1
    && (await b.ev(streak)) === "今天重新开始 · 累计 2 天" && !(await b.ev(streak)).includes("连续 0"));
  await finishDay(b); await home(b);
  b.check("restart " + (await b.ev(streak)), (await b.ev(streak)) === "连续 1 天 · 累计 3 天");

  // 跳到下一个周一：多 1 张（最多 3 张）
  const mb = await b.ev(meta), before = mb.restTokens, rest0 = Object.values(mb.days).filter(x => x.type === "rest").length;
  const toMon = await b.ev(`(() => { const d = new Date(Date.now() - 4 * 3600e3 + (+localStorage.getItem("yc-simdays")) * 86400e3); return ((8 - d.getDay()) % 7) || 7; })()`);
  await jump(b, toMon);
  // 先发卡再补漏打的日子：跳过去的那几天可能用掉了卡
  const ma = await b.ev(meta), used = Object.values(ma.days).filter(x => x.type === "rest").length - rest0;
  b.check("monday-token " + JSON.stringify([before, ma.restTokens, used]), ma.restTokens === Math.min(3, before + 1) - used);

  // 第二天从后台切回来（不刷新页面）：首页跟着换日
  await finishDay(b); await home(b);
  b.check("resume-before", await b.ev(flameIs("--accent")));
  await b.ev(`(() => { const real = Date.now; window.__realNow = real; Date.now = () => real() + 86400e3; document.dispatchEvent(new Event("visibilitychange")); })()`); await b.sleep(300);
  b.check("resume-next-day " + (await b.ev(streak)) + " " + (await b.ev(`[getComputedStyle(document.querySelector("#streak .flame")).color, document.querySelector("#streak").className]`)), await b.ev(flameIs("--muted")) && /^连续 \d+ 天 · 累计 4 天$/.test(await b.ev(streak)));
  await b.ev(`Date.now = window.__realNow`);

  // 导出备份 → 清空 → 恢复：打卡记录和休息卡都在
  await b.nav("/");
  const s0 = await b.ev(streak), k0 = await b.ev(meta);
  await b.ev(click("#btnSettings")); await b.sleep(900);
  const text = await b.ev(F.exportText);
  await b.ev(F.WIPE); await b.nav("/");
  b.check("wiped " + (await b.ev(streak)), (await b.ev(streak)) === "今天开始第一天");
  await b.ev(F.restoreText(text)); await b.nav("/");
  const k1 = await b.ev(meta);
  b.check("backup-roundtrip " + JSON.stringify([s0, await b.ev(streak)]), (await b.ev(streak)) === s0 && k1.restTokens === k0.restTokens
    && JSON.stringify(k1.days) === JSON.stringify(k0.days) && k1.bestStreak === k0.bestStreak);

  // 没有词汇包：首页提示要先导入，按钮直接去导入词汇包
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
    st.get("t1").onsuccess = e => { st.put(Object.assign(e.target.result, { pack: null, progress: { learned: [], current: true } })).onsuccess = () => { db.close(); res(); }; }; }; })`);
  await b.nav("/");
  b.check("no-pack-hint", (await b.ev(`document.querySelector("#today").innerText`)).includes("先导入词汇包，才能学新句子和打卡")
    && await b.ev(`!!document.querySelector('#today [data-today="pack"]')`));
  await b.ev(click('#today [data-today="pack"]')); await b.sleep(1300);
  b.check("no-pack-opens-pack", (await b.ev(`history.state.view`)) === "playerView" && !(await b.ev(`document.querySelector("#sheet").hidden`))
    && (await b.ev(F.sheetText)).includes("词汇包"));
  b.check("checkin: 页面没有报错", b.errors.length === 0);
} };
