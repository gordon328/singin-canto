/* 兑换码列表（开发规格 7.10.4.2）：只存哈希（SHA-256，算之前先转大写、去掉空格和连字符），绝不存兑换码原文。
   用 node tools/make-code.js 生成，不要手改。rewards：skin:<id>（解锁某个皮肤）、skin:*（全部皮肤）、dev（开发者模式）。
   想让某个码失效就删掉那一行（已经兑换过的设备不受影响）。 */
(function (root) {
  "use strict";
  const SKIN_CODES = [
    { hash: "c50a3d32ae813c61bcc0b3474f2978ed48c9115aa8d1fe232c2009b0af9192af", rewards: ["dev"], note: "开发者模式（开发者自己用）" },
    { hash: "e1e40ad618ddbc3c9842592f3ced7220089655fb822cdc0566ade24d58a1d2de", rewards: ["skin:*"], note: "全部皮肤（开发者自己用）" },
    // ↑ 新的兑换码由 tools/make-code.js 加在这一行上面
  ];
  root.SKIN_CODES = SKIN_CODES;
  if (typeof module !== "undefined" && module.exports) module.exports = SKIN_CODES;
})(typeof self !== "undefined" ? self : globalThis);
