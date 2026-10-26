/* 课程内容（纯数据为主）。浏览器里是全局 LESSONS；Node 测试里 require("./lessons.js")。
   声调字 8 组照抄 docs/第二三阶段开发规格.md 7.2（读音已核对，不要改）；第 k 个字的粤拼是 syl + (k+1)。 */
(function (root) {
  "use strict";
  const TONE_SETS = [
    { syl: "si", chars: ["詩", "史", "試", "時", "市", "事"] },
    { syl: "fu", chars: ["夫", "苦", "富", "扶", "婦", "父"] },
    { syl: "fan", chars: ["分", "粉", "訓", "焚", "憤", "份"] },
    { syl: "ji", chars: ["衣", "椅", "意", "兒", "耳", "二"] },
    { syl: "jau", chars: ["優", "柚", "幼", "油", "友", "又"] },
    { syl: "wai", chars: ["威", "毀", "畏", "圍", "偉", "胃"] },
    { syl: "jan", chars: ["因", "隱", "印", "人", "引", "孕"] },
    { syl: "seoi", chars: ["雖", "水", "歲", "誰", "緒", "睡"] },
  ];

  // 首页今天用哪组声调字：新的一天换下一组，同一天不变
  function toneSetFor(rec, today) {
    const n = TONE_SETS.length;
    const ok = rec && typeof rec === "object" && Number.isInteger(rec.setIndex) && rec.setIndex >= 0 && rec.setIndex < n;
    if (!ok) return { key: "tones", setIndex: 0, date: today };
    if (rec.date === today) return { key: "tones", setIndex: rec.setIndex, date: today };
    return { key: "tones", setIndex: (rec.setIndex + 1) % n, date: today };
  }

  const LESSONS = { TONE_SETS, toneSetFor };
  root.LESSONS = LESSONS;
  if (typeof module !== "undefined" && module.exports) module.exports = LESSONS;
})(typeof self !== "undefined" ? self : globalThis);
