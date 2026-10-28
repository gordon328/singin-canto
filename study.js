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

  // 今天的计数：日期变了就清零（goal 保留）。today 用 SRS.today(now)，凌晨 4 点换日。
  // songId：今天学的歌；done：今天学会的行号（完成页显示"第几到第几句"）
  function dailyFor(rec, today) {
    const goal = goalOf(rec);
    if (!rec || rec.date !== today) return { key: "daily", goal, date: today, newLines: 0, extra: 0, reviewed: 0, songId: null, done: [] };
    const n = x => (Number.isInteger(x) && x >= 0 ? x : 0);
    return { key: "daily", goal, date: today, newLines: n(rec.newLines), extra: n(rec.extra), reviewed: n(rec.reviewed),
      songId: typeof rec.songId === "string" ? rec.songId : null, done: Array.isArray(rec.done) ? rec.done.filter(x => Number.isInteger(x) && x >= 0) : [] };
  }

  // 今天还要新学几句
  function remaining(daily) { return Math.max(0, daily.goal + daily.extra - daily.newLines); }

  // 到期要复习的卡片数（不含"早就认识"的），最多 cap 张
  function dueCount(cards, now, cap = 50) {
    let n = 0;
    for (const c of cards) if (!c.known && c.srs && c.srs.due <= now && ++n >= cap) break;
    return n;
  }

  const hasHan = text => /\p{Script=Han}/u.test(text);

  // 这句要学的单元（按出现顺序、按 w 去重）：词汇包里的词按词，没被覆盖的汉字按单字；标点空格跳过；有字没读音的跳过。
  // line 是 PACK.computeLineFor 的结果。同一个词挨着出现两次（「好好」都匹配「好」）按词长切开
  function lineUnits(line) {
    const { items, words } = line, out = [], seen = new Set();
    for (let i = 0; i < items.length;) {
      const it = items[i];
      if (it.space || !it.han) { i++; continue; }
      let n = 1;
      if (it.word >= 0) {
        const len = [...words[it.word].w].length;
        while (n < len && i + n < items.length && items[i + n].word === it.word) n++;
      }
      const part = items.slice(i, i + n); i += n;
      const chars = part.filter(x => x.han).map(x => ({ ch: x.ch, jp: x.jp }));
      const w = part.map(x => x.ch).join("");
      if (seen.has(w) || chars.some(c => !c.jp)) continue;
      seen.add(w);
      out.push({ w, jp: chars.map(c => c.jp).join(" "), chars, word: it.word >= 0 ? words[it.word] : null });
    }
    return out;
  }

  // 下一句要学的：跳过没有汉字的句子，和前面已学会的某句（trim 后）完全一样的副歌句，这些放进 skip（调用的人标记成 learned）
  function nextLine(texts, learned) {
    const done = new Set(learned), skip = [];
    for (let li = 0; li < texts.length; li++) {
      if (done.has(li)) continue;
      const t = String(texts[li] || "").trim();
      const dup = [...done].some(j => j < li && String(texts[j] || "").trim() === t);
      if (!hasHan(t) || dup) { skip.push(li); done.add(li); continue; }
      return { li, skip };
    }
    return { li: null, skip };
  }

  // 接下来要学的 n 句的行号
  function upcoming(texts, learned, n) {
    const done = [...learned], out = [];
    while (out.length < n) {
      const r = nextLine(texts, done);
      if (r.li === null) break;
      out.push(r.li); done.push(...r.skip, r.li);
    }
    return out;
  }

  // 恢复备份：每天几句用备份里的（合法时）；今天的计数本机是今天的就留本机的
  function mergeDaily(local, incoming, today) {
    const base = local && local.date === today ? dailyFor(local, today) : dailyFor(incoming, today);
    const g = incoming && incoming.goal;
    return { ...base, goal: goalOf({ goal: g }) === g ? g : goalOf(local) };
  }

  const STUDY = { GOALS, GOAL_MIN, GOAL_MAX, DEFAULT_GOAL, progressOf, withLearned, mergeProgress, currentSong, setCurrent, goalOf, dailyFor, mergeDaily, remaining, dueCount, hasHan, lineUnits, nextLine, upcoming };
  root.STUDY = STUDY;
  if (typeof module !== "undefined" && module.exports) module.exports = STUDY;
})(typeof self !== "undefined" ? self : globalThis);
