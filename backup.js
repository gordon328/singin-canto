/* 备份文件（纯函数，不碰页面和数据库）。
   浏览器里是全局 BACKUP；Node 测试里 require("./backup.js")。
   规则见 docs/第二三阶段开发规格.md 第 3.5 节。 */
(function (root) {
  "use strict";
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // 文件名：唱学粤语备份-2026-10-29.json（本地日期）
  function fileName(now) { return `唱学粤语备份-${ymd(new Date(now))}.json`; }

  // 备份内容：歌（去掉音频）、卡片、meta（"backup" 是这台设备上次备份的时间，不放进备份）
  function build({ songs, cards, meta, now }) {
    return {
      app: "yuechang", v: 2, exported: new Date(now).toISOString(),
      songs: songs.map(s => { const o = { ...s }; delete o.audio; return o; }),
      cards: [...cards], meta: [...meta].filter(m => m && m.key !== "backup"),
    };
  }

  // 读文件里的文字：成功 {ok:true, obj}，失败 {ok:false, err:"给人看的原因"}
  function parse(text) {
    if (!String(text || "").trim()) return { ok: false, err: "文件是空的" };
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return { ok: false, err: "文件内容不是备份格式，可能选错了文件，或者文件不完整" }; }
    if (!obj || typeof obj !== "object" || obj.app !== "yuechang") return { ok: false, err: "这不是唱学粤语的备份文件" };
    if (!Array.isArray(obj.songs)) return { ok: false, err: "备份文件里没有歌曲列表，可能已损坏" };
    return { ok: true, obj };
  }

  // 恢复前给人看的摘要：备份日期（旧备份没有日期时为空）、几首歌、几张卡片
  function summary(obj) {
    const t = Date.parse(obj.exported);
    const d = isFinite(t) ? new Date(t) : null;
    return {
      date: d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : "",
      songs: obj.songs.filter(s => s && s.id && Array.isArray(s.lines)).length,
      cards: Array.isArray(obj.cards) ? obj.cards.filter(c => c && c.w).length : 0,
    };
  }

  // 「上次备份：N 天前」，按本地日历日算；超过 7 天 stale（用提醒颜色）
  function ageLabel(at, now) {
    if (!at) return { text: "还没有备份过", stale: true };
    const a = new Date(at), b = new Date(now);
    a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.round((b - a) / DAY));
    return { text: "上次备份：" + (days === 0 ? "今天" : days === 1 ? "昨天" : `${days} 天前`), stale: days > 7 };
  }

  const BACKUP = { fileName, build, parse, summary, ageLabel };
  root.BACKUP = BACKUP;
  if (typeof module !== "undefined" && module.exports) module.exports = BACKUP;
})(typeof self !== "undefined" ? self : globalThis);
