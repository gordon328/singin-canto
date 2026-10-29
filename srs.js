/* 间隔复习算法 + 卡片工具（纯函数，不碰页面和数据库）。
   浏览器里是全局 SRS；Node 测试里 require("./srs.js")。
   规则见 docs/第二三阶段开发规格.md 第 6.2 节。 */
(function (root) {
  "use strict";
  const DAY = 86400000, MIN = 60000, HOUR = 3600000;
  const MAX_INTERVAL = 365;

  // now 所在的"那天"（凌晨 4 点换日）之后第 days 天的凌晨 4 点（本地时间）
  function dayDue(now, days) { const d = new Date(now - 4 * HOUR); d.setDate(d.getDate() + days); d.setHours(4, 0, 0, 0); return d.getTime(); }

  // 新卡：学词时点"会读了"或手动加入生词，明天开始复习
  function newSrs(now) { return { due: dayDue(now, 1), interval: 1, ease: 2.5, reps: 1, lapses: 0 }; }

  function review(srs, grade, now) {
    let { interval, ease, reps, lapses } = srs;
    if (grade === "again") {
      return { due: now + 10 * MIN, interval: 0, ease: Math.max(1.3, ease - 0.2), reps: 0, lapses: lapses + 1 };
    } else if (grade === "hard") {
      ease = Math.max(1.3, ease - 0.15);
      interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
    } else if (grade === "good") {
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
      reps += 1;
    } else {
      throw new Error("未知的评分：" + grade);
    }
    interval = Math.min(MAX_INTERVAL, interval);
    return { due: dayDue(now, interval), interval, ease, reps, lapses };
  }

  function newCard({ w, jp, zh, tip, oral }, source, now) {
    return { w, jp, zh: zh || "", tip: tip || "", oral: !!oral, sources: source ? [source] : [],
      known: false, srs: newSrs(now), created: now, updated: now };
  }

  // "今天"凌晨 4 点才换日：把时间往前挪 4 小时再取日期
  function dayKey(t) { const d = new Date(t - 4 * HOUR); d.setHours(0, 0, 0, 0); return d.getTime(); }
  // 今天的日期字符串 "YYYY-MM-DD"（凌晨 4 点换日）
  function today(now) { const d = new Date(now - 4 * HOUR); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dueLabel(due, now) {
    const n = Math.round((dayKey(due) - dayKey(now)) / DAY);
    return n <= 0 ? "今天" : n === 1 ? "明天" : n + " 天后";
  }

  // 恢复备份时合并卡片：复习进度靠后的胜出，出处取并集
  function normalizeCard(c, now) {
    if (!c || typeof c.w !== "string" || !c.w) return null;
    const srs = c.srs && typeof c.srs.due === "number" ? c.srs : newSrs(now);
    const sources = Array.isArray(c.sources) ? c.sources.filter(s => s && s.songId) : [];
    return { ...c, srs, sources, updated: c.updated || 0 };
  }
  function mergeCards(local, incoming, now) {
    const byW = new Map(local.map(c => [c.w, c]));
    if (Array.isArray(incoming)) for (const raw of incoming) {
      const inc = normalizeCard(raw, now);
      if (!inc) continue;
      const loc = byW.get(inc.w);
      if (!loc) { byW.set(inc.w, inc); continue; }
      const incWins = inc.srs.reps > loc.srs.reps || (inc.srs.reps === loc.srs.reps && inc.updated > loc.updated);
      const seen = new Set(), sources = [];
      for (const s of [...loc.sources, ...inc.sources]) { const k = s.songId + ":" + s.li; if (!seen.has(k)) { seen.add(k); sources.push(s); } }
      byW.set(inc.w, { ...(incWins ? inc : loc), sources });
    }
    return [...byW.values()];
  }

  // 「我的生词」的筛选标签：all 全部 / learning 学习中 / known 已认识 / due 今天到期（没认识、下次复习在下一个凌晨 4 点之前，过期的也算）
  function inTab(c, tab, now) {
    if (tab === "known") return !!c.known;
    if (tab === "learning") return !c.known;
    if (tab === "due") return !c.known && !!c.srs && c.srs.due < dayDue(now, 1);
    return true;
  }
  // 搜索：汉字和意思直接包含；粤拼不管空格，也可以不打声调数字（"funglau"、"fung1"、"lau" 都能搜到 fung1 lau1）
  function matchCard(c, q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return true;
    if (String(c.w || "").includes(q) || String(c.zh || "").includes(q)) return true;
    const t = q.replace(/\s+/g, ""), jp = String(c.jp || "").toLowerCase().replace(/\s+/g, "");
    if (!/^[a-z0-9]+$/.test(t)) return false;
    return jp.includes(t) || (!/\d/.test(t) && jp.replace(/\d/g, "").includes(t));
  }

  const SRS = { newSrs, review, newCard, dueLabel, mergeCards, today, dayDue, inTab, matchCard };
  root.SRS = SRS;
  if (typeof module !== "undefined" && module.exports) module.exports = SRS;
})(typeof self !== "undefined" ? self : globalThis);
