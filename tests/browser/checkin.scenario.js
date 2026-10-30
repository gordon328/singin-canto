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
// 返回完成页刚出现时今天那格有没有填色（data-st），以及 1 秒后的样子
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
        (function poll() { const d = document.querySelector("#stBody .st-done .cal-day.is-today"); if (d) return res(d.dataset.st || "");
          if (Date.now() - t0 > 3000) return res("timeout"); setTimeout(poll, 20); })(); })`);
      await b.sleep(1100);
      const later = await b.ev(`(() => { const d = document.querySelector("#stBody .st-done .cal-day.is-today"); return d ? d.dataset.st || "" : "none"; })()`);
      return { first, later };
    }
    await b.sleep(450);
  }
  return { first: "none", later: await b.ev(`(() => { const d = document.querySelector("#stBody .st-done .cal-day.is-today"); return d ? d.dataset.st || "" : "none"; })()`) };
}
// 改测试数据：learned（t1 前几句学过）、cards（换掉全部卡片）、goal（每天新学几句）
const mkCard = (w, jp, due) => ({ w, jp, zh: "", tip: "", oral: false, sources: [], known: false, created: 1, updated: 1, srs: { due, interval: 1, ease: 2.5, reps: 1, lapses: 0 } });
const setup = ({ learned, cards, goal }) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction(["songs", "cards", "meta"], "readwrite");
  const o = ${JSON.stringify({ learned, cards, goal })};
  if (o.cards) { const cs = tx.objectStore("cards"); cs.clear(); o.cards.forEach(c => cs.put(c)); }
  if (o.learned != null) { const st = tx.objectStore("songs"); st.get("t1").onsuccess = e => { st.put(Object.assign(e.target.result, { progress: { learned: Array.from({ length: o.learned }, (_, i) => i), current: true } })); }; }
  if (o.goal) { const ms = tx.objectStore("meta"); ms.get("daily").onsuccess = e => { ms.put(Object.assign(e.target.result || { key: "daily" }, { goal: o.goal })); }; }
  tx.oncomplete = () => { db.close(); res(); }; }; })`;
const doneText =`document.querySelector("#stBody .st-done").innerText.replace(/\\s+/g, " ")`;
const home = async b => { await b.ev(click('#studyView [data-act="home"]')); await b.sleep(900); };

