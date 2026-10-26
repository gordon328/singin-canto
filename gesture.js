/* 手势判断（纯函数，不碰页面）：下拉关闭弹层。右滑返回用 iOS 系统自带的。
   浏览器里是全局 GESTURE；Node 测试里 require("./gesture.js")。 */
(function (root) {
  "use strict";
  // 下拉关闭弹层：拖过 140px（矮弹层按 30% 高度），或者快速甩
  function dragDismissDecision(dy, height, vy) { return dy > Math.min(140, height * 0.3) || (vy > 0.5 && dy > 20); }

  const GESTURE = { dragDismissDecision };
  root.GESTURE = GESTURE;
  if (typeof module !== "undefined" && module.exports) module.exports = GESTURE;
})(typeof self !== "undefined" ? self : globalThis);
