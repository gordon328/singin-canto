/* 数据格式版本和迁移（纯函数，不碰页面和数据库）。
   浏览器里是全局 DATA；Node 测试里 require("./data.js")。
   规则见 docs/数据兼容规则.md：只加不删、迁移一步一步走、从任何旧版本都能升到最新。

   数据格式版本 dataVersion（和 IndexedDB 自己的版本号无关）：
     1  第一阶段：只有歌曲（songs）
     2  M1（2026-10-27）：加了生词卡片（cards）和杂项（meta）
     3  M4a（2026-10-28）：「每天新学几句」从 localStorage 的 prefs.goal 搬到 meta daily；歌曲加学习进度 progress
     4  v0.26（2026-10-30）：meta 加打卡记录 checkin（含休息卡）
     5  v0.33（2026-10-31）：打卡记录加 unlockedInfo（已解锁皮肤的来源和日期）；unlocked 还是 id 的文字数组

   迁移函数的输入输出都是 { songs, cards, meta, prefs }：
     songs/cards/meta 是数组（歌曲里不带音频），prefs 是 localStorage yc-prefs 的内容（备份文件里没有，是 null）。
   以后改数据结构：VERSION 加一，在 STEPS 里加一个「从上一版升到这一版」的函数，并在 tests/fixtures/ 加一份这一版的示例数据。 */
(function (root) {
  "use strict";
  const VERSION = 5;

  const STEPS = {
    // 1 → 2（M1）：加生词卡片和 meta，旧数据里没有就是空的
    2(d) {
      return { ...d, cards: Array.isArray(d.cards) ? d.cards : [], meta: Array.isArray(d.meta) ? d.meta : [] };
    },
    // 2 → 3（M4a）：「每天新学几句」以前存在 prefs.goal，搬到 meta daily。prefs.goal 留着不删
    3(d) {
      const meta = [...d.meta];
      const g = d.prefs && d.prefs.goal;
      if (!meta.some(m => m && m.key === "daily") && Number.isInteger(g)) meta.push({ key: "daily", goal: g });
      return { ...d, meta };
    },
    // 3 → 4（v0.26）：打卡记录 checkin 第一次用时才建（CHECKIN.normalize 给默认值），旧数据不用改
    4(d) { return d; },
    // 4 → 5（v0.33）：已解锁的皮肤补上来源：丁香 default，其他 legacy。unlocked 不动。迁移写死在这里，以后改 checkin.js 也不影响
    5(d) {
      const meta = d.meta.map(m => {
        if (!m || m.key !== "checkin" || (m.unlockedInfo && typeof m.unlockedInfo === "object")) return m;
        const ids = Array.isArray(m.unlocked) ? m.unlocked.filter(x => typeof x === "string") : [];
        const unlockedInfo = {};
        for (const id of ids.includes("lilac") ? ids : ["lilac", ...ids]) unlockedInfo[id] = { by: id === "lilac" ? "default" : "legacy" };
        return { ...m, unlockedInfo };
      });
      return { ...d, meta };
    },
  };

  // 从 from 版一步步升到最新版。返回 { data, from, to, steps }；from 比最新还新、或不是整数时抛错
  function migrate(data, from) {
    if (!Number.isInteger(from) || from < 1) throw new Error("数据格式版本不对：" + from);
    if (from > VERSION) throw new Error("数据来自更新的版本：" + from);
    let d = { ...data };
    for (const k of ["songs", "cards", "meta"]) if (!Array.isArray(d[k])) d[k] = [];
    if (!d.prefs || typeof d.prefs !== "object") d.prefs = null;
    const steps = [];
    for (let v = from + 1; v <= VERSION; v++) { d = STEPS[v](d); steps.push(v); }
    return { data: d, from, to: VERSION, steps };
  }

  // 备份文件是哪一版数据格式：新备份直接记着；旧备份按备份格式 v 推断（v1 = 第一阶段，v2 = M1 以后）
  function backupVersion(obj) {
    if (Number.isInteger(obj.dataVersion)) return obj.dataVersion;
    return obj.v === 1 ? 1 : 2;
  }

  // 备份升到最新格式（先迁移再合并）。来自更新版本的备份会抛错，调用前先用 BACKUP.parse 挡掉
  function upgradeBackup(obj) {
    const from = backupVersion(obj);
    const r = migrate({ songs: obj.songs, cards: obj.cards, meta: obj.meta, prefs: null }, from);
    return { ...obj, songs: r.data.songs, cards: r.data.cards, meta: r.data.meta, dataVersion: VERSION };
  }

  const DATA = { VERSION, STEPS, migrate, backupVersion, upgradeBackup };
  root.DATA = DATA;
  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
})(typeof self !== "undefined" ? self : globalThis);
