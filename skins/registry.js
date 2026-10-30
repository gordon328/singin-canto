/* 所有皮肤的列表：加新皮肤只在这里加一行（按 docs/皮肤/README.md）。
   页面里：按顺序同步加载 skins/<id>.js（每个文件把自己注册到 SKIN_DEFS）。
   service worker 和 Node 测试里：只提供 id 列表（sw.js 用它把皮肤文件加进离线缓存）。 */
(function (root) {
  "use strict";
  const SKIN_IDS = [
    "lilac",   // 丁香（默认）
    "night",   // 夜曲
    "mist",    // 晨雾
  ];
  root.SKIN_IDS = SKIN_IDS;
  if (typeof document !== "undefined" && document.readyState === "loading")
    for (const id of SKIN_IDS) document.write(`<script src="skins/${id}.js"><\/script>`);
  if (typeof module !== "undefined" && module.exports) module.exports = SKIN_IDS;
})(typeof self !== "undefined" ? self : globalThis);
