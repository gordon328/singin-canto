// 打卡日历和完成页本周格子里「以后的日子」（v0.39）：和首页本周卡片同一个规则——和卡片同色 + 1.5px --rule 实线框，不再半透明；
// 过去没打卡的保持灰色填充；今天的主色描边比以后的日子明显
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const cell = sel => `(() => { const e = ${sel.startsWith("FUT") ? `[...document.querySelectorAll("#calGrid .cal-day")].find(x => x.dataset.day > document.querySelector("#calGrid .cal-day.is-today").dataset.day)` : `document.querySelector(${JSON.stringify(sel)})`}; if (!e) return null; const s = getComputedStyle(e);
  return { bg: s.backgroundColor, bw: parseFloat(s.borderTopWidth), bs: s.borderTopStyle, bc: s.borderTopColor, op: s.opacity, ow: parseFloat(s.outlineWidth), dis: e.disabled }; })()`;
const v = n => `(() => { const p = document.createElement("span"); p.style.color = "var(${n})"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`;
module.exports = { name: "calfuture", async run(b) {
  await F.seed(b);
  // 模拟日期往前 10 天：这个月一定有以后的日子（模拟日期要开发者模式）
  await b.ev(F.DEV_ON); await b.ev(`localStorage.setItem("yc-simdays", "-10")`); await b.nav("/");
  await b.ev(click("#streak")); await b.sleep(900);
  const surface = await b.ev(v("--surface")), rule = await b.ev(v("--rule")), accent = await b.ev(v("--accent"));
  const fut = await b.ev(cell("FUT"));
  if (fut) b.check("cal-future " + JSON.stringify(fut), fut.bg === surface && fut.bw >= 1.3 && fut.bw <= 1.5 && fut.bs === "solid" && fut.bc === rule && fut.op === "1" && fut.dis);
  else b.skip("cal-future", "今天是这个月最后一天");
  const past = await b.ev(`(() => { const t = document.querySelector("#calGrid .cal-day.is-today"); const all = [...document.querySelectorAll("#calGrid .cal-day")]; const i = all.indexOf(t); return i > 0 ? (() => { const s = getComputedStyle(all[i - 1]); return { bg: s.backgroundColor, bs: s.borderTopStyle }; })() : null; })()`);
  if (past) b.check("cal-past-gray " + JSON.stringify(past), past.bg === rule && past.bs === "none"); else b.skip("cal-past-gray", "今天是 1 号");
  const today = await b.ev(cell("#calGrid .cal-day.is-today"));
  b.check("cal-today-stronger " + JSON.stringify(today), today.ow >= 2);
  await b.shot("calendar-future");
  await b.dark(true); await b.sleep(200); await b.shot("calendar-future-dark"); await b.dark(false);
  b.check("no-errors", b.errors.length === 0);
} };
