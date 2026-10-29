/* 手势判断（纯函数，不碰页面）：下拉关闭弹层、橡皮筋、弹簧。右滑返回用 iOS 系统自带的。
   浏览器里是全局 GESTURE；Node 测试里 require("./gesture.js")。 */
(function (root) {
  "use strict";
  // 下拉关闭弹层：拖过 1/3 高度，或者快速往下甩（速度单位 px/ms）
  function dragDismissDecision(dy, height, vy) { return dy > height / 3 || (vy > 0.5 && dy > 20); }

  // 往上拖的橡皮筋阻力（和 iOS 一样的公式）：拖得越多，弹窗跟得越少，最多接近 dim
  function rubberBand(x, dim) { return x <= 0 ? 0 : (1 - 1 / (x * 0.55 / dim + 1)) * dim; }

  // 统一的弹簧（设计规范 6.1）：阻尼比 ZETA，DUR 毫秒内基本停稳。CSS 里的 --spring 是它的 linear() 近似
  const SPRING = { ZETA: 0.62, DUR: 400 };
  const W = 10 / (SPRING.DUR / 1000); // 固有角频率（rad/s）：ZETA*W*DUR ≈ 6.2，结束时只剩约 0.2% 的偏差
  // 弹簧在 t 毫秒时离目标还差多少（x0 起始偏移，v0 起始速度 px/ms，都是"离目标"的方向）
  function springOffset(x0, v0, t) {
    const s = t / 1000, wd = W * Math.sqrt(1 - SPRING.ZETA ** 2), a = SPRING.ZETA * W;
    const B = (v0 * 1000 + a * x0) / wd;
    return Math.exp(-a * s) * (x0 * Math.cos(wd * s) + B * Math.sin(wd * s));
  }
  // CSS linear() 曲线：从 0 走到 1 的弹簧，n 段
  function springLinear(n = 32) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(i === n ? 1 : +(1 - springOffset(1, 0, SPRING.DUR * i / n)).toFixed(3));
    return "linear(" + pts.join(", ") + ")";
  }

  const GESTURE = { dragDismissDecision, rubberBand, SPRING, springOffset, springLinear };
  root.GESTURE = GESTURE;
  if (typeof module !== "undefined" && module.exports) module.exports = GESTURE;
})(typeof self !== "undefined" ? self : globalThis);
