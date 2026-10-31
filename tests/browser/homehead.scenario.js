// 首页顶部（v0.37，设计图 docs/design/home-top.png 方案 B「本周打卡条」）：去掉大标题；第一行日期 + 星期 + 齿轮；
// 第二行本周打卡卡片：七个小方格 + 右边连续（断了显示累计）天数；整张卡片点进打卡日历。五种皮肤都正常
const F = require("./fixtures.js");
const SKIN = require("../../skins/skin.js");
const ids = require("../../skins/registry.js");
const defs = Object.fromEntries(ids.map(id => [id, require(`../../skins/${id}.js`)]));
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const rect = sel => `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height, w: r.width }; })()`;
const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
// 「今天」按凌晨 4 点换日
const day = n => { const d = new Date(Date.now() - 4 * 3600e3 + n * 86400e3); return { s: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, m: d.getMonth() + 1, d: d.getDate(), w: "日一二三四五六"[d.getDay()] }; };
const setCheckin = o => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
  st.get("checkin").onsuccess = e => { st.put({ ...e.target.result, ...(${o}) }).onsuccess = () => { db.close(); res(); }; }; }; })`;
const cells = `[...document.querySelectorAll("#streak .wk-day")].map(e => (e.dataset.st || "-") + (e.classList.contains("is-today") ? "*" : "") + (e.classList.contains("future") ? "f" : ""))`;
const stat = `document.querySelector("#streak .wk-stat").innerText.replace(/\\s+/g, " ").trim()`;

module.exports = { name: "homehead", async run(b) {
  await F.seed(b);
  const t = day(0);
  // 第一行：没有大标题；日期（20px 粗）+ 星期（15px --muted）；齿轮不变
  b.check("no-brand", !(await b.ev(`!!document.querySelector("#home .brand")`)) && !(await b.ev(`document.querySelector("#home").innerText`)).includes("唱学粤语"));
  const date = await b.ev(`document.querySelector("#homeDate").innerText.replace(/\\s+/g, " ").trim()`);
  b.check("date " + date, date === `${t.m} 月 ${t.d} 日 周${t.w}`);
  b.check("date-style", await b.ev(`(() => { const d = getComputedStyle(document.querySelector("#homeDate .hd-d")), w = getComputedStyle(document.querySelector("#homeDate .hd-w"));
    const m = document.createElement("span"); m.style.color = "var(--muted)"; document.body.append(m); const muted = getComputedStyle(m).color; m.remove();
    return d.fontSize === "20px" && +d.fontWeight >= 700 && w.fontSize === "15px" && w.color === muted; })()`));
  const head = await b.ev(rect(".home-head")), gear = await b.ev(rect("#btnSettings"));
  b.check("row-44 " + JSON.stringify([head.h, gear.h]), gear.h === 44 && Math.abs(head.h - 44 - (await b.ev(`parseFloat(getComputedStyle(document.querySelector(".home-head")).paddingTop) + parseFloat(getComputedStyle(document.querySelector(".home-head")).paddingBottom)`))) < 1);
  b.check("gear-unchanged", (await b.ev(`document.querySelector("#btnSettings").getAttribute("aria-label")`)) === "设置" && await b.ev(`!!document.querySelector("#btnSettings svg circle")`));

  // 第二行：本周卡片
  b.check("week-labels", (await b.ev(`[...document.querySelectorAll("#streak .wk-h")].map(e => e.innerText).join("")`)) === "一二三四五六日");
  b.check("card-style", await b.ev(`(() => { const s = getComputedStyle(document.querySelector("#streak")); return s.borderRadius === "20px" && s.backgroundColor === getComputedStyle(document.querySelector(".song")).backgroundColor; })()`));
  // 新用户：今天空心框，右边「累计 0 天」
  let c = await b.ev(cells);
  const wd = (new Date(Date.now() - 4 * 3600e3).getDay() + 6) % 7; // 今天是这周第几天（周一 0）
  b.check("fresh-week " + c.join(","), c.length === 7 && c[wd] === "-*" && c.slice(wd + 1).every(x => x === "-f"));
  b.check("today-hollow", await b.ev(`(() => { const e = document.querySelector("#streak .wk-day.is-today"), s = getComputedStyle(e); return s.backgroundColor === "rgba(0, 0, 0, 0)" && s.borderTopStyle === "solid"; })()`));
  b.check("fresh-stat " + (await b.ev(stat)), (await b.ev(stat)) === "累计 0 天");

  // 今天、昨天打卡，前天休息：连续 3 天；今天填满
  const d1 = day(-1), d2 = day(-2);
  await b.ev(setCheckin(`({ days: { ${JSON.stringify(t.s)}: { type: "done" }, ${JSON.stringify(d1.s)}: { type: "done" }, ${JSON.stringify(d2.s)}: { type: "rest" } }, lastProcessed: ${JSON.stringify(d1.s)} })`));
  await b.nav("/");
  c = await b.ev(cells);
  b.check("streak-week " + c.join(","), c[wd] === "done*" && (wd < 1 || c[wd - 1] === "done") && (wd < 2 || c[wd - 2] === "rest"));
  b.check("stat-streak " + (await b.ev(stat)), (await b.ev(stat)) === "连续 3 天");
  b.check("num-accent-outfit", await b.ev(`(() => { const s = getComputedStyle(document.querySelector("#streak .wk-num")); return s.color === getComputedStyle(document.querySelector("#streak .wk-day.is-today")).backgroundColor && /Outfit/.test(s.fontFamily) && +s.fontWeight >= 700; })()`));
  b.check("rest-dashed", wd < 2 || await b.ev(`getComputedStyle(document.querySelectorAll("#streak .wk-day")[${wd - 2}]).borderTopStyle === "dashed"`));
  b.check("aria-summary", (await b.ev(`document.querySelector("#streak").getAttribute("aria-label")`)) === "连续 3 天 · 累计 2 天");
  // 连续断了：显示累计
  await b.ev(setCheckin(`({ days: { "2026-01-05": { type: "done" }, "2026-01-06": { type: "done" } }, lastProcessed: ${JSON.stringify(d1.s)} })`)); await b.nav("/");
  b.check("stat-total " + (await b.ev(stat)), (await b.ev(stat)) === "累计 2 天");

  // 分隔线、44px、按下效果、点进打卡日历
  b.check("divider", await b.ev(`getComputedStyle(document.querySelector("#streak .wk-stat")).borderLeftWidth !== "0px"`));
  b.check("card-44", (await b.ev(rect("#streak"))).h >= 44);
  await b.touch("touchStart", ...(await b.ev(`(() => { const r = document.querySelector("#streak").getBoundingClientRect(); return [r.left + 40, r.top + 20]; })()`)));
  b.check("pressed", await b.ev(`document.querySelector("#streak").classList.contains("is-pressed")`));
  await b.touch("touchEnd"); await b.sleep(1000);
  b.check("opens-calendar", await b.ev(visible("#calendarView")) && (await b.ev("history.state.view")) === "calendarView");
  await b.ev("history.back()"); await b.sleep(900);

  // 五种配色：只用颜色变量；没有横向溢出；间距
  for (const [id, dark] of [["lilac", false], ["lilac", true], ["night", false], ["mist", false], ["mist", true]]) {
    await b.dark(dark);
    await b.ev(setCheckin(`({ unlocked: ["lilac", "night", "mist"], theme: ${JSON.stringify(id)}, days: { ${JSON.stringify(t.s)}: { type: "done" }, ${JSON.stringify(d1.s)}: { type: "done" }, ${JSON.stringify(d2.s)}: { type: "rest" } } })`));
    await b.ev(`localStorage.setItem("yc-skin", ${JSON.stringify(id)})`); await b.nav("/");
    const col = SKIN.colorsFor(defs[id], dark), name = `${id}-${defs[id].modes === "dark-only" || dark ? "dark" : "light"}`;
    b.check(`${name}-colors`, await b.ev(`(() => { const today = getComputedStyle(document.querySelector("#streak .wk-day.is-today")), card = getComputedStyle(document.querySelector("#streak"));
      return today.backgroundColor === ${JSON.stringify(rgb(col.accent))} && card.backgroundColor === ${JSON.stringify(rgb(col.surface))}; })()`));
    // 以后的日子（v0.39）：和卡片同色 + 1.5px --rule 实线框；过去没打卡的灰色填充；今天的空心框比以后的日子明显
    const fut = await b.ev(`(() => { const e = document.querySelector("#streak .wk-day.future"); if (!e) return null; const s = getComputedStyle(e); return { bg: s.backgroundColor, bw: parseFloat(s.borderTopWidth), bs: s.borderTopStyle, bc: s.borderTopColor }; })()`);
    if (fut) b.check(`${name}-future ${JSON.stringify(fut)}`, fut.bg === rgb(col.surface) && fut.bw >= 1.3 && fut.bw <= 1.5 && fut.bs === "solid" && fut.bc === rgb(col.rule));
    else b.skip(`${name}-future`, "今天是周日，这周没有以后的日子");
    b.check(`${name}-past-missed-gray`, wd < 3 || await b.ev(`(() => { const s = getComputedStyle(document.querySelectorAll("#streak .wk-day")[${wd - 3}]); return s.backgroundColor === ${JSON.stringify(rgb(col.rule))} && s.borderTopStyle === "none"; })()`));
    b.check(`${name}-no-overflow`, await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
    const card = await b.ev(rect("#streak")), today = await b.ev(rect("#today")), hd = await b.ev(rect(".home-head")), wrap = await b.ev(rect("#home .wrap"));
    b.check(`${name}-align ${JSON.stringify([card.left, hd.left, today.left, card.right, today.right])}`, Math.abs(card.left - today.left) < 1 && Math.abs(card.right - today.right) < 1 && today.top - card.bottom >= 12);
    await b.shot(`homehead-${name}`);
  }
  await b.dark(false);
  b.check("no-errors", b.errors.length === 0);
} };
