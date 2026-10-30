/* 新皮肤代码模板（不会被加载）。按 docs/皮肤/README.md：复制成 skins/<id>.js，填好，再在 skins/registry.js 里加一行。
   modes 是 "auto" 时 light 和 dark 都要填；"light-only" 只填 light；"dark-only" 只填 dark。
   必填的颜色和对比度要求见 docs/第二三阶段开发规格.md 7.10.2，跑 node --test 会自动检查。 */
(function (root) {
  "use strict";
  const skin = {
    id: "",            // 小写英文和连字符，和文件名一样
    name: "",          // App 里显示的名字
    intro: "",         // 解锁弹窗里的一句介绍，15 字左右
    order: 0,          // 皮肤页里的排序（现有：丁香 10、夜曲 20、晨雾 30）
    modes: "auto",     // "auto" / "light-only" / "dark-only"
    unlock: { type: "streak", value: 0 },   // default / streak / total / songs / words / code
    light: {
      bg: "", surface: "", surfacePress: "", ink: "", ink2: "", muted: "", rule: "",
      accent: "", accentPress: "", accentSoft: "", onAccent: "", inverse: "", onInverse: "", danger: "",
      heroTile: "", heroBtn: "", heroBtnInk: "",          // 「今天的学习」卡片：两个小格、按钮底色、按钮文字
      songTiles: [["", ""], ["", ""]],                    // 歌曲首字方块 [底色, 文字色]，至少 2 组
      tones: ["", "", "", "", "", ""],                    // 声调 1–6
      shadowStrength: 1,                                  // 阴影强度 0–1（深色一般 0）
      // segCurrent: "",                                  // 可选：学习页进度条「当前这句」的颜色，不填自动算
    },
    dark: { /* 同上 */ },
  };
  (root.SKIN_DEFS = root.SKIN_DEFS || {})[skin.id] = skin;
  if (typeof module !== "undefined" && module.exports) module.exports = skin;
})(typeof self !== "undefined" ? self : globalThis);
