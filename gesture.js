/* 手势判断（纯函数，不碰页面）：右滑返回、下拉关闭弹层。
   浏览器里是全局 GESTURE；Node 测试里 require("./gesture.js")。 */
(function (root) {
  "use strict";
  const EDGE = 24; // 右滑返回只从屏幕左边缘 24px 以内开始

  // 右滑返回：拖过 35% 宽度，或者快速甩（vx 单位 px/ms）
  function swipeBackDecision(dx, width, vx) { return dx > width * 0.35 || (vx > 0.5 && dx > 30); }

  // 下拉关闭弹层：拖过 140px（矮弹层按 30% 高度），或者快速甩
  function dragDismissDecision(dy, height, vy) { return dy > Math.min(140, height * 0.3) || (vy > 0.5 && dy > 20); }

  const GESTURE = { EDGE, swipeBackDecision, dragDismissDecision };
  root.GESTURE = GESTURE;
  if (typeof module !== "undefined" && module.exports) module.exports = GESTURE;
})(typeof self !== "undefined" ? self : globalThis);