module.exports = { name: "checkin", async run(b) {
  await F.seed(b);
  await b.ev(F.DEV_ON); await b.ev(`localStorage.setItem("yc-debug", "1")`);
  await b.nav("/");
  b.check("first-day " + (await b.ev(streak)), (await b.ev(streak)) === "今天开始第一天" && await b.ev(flameIs("--muted")));
  const m0 = await b.ev(meta);
  b.check("fresh-record " + JSON.stringify(m0), !!m0 && m0.restTokens === 1 && Object.keys(m0.days).length === 0);
  b.check("streak-44px", (await b.ev(`document.querySelector("#streak").getBoundingClientRect().height`)) >= 44);

  // 第一天：完成页有本周 7 格，今天那格先空着，0.3 秒后填色；「连续 1 天」
  let r = await finishDay(b);
  b.check("done-week " + JSON.stringify(r), (await b.ev(`document.querySelectorAll("#stBody .st-week .wk:nth-child(2) .cal-day").length`)) === 7
    && r.first === "" && r.later === "done" && (await b.ev(`document.querySelector("#stBody .cal-day.is-today").classList.contains("fill")`))
    && (await b.ev(doneText)).includes("连续") && (await b.ev(`document.querySelector("#stBody .st-streak").innerText`)).replace(/\s+/g, "").endsWith("1天"));
  await b.shot("checkin-done-light");
  await home(b);
  b.check("home-1 " + (await b.ev(streak)), (await b.ev(streak)) === "连续 1 天 · 累计 1 天" && await b.ev(flameIs("--accent")));

  // 同一天再学完一次：不重复打卡、没有动画，数字更新
  r = await finishDay(b);
  const m1 = await b.ev(meta), day0 = Object.keys(m1.days)[0];
  b.check("second-done-no-anim " + JSON.stringify(r), r.first !== "" && r.first !== "timeout" && !(await b.ev(`document.querySelector("#stBody .cal-day.is-today").classList.contains("fill")`))
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
  const note = (await b.ev(`document.querySelector("#restNote").innerText`)).replace(/\s+/g, " ").trim();
  b.check("rest-used " + note, note === `昨天没学，用了 1 张休息卡，连续天数保住了 · 还剩 ${m2.restTokens}/3`
    && (await b.ev(`document.querySelectorAll("#restNote .tokens svg").length`)) === 3 && (await b.ev(`document.querySelectorAll("#restNote .tokens svg.on").length`)) === m2.restTokens && !!restDay
    && (await b.ev(streak)) === "连续 3 天 · 累计 2 天");
  await b.shot("checkin-rest-banner");
  await b.ev(click("#btnSettings")); await b.sleep(900); await b.ev(`history.back()`); await b.sleep(900);
  b.check("banner-gone", (await b.ev(`document.querySelector("#restNote").innerText.trim()`)) === "");

  // 一次跳过 5 天（休息卡不够）：一张都不用，连续断了
  const t0 = m2.restTokens;
  await jump(b, 5);
  const m3 = await b.ev(meta);
  b.check("break-streak " + (await b.ev(streak)) + " " + JSON.stringify([t0, m3]), m3.restTokens >= t0 && Object.values(m3.days).filter(x => x.type === "rest").length === 1
    && (await b.ev(streak)) === "今天重新开始 · 累计 2 天" && !(await b.ev(streak)).includes("连续 0"));
  // 日历统计里「连续」也显示「—」，不显示 0
  await b.ev(click("#streak")); await b.sleep(900);
  const dash = await b.ev(`document.querySelector("#calBody .cal-num.now").innerText.replace(/\\s+/g, "")`);
  b.check("cal-streak-dash " + dash, dash === "连续—");
  await b.ev(`history.back()`); await b.sleep(900);
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

  // 日历页：点首页那一行进入
  await b.nav("/");
  await b.ev(click("#streak")); await b.sleep(900);
  b.check("cal-open", (await b.ev(`history.state.view`)) === "calendarView" && !(await b.ev(`document.querySelector("#calendarView").hidden`)));
  // 统计卡片（设计图方案 B）：一张卡片，上面三列（连续 / 累计 / 最长连续），下面休息卡横栏
  const nums = await b.ev(`[...document.querySelectorAll("#calBody .cal-num")].map(e => e.innerText.replace(/\\s+/g, ""))`);
  const ck = await b.ev(meta);
  const tokenBar = await b.ev(`document.querySelector("#calBody .cal-tokens").innerText.replace(/\\s+/g, "")`);
  b.check("cal-stats " + JSON.stringify([nums, tokenBar]), nums.length === 3 && /^连续\d+天$/.test(nums[0]) && nums[1] === "累计4天" && /^最长连续\d+天$/.test(nums[2])
    && tokenBar === "休息卡" + ck.restTokens + "/3" + (ck.restTokens >= 3 ? "已存满，用掉后才会继续发放" : "每周一发1张")
    && (await b.ev(`document.querySelectorAll("#calBody .cal-tokens .tk i.on").length`)) === ck.restTokens
    && (await b.ev(`document.querySelectorAll("#calBody .cal-tokens .tk i").length`)) === 3);
  // 样式：一张卡片圆角 24、只有阴影没有边框；三列一样宽一样高，中间 1px 竖线（高倍屏上浏览器会把 1px 换算成更细的物理像素）；「连续」的数字是主色；图标 14×18 圆角 4
  const look = await b.ev(`(() => { const c = document.querySelector("#calBody .cal-stats"), s = getComputedStyle(c), cols = [...c.querySelectorAll(".cal-num")].map(e => e.getBoundingClientRect());
    const color = v => { const p = document.createElement("span"); p.style.color = "var(" + v + ")"; document.body.append(p); const x = getComputedStyle(p).color; p.remove(); return x; };
    const ic = c.querySelector(".tk i"), is = getComputedStyle(ic), bar = getComputedStyle(c.querySelector(".cal-tokens")), nums = getComputedStyle(c.querySelector(".cal-nums"));
    return { radius: s.borderTopLeftRadius, border: s.borderTopWidth, shadow: s.boxShadow !== "none", widths: cols.map(r => Math.round(r.width)), heights: cols.map(r => Math.round(r.height)),
      line: getComputedStyle(c.querySelectorAll(".cal-num")[1]).borderLeftWidth, accent: getComputedStyle(c.querySelector(".cal-num.now b")).color === color("--accent"),
      ink: getComputedStyle(c.querySelectorAll(".cal-num b")[1]).color === color("--ink"), icon: [Math.round(ic.getBoundingClientRect().width), Math.round(ic.getBoundingClientRect().height), is.borderTopLeftRadius],
      barPad: bar.padding, barLine: bar.borderTopWidth, numsPad: nums.paddingTop + " " + nums.paddingBottom }; })()`);
  b.check("cal-stats-look " + JSON.stringify(look), look.radius === "24px" && look.border === "0px" && look.shadow && new Set(look.widths).size === 1 && new Set(look.heights).size === 1
    && parseFloat(look.line) > 0 && parseFloat(look.line) <= 1 && look.accent && look.ink && look.icon.join() === "14,18,4px" && look.barPad === "12px 16px" && parseFloat(look.barLine) > 0 && parseFloat(look.barLine) <= 1 && look.numsPad === "16px 16px");
  // 卡片左右和月历对齐；整个月不用滚动就能看到（iPhone 17 Pro Max 440×956）
  await b.viewport(440, 956); await b.sleep(300);
  const fit = await b.ev(`(() => { const c = document.querySelector("#calBody .cal-stats").getBoundingClientRect(), g = document.querySelector("#calGrid").getBoundingClientRect();
    return { l: [Math.round(c.left), Math.round(g.left)], r: [Math.round(c.right), Math.round(g.right)], bottom: Math.round(g.bottom), h: innerHeight, sw: document.documentElement.scrollWidth, w: innerWidth }; })()`);
  b.check("cal-fit " + JSON.stringify(fit), fit.l[0] === fit.l[1] && fit.r[0] === fit.r[1] && fit.bottom <= fit.h && fit.sw <= fit.w);
  const today = await b.ev(`document.querySelector("#calBody .cal-day.is-today").dataset.day`);
  b.check("cal-head", (await b.ev(`[...document.querySelectorAll("#calBody .cal-head span")].map(e => e.innerText).join(" ")`)) === "一 二 三 四 五 六 日");
  const cell = d => `(() => { const e = document.querySelector('#calGrid [data-day="' + ${JSON.stringify(d)} + '"]'); if (!e) return null; const s = getComputedStyle(e);
    return { st: e.dataset.st, bg: s.backgroundColor, color: s.color, rest: e.classList.contains("rest"), text: e.innerText.trim(), border: s.borderTopStyle, outline: s.outlineWidth + " " + s.outlineStyle }; })()`;
  const ct = await b.ev(cell(today));
  b.check("cal-today " + JSON.stringify(ct), ct.outline === "2px solid" && ct.st === "done");
  // 每一行一样高、行距一样，今天那一行不会被撑高（以前今天的格子误用了首页卡片的 .today 样式）
  const geo = await b.ev(`(() => { const g = document.querySelector("#calGrid"), r = g.getBoundingClientRect(), k = [...g.children].map(e => e.getBoundingClientRect());
    const tops = [...new Set(k.map(x => Math.round(x.top - r.top)))], h = Math.round(k.find((_, i) => g.children[i].dataset.day).height);
    return { tops, h, gridH: Math.round(r.height), shadow: getComputedStyle(g.querySelector(".is-today")).boxShadow }; })()`);
  b.check("cal-rows-even " + JSON.stringify(geo), geo.tops.every((t, i) => Math.abs(t - i * geo.tops[geo.tops.length - 1] / (geo.tops.length - 1)) <= 1)
    && Math.abs(geo.gridH - (geo.tops[geo.tops.length - 1] + geo.h)) <= 1 && geo.shadow === "none");
  // 跳到最早那个月，找打卡日和休息日
  for (let i = 0; i < 3; i++) if (!(await b.ev(`document.querySelector("#calPrev").disabled`))) { await b.ev(click("#calPrev")); await b.sleep(150); }
  const days = Object.keys(ck.days).sort(), doneDay = days.find(k => ck.days[k].type === "done"), restDay2 = days.find(k => ck.days[k].type === "rest");
  const title = await b.ev(`document.querySelector("#calTitle").innerText`);
  b.check("cal-earliest " + title, title === `${+doneDay.slice(0, 4)} 年 ${+doneDay.slice(5, 7)} 月` && await b.ev(`document.querySelector("#calPrev").disabled`));
  const cr = await b.ev(cell(restDay2));
  // 休息日可能在下个月：不在这个月就往后翻
  if (!cr) { await b.ev(click("#calNext")); await b.sleep(150); }
  const cr2 = await b.ev(cell(restDay2));
  b.check("cal-rest " + JSON.stringify(cr2), !!cr2 && cr2.rest && cr2.text === "休" && cr2.border === "dashed" && cr2.st === "rest");
  await b.ev(`document.querySelector('#calGrid [data-day="${restDay2}"]').click()`); await b.sleep(150);
  b.check("cal-detail-rest", (await b.ev(`document.querySelector("#calDetail").innerText`)).endsWith("休息日"));
  if (!(await b.ev(cell(doneDay)))) { await b.ev(click("#calPrev")); await b.sleep(150); }
  await b.ev(`document.querySelector('#calGrid [data-day="${doneDay}"]').click()`); await b.sleep(150);
  b.check("cal-detail-done " + (await b.ev(`document.querySelector("#calDetail").innerText`)), /复习 \d+ 个词 · 新学 \d+ 句、\d+ 个词$/.test(await b.ev(`document.querySelector("#calDetail").innerText`))
    && (await b.ev(`document.querySelector('#calGrid [data-day="${doneDay}"]').classList.contains("sel")`)));
  // 翻回本月；本月不能再往后
  for (let i = 0; i < 3; i++) if (!(await b.ev(`document.querySelector("#calNext").disabled`))) { await b.ev(click("#calNext")); await b.sleep(150); }
  b.check("cal-no-future", await b.ev(`document.querySelector("#calNext").disabled`) && !!(await b.ev(`document.querySelector("#calGrid .cal-day.is-today")`))
    && await b.ev(`[...document.querySelectorAll("#calGrid [data-day]")].filter(e => e.dataset.day > ${JSON.stringify(today)}).every(e => e.disabled)`));
  // 左右滑：往右滑看上个月（最早那个月和本月不同时才会动）
  const t1 = await b.ev(`document.querySelector("#calTitle").innerText`), g = await b.ev(`(() => { const r = document.querySelector("#calGrid").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  await b.touch("touchStart", g[0] - 60, g[1]); for (let i = 1; i <= 4; i++) { await b.touch("touchMove", g[0] - 60 + i * 30, g[1] + 2); await b.sleep(20); } await b.touch("touchEnd"); await b.sleep(200);
  const t2 = await b.ev(`document.querySelector("#calTitle").innerText`);
  b.check("cal-swipe " + JSON.stringify([t1, t2]), title === t1 ? t2 === t1 : t2 !== t1);
  await b.touch("touchStart", g[0] + 60, g[1]); for (let i = 1; i <= 4; i++) { await b.touch("touchMove", g[0] + 60 - i * 30, g[1] + 2); await b.sleep(20); } await b.touch("touchEnd"); await b.sleep(200);
  b.check("cal-swipe-back", (await b.ev(`document.querySelector("#calTitle").innerText`)) === t1);
  b.check("cal-legend " + (await b.ev(`document.querySelector("#calBody .cal-legend").innerText.replace(/\\s+/g, " ").trim()`)), (await b.ev(`document.querySelector("#calBody .cal-legend").innerText.replace(/\\s+/g, "")`)) === "已打卡多学了休息日"
    && (await b.ev(`document.querySelectorAll("#calBody .cal-legend .cal-day").length`)) === 3 && !!(await b.ev(`document.querySelector("#calBody .cal-legend .cal-day[data-st=more] .star")`)));
  b.check("cal-44px", await b.ev(`[...document.querySelectorAll("#calendarView button")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  await b.shot("checkin-calendar-light");
  await b.ev(click("#calendarView [data-back]")); await b.sleep(900);
  b.check("cal-back", (await b.ev(`history.state.view`)) === "home");
  // 存满 3 张：三个都填满，说明改成「已存满」
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
    st.get("checkin").onsuccess = e => { st.put(Object.assign(e.target.result, { restTokens: 3 })).onsuccess = () => { db.close(); res(); }; }; }; })`);
  await b.nav("/"); await b.ev(click("#streak")); await b.sleep(900);
  const full = await b.ev(`document.querySelector("#calBody .cal-tokens").innerText.replace(/\\s+/g, "")`);
  b.check("tokens-full " + full, full === "休息卡3/3已存满，用掉后才会继续发放" && (await b.ev(`document.querySelectorAll("#calBody .cal-tokens .tk i.on").length`)) === 3);
  await b.shot("checkin-tokens-full");
  await b.ev(`history.back()`); await b.sleep(900);

  // 导出备份 → 清空 → 恢复：打卡记录和休息卡都在
  await b.nav("/");
  const s0 = await b.ev(streak), k0 = await b.ev(meta);
  await b.ev(click("#btnSettings")); await b.sleep(900);
  const text = await b.ev(F.exportText);
  // 清空就像换了新设备：开发者模式不在备份里，要重新打开，模拟日期才继续有效（v0.35）
  const sim = await b.ev(`localStorage.getItem("yc-simdays")`);
  await b.ev(F.WIPE); await b.nav("/");
  await b.ev(F.DEV_ON); await b.ev(`(localStorage.setItem("yc-debug", "1"), localStorage.setItem("yc-simdays", ${JSON.stringify(sim)}))`); await b.nav("/");
  b.check("wiped " + (await b.ev(streak)), (await b.ev(streak)) === "今天开始第一天");
  await b.ev(F.restoreText(text)); await b.nav("/");
  const k1 = await b.ev(meta);
  b.check("backup-roundtrip " + JSON.stringify([s0, await b.ev(streak)]), (await b.ev(streak)) === s0 && k1.restTokens === k0.restTokens
    && JSON.stringify(k1.days) === JSON.stringify(k0.days) && k1.bestStreak === k0.bestStreak);

  // 复习时同一个词点了两次「忘了」（10 分钟后又到期），学完新句子时已经过了 10 分钟：今天复习过的词不算，照样打卡
  await jump(b, 1);
  const now0 = await b.ev(`Date.now() + (+localStorage.getItem("yc-simdays")) * 86400e3`);
  await b.ev(setup({ learned: 15, cards: [mkCard("測試", "cak1 si3", now0 - 60e3)] }));
  await b.nav("/");
  await b.ev(click('#today [data-today="start"]')); await b.sleep(900);
  for (let i = 0; i < 30; i++) {
    if (await b.ev(`!!document.querySelector('#studyView [data-act="lineok"]')`)) break;
    await b.ev(`(() => { const q = s => document.querySelector('#studyView [data-act="' + s + '"]'); const x = q("flip") || q("again") || q("got"); if (x) x.click(); })()`);
    await b.sleep(500);
  }
  b.check("again-twice-requeued", (await b.ev(F.idbGet("cards", "測試"))).srs.due > now0);
  await b.ev(`(() => { const real = Date.now; window.__realNow = real; Date.now = () => real() + 11 * 60e3; })()`);
  await b.ev(click('#studyView [data-act="lineok"]')); await b.sleep(900);
  b.check("again-twice-checks-in " + (await b.ev(`document.querySelector("#stBody .st-streak").innerText`)),
    (await b.ev(`document.querySelector("#stBody .st-streak").innerText`)).startsWith("连续"));
  await b.ev(`Date.now = window.__realNow`);

  // 主路径：歌还没学完，新句子学够了目标（这里目标设成 1 句）就打卡
  await jump(b, 1);
  await b.ev(setup({ learned: 10, cards: [], goal: 1 }));
  await b.nav("/");
  await b.ev(click('#today [data-today="start"]')); await b.sleep(900);
  for (let i = 0; i < 25 && !(await b.ev(`!!document.querySelector("#stBody .st-done")`)); i++) {
    await b.ev(`(() => { const x = document.querySelector('#studyView [data-act="got"]') || document.querySelector('#studyView [data-act="lineok"]'); if (x) x.click(); })()`); await b.sleep(500);
  }
  b.check("goal-path " + (await b.ev(`document.querySelector("#stBody .st-streak").innerText`)), !(await b.ev(doneText)).includes("全部学完")
    && (await b.ev(`document.querySelector("#stBody .st-streak").innerText`)).startsWith("连续"));
  // 没点「再学 2 句」：今天那格是普通的打卡（主色填满、没有星）
  const dayG = Object.keys((await b.ev(meta)).days).sort().pop();
  b.check("no-star-yet", (await b.ev(meta)).days[dayG].more === false && !(await b.ev(`document.querySelector("#stBody .cal-day.is-today .star")`)));
  // 点「还有精神，再学 2 句」学完：今天那格右上角加一颗星，记录里 more 是 true
  await b.ev(click('#studyView [data-act="more"]')); await b.sleep(900);
  for (let i = 0; i < 40 && !(await b.ev(`!!document.querySelector("#stBody .st-done")`)); i++) {
    await b.ev(`(() => { const x = document.querySelector('#studyView [data-act="got"]') || document.querySelector('#studyView [data-act="lineok"]'); if (x) x.click(); })()`); await b.sleep(500);
  }
  const star = await b.ev(`(() => { const t = document.querySelector("#stBody .cal-day.is-today"), s = t.querySelector(".star"); if (!s) return null; const r = s.getBoundingClientRect(), c = t.getBoundingClientRect();
    const p = document.createElement("span"); p.style.color = "var(--on-accent)"; document.body.append(p); const on = getComputedStyle(p).color; p.remove();
    return { st: t.dataset.st, w: Math.round(r.width), top: Math.round(r.top - c.top), right: Math.round(c.right - r.right), fill: getComputedStyle(s).fill === on }; })()`);
  b.check("more-star " + JSON.stringify(star), !!star && star.st === "more" && star.w === 8 && star.top === 4 && star.right === 4 && star.fill && (await b.ev(meta)).days[dayG].more === true);
  await home(b); await b.ev(click("#streak")); await b.sleep(900);
  b.check("more-star-calendar", !!(await b.ev(`document.querySelector('#calGrid [data-day="${dayG}"][data-st="more"] .star')`)));
  await b.ev(`history.back()`); await b.sleep(900);
  await b.ev(setup({ goal: 4 }));

  // 没有词汇包：首页提示要先导入，按钮直接去导入词汇包
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
    st.get("t1").onsuccess = e => { st.put(Object.assign(e.target.result, { pack: null, progress: { learned: [], current: true } })).onsuccess = () => { db.close(); res(); }; }; }; })`);
  await b.nav("/");
  b.check("no-pack-hint", (await b.ev(`document.querySelector("#today").innerText`)).includes("先导入词汇包，才能学新句子和打卡")
    && await b.ev(`!!document.querySelector('#today [data-today="pack"]')`));
  await b.ev(click('#today [data-today="pack"]')); await b.sleep(1300);
  b.check("no-pack-opens-pack", (await b.ev(`history.state.view`)) === "playerView" && !(await b.ev(`document.querySelector("#sheet").hidden`))
    && (await b.ev(F.sheetText)).includes("词汇包"));
  // 没达到打卡条件也进了完成页（只做了复习）：写明还差什么
  await jump(b, 1);
  const now1 = await b.ev(`Date.now() + (+localStorage.getItem("yc-simdays")) * 86400e3`);
  await b.ev(setup({ cards: [mkCard("測試", "cak1 si3", now1 - 60e3)] }));
  await b.nav("/");
  await b.ev(click('#today [data-today="review"]')); await b.sleep(900);
  for (let i = 0; i < 10 && !(await b.ev(`!!document.querySelector("#stBody .st-done")`)); i++) {
    await b.ev(`(() => { const q = s => document.querySelector('#studyView [data-act="' + s + '"]'); const x = q("flip") || q("good"); if (x) x.click(); })()`); await b.sleep(600);
  }
  const why = await b.ev(`document.querySelector("#stBody .st-streak").innerText`);
  b.check("not-yet-reason " + why, why === "今天还没打卡 · 再学 4 句就能打卡"
    && (await b.ev(`document.querySelector("#stBody .cal-day.is-today").dataset.st`)) === "");
  b.check("checkin: 页面没有报错", b.errors.length === 0);
} };
