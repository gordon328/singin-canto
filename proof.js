/* 校对歌词的时间计算（纯函数，不碰页面）。都不修改传入的对象，时间统一四舍五入到 0.01 秒。
   浏览器里是全局 PROOF；Node 测试里 require("./proof.js")。规则见 docs/第二三阶段开发规格.md 7.1。 */
(function (root) {
  "use strict";
  const r2 = x => Math.round(x * 100) / 100;
  const copy = lines => lines.map(l => ({ ...l }));

  // 整首歌一起挪 d 秒；第一句会早于 0 秒时不挪，返回 null
  function shiftAll(lines, d) {
    if (lines.length && lines[0].t + d < 0) return null;
    return lines.map(l => ({ ...l, t: r2(l.t + d), end: r2(l.end + d) }));
  }

  // 第 i 句的开始时间设为 t：不早于上一句开始 + 0.1，不晚于下一句开始 − 0.1；上一句的结束跟着变
  function setStart(lines, i, t) {
    const x = copy(lines), n = x.length;
    const lo = i > 0 ? x[i - 1].t + 0.1 : 0, hi = i < n - 1 ? x[i + 1].t - 0.1 : Infinity;
    if (lo > hi) return x;   // 前后两句时间几乎一样，没有空间可挪：不动，免得顺序颠倒或出现负数
    const L = x[i];
    L.t = r2(Math.min(hi, Math.max(lo, t)));
    if (i > 0) x[i - 1].end = L.t;
    if (L.end <= L.t) L.end = i < n - 1 ? x[i + 1].t : r2(L.t + 3);
    return x;
  }

  // 去掉第 i 句的手动读音（键是 "i:字序号"）
  function clearLineOverrides(overrides, i) {
    const out = {};
    for (const [k, v] of Object.entries(overrides || {})) if (k.split(":")[0] !== String(i)) out[k] = v;
    return out;
  }

  // 0.1 秒精度的时间："1:02.1"
  function fmtT(t) {
    const d = Math.max(0, Math.round(t * 10)), m = Math.floor(d / 600), s = (d % 600) / 10;
    return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1);
  }

  // 整体偏移："+0.4s" / "−0.2s" / "0.0s"
  function fmtOffset(d) {
    const v = Math.round(d * 10) / 10;
    return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1) + "s";
  }

  const PROOF = { shiftAll, setStart, clearLineOverrides, fmtT, fmtOffset };
  root.PROOF = PROOF;
  if (typeof module !== "undefined" && module.exports) module.exports = PROOF;
})(typeof self !== "undefined" ? self : globalThis);
