/* 每日学习的规则（纯函数，不碰页面和数据库）。
   浏览器里是全局 STUDY；Node 测试里 require("./study.js")。
   progress 见 docs/第二三阶段开发规格.md 3.3；daily 见 3.4、5.7。M4b 的学习流程也写在这里。 */
(function (root) {
  "use strict";
  const GOALS = [2, 4, 6], GOAL_MIN = 1, GOAL_MAX = 20, DEFAULT_GOAL = 4;

  function cleanLearned(learned, n) {
    if (!Array.isArray(learned)) return [];
    return [...new Set(learned.filter(x => Number.isInteger(x) && x >= 0 && x < n))].sort((a, b) => a - b);
  }

  // 歌曲的学习进度：{learned: 已学会的行号（从小到大）, current: 是不是正在学的歌}
  function progressOf(song) {
    const p = song.progress && typeof song.progress === "object" ? song.progress : {};
    return { learned: cleanLearned(p.learned, song.lines.length), current: p.current === true };
  }

  function withLearned(song, li) {
    const p = progressOf(song);
    return { ...p, learned: cleanLearned([...p.learned, li], song.lines.length) };
  }

  // 恢复备份：已学的句子取并集，"正在学"以本机为准
  function mergeProgress(local, incoming, lineCount) {
    const a = local || {}, b = incoming || {};
    return { learned: cleanLearned([...(Array.isArray(a.learned) ? a.learned : []), ...(Array.isArray(b.learned) ? b.learned : [])], lineCount), current: a.current === true };
  }

  // 正在学的歌：标了 current 的那首；没有就用最近导入的
  function currentSong(songs) {
    if (!songs.length) return null;
    return songs.find(s => progressOf(s).current) || songs.reduce((x, y) => ((y.created || 0) > (x.created || 0) ? y : x));
  }

  // 设为正在学：返回 progress 要改的歌（新对象），保证只有 id 那首是 current
  function setCurrent(songs, id) {
    const out = [];
    for (const s of songs) {
      const p = progressOf(s), want = s.id === id;
      if (p.current !== want) out.push({ ...s, progress: { ...p, current: want } });
    }
    return out;
  }

  function goalOf(daily) {
    const g = daily && daily.goal;
    return Number.isInteger(g) && g >= GOAL_MIN && g <= GOAL_MAX ? g : DEFAULT_GOAL;
  }

  // 今天的计数：日期变了就清零（goal 保留）。today 用 SRS.today(now)，凌晨 4 点换日
  function dailyFor(rec, today) {
    const goal = goalOf(rec);
    if (!rec || rec.date !== today) return { key: "daily", goal, date: today, newLines: 0, extra: 0, reviewed: 0 };
    const n = x => (Number.isInteger(x) && x >= 0 ? x : 0);
    return { key: "daily", goal, date: today, newLines: n(rec.newLines), extra: n(rec.extra), reviewed: n(rec.reviewed) };
  }

  const STUDY = { GOALS, GOAL_MIN, GOAL_MAX, DEFAULT_GOAL, progressOf, withLearned, mergeProgress, currentSong, setCurrent, goalOf, dailyFor };
  root.STUDY = STUDY;
  if (typeof module !== "undefined" && module.exports) module.exports = STUDY;
})(typeof self !== "undefined" ? self : globalThis);
