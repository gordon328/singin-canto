/* 皮肤解锁条件（纯函数）。浏览器里是全局 UNLOCK；Node 测试里 require("./skins/unlock-rules.js")。
   以后加新的条件类型，只在 RULES 里加一项，不改皮肤文件（规格 7.10.3）。
   每种条件：label（皮肤页上的条件）、reached（解锁弹窗上面那行小字）、done（是否达成）、progress（进度 {cur, max}，没有就是 null）。
   ctx = { streak 当前连续, best 最长连续, total 累计打卡, songs 学会的歌, words 掌握的词 }。 */
(function (root) {
  "use strict";
  const CHECKIN = () => root.CHECKIN || require("../checkin.js");
  const STUDY = () => root.STUDY || require("../study.js");
  const prog = (cur, v) => ({ cur: Math.min(cur, v), max: v });

  const RULES = {
    default: { label: () => "默认皮肤", reached: () => "默认皮肤", done: () => true, progress: () => null },
    // 达到过一次就永久解锁：看最长连续；进度显示当前连续
    streak: { label: v => `连续打卡 ${v} 天解锁`, reached: v => `连续打卡 ${v} 天达成`, done: (c, v) => Math.max(c.best, c.streak) >= v, progress: (c, v) => prog(c.streak, v) },
    total: { label: v => `累计打卡 ${v} 天解锁`, reached: v => `累计打卡 ${v} 天达成`, done: (c, v) => c.total >= v, progress: (c, v) => prog(c.total, v) },
    songs: { label: v => (v === 1 ? "学会第一首歌解锁" : `学会 ${v} 首歌解锁`), reached: v => (v === 1 ? "学会第一首歌" : `学会 ${v} 首歌`), done: (c, v) => c.songs >= v, progress: (c, v) => prog(c.songs, v) },
    words: { label: v => `掌握 ${v} 个词解锁`, reached: v => `掌握 ${v} 个词`, done: (c, v) => c.words >= v, progress: (c, v) => prog(c.words, v) },
    code: { label: () => "用兑换码解锁", reached: () => "兑换成功", done: () => false, progress: () => null },
  };

  // 学会的歌：至少一句，按每日学习的规则已经没有下一句要学；掌握的词：已认识，或复习过 3 次以上
  function context({ checkin, songs, cards, today }) {
    const C = CHECKIN(), S = STUDY(), rec = checkin || { days: {} };
    const learnedSong = s => Array.isArray(s.lines) && s.lines.length > 0 && S.nextLine(s.lines.map(l => l.text), S.progressOf(s).learned).li === null;
    return {
      streak: C.streak(rec, today), best: C.best(rec, today), total: C.total(rec),
      songs: (songs || []).filter(learnedSong).length,
      words: [...(cards || [])].filter(c => c && (c.known || (c.srs && c.srs.reps >= 3))).length,
    };
  }

  // 新达成条件、还没解锁的皮肤，按皮肤页的顺序
  function newlyUnlocked(defs, ctx, unlockedIds) {
    const have = new Set(unlockedIds || []);
    return Object.values(defs).filter(d => !have.has(d.id) && RULES[d.unlock.type] && RULES[d.unlock.type].done(ctx, d.unlock.value))
      .sort((a, b) => a.order - b.order).map(d => ({ id: d.id, by: d.unlock.type }));
  }

  const UNLOCK = { RULES, context, newlyUnlocked };
  root.UNLOCK = UNLOCK;
  if (typeof module !== "undefined" && module.exports) module.exports = UNLOCK;
})(typeof self !== "undefined" ? self : globalThis);
