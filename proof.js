/* 编辑歌曲（原「校对歌词」）的时间计算和行操作（纯函数，不碰页面）。都不修改传入的对象，时间统一四舍五入到 0.01 秒。
   浏览器里是全局 PROOF；Node 测试里 require("./proof.js")。规则见 docs/第二三阶段开发规格.md 7.1（第 5–8 条是行操作）。 */
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

  /* ---- 编辑歌曲：插入、拆开、合并、删除 ----
     编辑时每句是 {t, end, text, orig, ov, learned, srcs}：
     orig 是手动读音 ov（{字序号: 粤拼}）对应的文字，text 和 orig 不一样就说明改过字，保存时 ov 作废；
     learned 是这句算不算学会；srcs 是这句来自原来的哪几行（保存时用来更新生词卡片的出处）。 */
  const cps = s => [...s];
  function toEdit(lines, overrides, learned) {
    const ov = lines.map(() => ({})), done = new Set(learned || []);
    for (const [k, v] of Object.entries(overrides || {})) { const [li, ci] = k.split(":").map(Number); if (ov[li]) ov[li][ci] = v; }
    return lines.map((l, i) => ({ t: l.t, end: l.end, text: l.text, orig: l.text, ov: ov[i], learned: done.has(i), srcs: [i] }));
  }
  const pickOv = (ov, keep, shift) => { const o = {}; for (const [ci, v] of Object.entries(ov)) if (keep(+ci)) o[+ci + shift] = v; return o; };

  // 在第 i 句下面插入一句空的：时间放在这句和下一句开始的中间（最后一句时，放在这句开始和结束的中间）
  function insertAfter(L, i) {
    const x = copy(L), next = i < x.length - 1 ? x[i + 1].t : x[i].end, t = r2((x[i].t + next) / 2);
    x[i].end = t;
    x.splice(i + 1, 0, { t, end: next, text: "", orig: "", ov: {}, learned: false, srcs: [] });
    return x;
  }

  // 在第 cut 个字的位置把第 i 句拆成两句；有一边是空的返回 null
  function split(L, i, cut) {
    const l = L[i], ch = cps(l.text), right = ch.slice(cut).join("");
    const a = ch.slice(0, cut).join("").trimEnd(), b = right.trim();
    if (!a.trim() || !b) return null;
    const lead = cps(right).length - cps(right.trimStart()).length, same = l.text === l.orig;
    const t = r2((l.t + l.end) / 2), x = copy(L);
    x.splice(i, 1,
      { ...l, end: t, text: a, orig: a, ov: same ? pickOv(l.ov, ci => ci < cut, 0) : {} },
      { t, end: l.end, text: b, orig: b, ov: same ? pickOv(l.ov, ci => ci >= cut + lead, -(cut + lead)) : {}, learned: l.learned, srcs: [] });
    return x;
  }

  // 第 i 句合并到上一句：文字中间加一个空格。有一句是空的（比如刚插入的）就不加空格，学会状态跟着有字的那句
  function mergeUp(L, i) {
    const a = L[i - 1], b = L[i], A = a.text.trim() ? a.text : "", B = b.text.trim() ? b.text : "";
    const sep = A && B ? " " : "", text = A + sep + B, off = cps(A).length + sep.length;
    const ov = { ...(A && a.text === a.orig ? a.ov : {}), ...(B && b.text === b.orig ? pickOv(b.ov, () => true, off) : {}) };
    const learned = !A ? b.learned : !B ? a.learned : a.learned && b.learned;
    const x = copy(L);
    x.splice(i - 1, 2, { t: a.t, end: b.end, text, orig: text, ov, learned, srcs: [...a.srcs, ...b.srcs] });
    return x;
  }

  // 删除第 i 句，上一句的结束时间延长到这句的结束；只剩一句时不能删，返回 null
  function remove(L, i) {
    if (L.length <= 1) return null;
    const x = copy(L);
    if (i > 0) x[i - 1].end = x[i].end;
    x.splice(i, 1);
    return x;
  }

  // 保存：按开始时间排好；结束时间不晚于下一句开始；改过字的句子不带手动读音。
  // 返回歌曲要存的 lines / overrides / learned，以及 map {原行号: 新行号}
  function toSong(L) {
    const s = L.map((l, k) => [l, k]).sort((p, q) => p[0].t - q[0].t || p[1] - q[1]).map(p => p[0]);
    const lines = [], overrides = {}, learned = [], map = {};
    s.forEach((l, k) => {
      const next = s[k + 1];
      let end = next ? Math.min(l.end, next.t) : l.end;
      if (end <= l.t) end = next ? next.t : r2(l.t + 3);
      lines.push({ t: l.t, end, text: l.text.trim() });
      if (l.text === l.orig) for (const [ci, v] of Object.entries(l.ov)) overrides[k + ":" + ci] = v;
      if (l.learned) learned.push(k);
      for (const src of l.srcs) map[src] = k;
    });
    return { lines, overrides, learned, map };
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

  const PROOF = { shiftAll, setStart, fmtT, fmtOffset, toEdit, insertAfter, split, mergeUp, remove, toSong };
  root.PROOF = PROOF;
  if (typeof module !== "undefined" && module.exports) module.exports = PROOF;
})(typeof self !== "undefined" ? self : globalThis);
