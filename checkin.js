/* 打卡规则（纯函数，不碰页面和数据库）。
   浏览器里是全局 CHECKIN；Node 测试里 require("./checkin.js")。
   日期都是 "YYYY-MM-DD"（SRS.today 的格式，凌晨 4 点换日已经算好），这里不处理时间。
   规则见 docs/第二三阶段开发规格.md 第 7.9 节。 */
(function (root) {
  "use strict";
  const DAY = 86400000;
  const MAX_TOKENS = 3;

  // ---- 日期工具（用 UTC 算，不受时区和夏令时影响）----
  function serial(day) { const [y, m, d] = day.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); }
  function fromSerial(n) {
    const d = new Date(n * DAY);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function addDays(day, n) { return fromSerial(serial(day) + n); }
  // 周一是 1，周日是 7（1970-01-01 是周四）
  function weekday(day) { return ((serial(day) + 3) % 7 + 7) % 7 + 1; }
  // ISO 周："YYYY-Www"，周数补两位，字符串可以直接比大小。找这周的周四，看它是那年第几周
  function isoWeek(day) {
    const thu = addDays(day, 4 - weekday(day));
    const y = Number(thu.slice(0, 4));
    return y + "-W" + String(Math.floor((serial(thu) - serial(y + "-01-01")) / 7) + 1).padStart(2, "0");
  }
  // "YYYY-Www" 那周的周一
  function weekStart(w) {
    const y = Number(w.slice(0, 4)), n = Number(w.slice(6));
    const jan4 = y + "-01-04";
    return addDays(jan4, 1 - weekday(jan4) + 7 * (n - 1));
  }

  // ---- 记录 ----
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/, WEEK_RE = /^\d{4}-W\d{2}$/;
  function fresh(today) {
    return { key: "checkin", days: {}, restTokens: 1, lastTokenWeek: isoWeek(today), lastProcessed: addDays(today, -1), bestStreak: 0, unlocked: ["lilac"], theme: "lilac" };
  }
  const num = (v) => typeof v === "number" && isFinite(v) && v >= 0;
  function cleanDays(days) {
    const out = {};
    if (!days || typeof days !== "object" || Array.isArray(days)) return out;
    for (const [k, e] of Object.entries(days)) if (DAY_RE.test(k) && e && (e.type === "done" || e.type === "rest")) out[k] = e;
    return out;
  }
  function normalize(rec, today) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) return fresh(today);
    const unlocked = Array.isArray(rec.unlocked) ? rec.unlocked.filter(s => typeof s === "string") : [];
    if (!unlocked.includes("lilac")) unlocked.unshift("lilac");
    return {
      key: "checkin",
      days: cleanDays(rec.days),
      restTokens: num(rec.restTokens) ? Math.floor(rec.restTokens) : 0,
      lastTokenWeek: typeof rec.lastTokenWeek === "string" && WEEK_RE.test(rec.lastTokenWeek) ? rec.lastTokenWeek : isoWeek(today),
      lastProcessed: typeof rec.lastProcessed === "string" && DAY_RE.test(rec.lastProcessed) ? rec.lastProcessed : addDays(today, -1),
      bestStreak: num(rec.bestStreak) ? rec.bestStreak : 0,
      unlocked,
      theme: typeof rec.theme === "string" && rec.theme ? rec.theme : "lilac",
    };
  }

  // 今天算不算完成：没有到期的复习，并且（新学够目标句数，或者歌已经学完）
  function qualifies({ due, newLines, goal, finished }) { return due === 0 && (newLines >= goal || !!finished); }

  const counts = (e) => e && (e.type === "done" || e.type === "rest");
  // 连续天数：今天有记录从今天往回数，没有从昨天开始；done 和 rest 都算
  function streak(rec, today) {
    const days = rec.days || {};
    let d = counts(days[today]) ? today : addDays(today, -1), n = 0;
    while (counts(days[d])) { n++; d = addDays(d, -1); }
    return n;
  }
  function total(rec) { return Object.values(rec.days || {}).filter(e => e && e.type === "done").length; }
  function best(rec, today) { return Math.max(rec.bestStreak || 0, streak(rec, today)); }

  // 今天记成 done；今天本来就是 done 时只更新数字
  // more：当天点过「再学 2 句」（多学了），日历上那天加一颗星
  function markDone(rec, today, { reviewed, newLines, newWords, more = false }) {
    const first = !(rec.days[today] && rec.days[today].type === "done");
    const next = { ...rec, days: { ...rec.days, [today]: { type: "done", reviewed, newLines, newWords, more: !!more } } };
    next.bestStreak = Math.max(next.bestStreak || 0, streak(next, today));
    return { rec: next, first };
  }

  // 打开 App 时处理：补休息卡 → 漏打的日子用卡补上（补得上才补）→ 记下处理到昨天
  function process(rec, today) {
    const r = { ...normalize(rec, today) };
    r.days = { ...r.days };
    const weeks = Math.round((serial(weekStart(isoWeek(today))) - serial(weekStart(r.lastTokenWeek))) / 7);
    if (weeks > 0) {
      r.restTokens = Math.max(r.restTokens, Math.min(MAX_TOKENS, r.restTokens + weeks));
      r.lastTokenWeek = isoWeek(today);
    }
    const yesterday = addDays(today, -1);
    const missed = [];
    for (let d = addDays(r.lastProcessed, 1); d <= yesterday; d = addDays(d, 1)) if (!r.days[d]) missed.push(d);
    let used = 0;
    if (missed.length > 0 && missed.length <= r.restTokens && streak(r, addDays(r.lastProcessed, 1)) > 0) {
      for (const d of missed) r.days[d] = { type: "rest" };
      r.restTokens -= missed.length;
      used = missed.length;
    }
    if (r.lastProcessed < yesterday) r.lastProcessed = yesterday;
    return { rec: r, used };
  }

  // ---- 日历 ----
  // 日历格子的样子：打卡 "done"、打卡又多学了 "more"、休息日 "rest"、没打卡 ""（不按学习量分深浅）
  function dayState(entry) {
    if (!entry) return "";
    if (entry.type === "done") return entry.more ? "more" : "done";
    return entry.type === "rest" ? "rest" : "";
  }
  function weekOf(today) {
    const mon = addDays(today, 1 - weekday(today));
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }
  // month 是 1–12；周一开头，前面用 null 补齐，总长度是 7 的倍数
  function monthGrid(year, month) {
    const first = year + "-" + String(month).padStart(2, "0") + "-01";
    const out = Array(weekday(first) - 1).fill(null);
    const n = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let i = 0; i < n; i++) out.push(addDays(first, i));
    while (out.length % 7) out.push(null);
    return out;
  }
  function detail(entry) {
    if (entry && entry.type === "done") return "复习 " + (entry.reviewed || 0) + " 个词 · 新学 " + (entry.newLines || 0) + " 句、" + (entry.newWords || 0) + " 个词";
    if (entry && entry.type === "rest") return "休息日";
    return "没有打卡";
  }

  // ---- 备份合并 ----
  const isEmpty = (r) => !r || typeof r !== "object";
  function merge(local, incoming) {
    if (isEmpty(incoming)) return local;
    if (isEmpty(local)) return incoming;
    const days = { ...(local.days || {}) };
    for (const [d, e] of Object.entries(incoming.days || {})) {
      const l = days[d];
      if (!l || (l.type !== "done" && e && e.type === "done")) days[d] = e;
    }
    const later = (a, b) => (a || "") >= (b || "") ? a : b;
    return {
      ...local,
      days,
      restTokens: Math.max(local.restTokens || 0, incoming.restTokens || 0),
      bestStreak: Math.max(local.bestStreak || 0, incoming.bestStreak || 0),
      unlocked: [...new Set([...(local.unlocked || []), ...(incoming.unlocked || [])])],
      lastTokenWeek: later(local.lastTokenWeek, incoming.lastTokenWeek),
      lastProcessed: later(local.lastProcessed, incoming.lastProcessed),
      theme: local.theme,
    };
  }

  const CHECKIN = { addDays, weekday, isoWeek, fresh, normalize, qualifies, markDone, process, streak, total, best, dayState, weekOf, monthGrid, detail, merge };
  root.CHECKIN = CHECKIN;
  if (typeof module !== "undefined" && module.exports) module.exports = CHECKIN;
})(typeof self !== "undefined" ? self : globalThis);
