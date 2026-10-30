/* 丁香（默认皮肤，跟随系统深浅色）。说明：docs/皮肤/lilac.md。颜色变量的含义见 docs/第二三阶段开发规格.md 7.10.2 */
(function (root) {
  "use strict";
  const skin = {
    id: "lilac",
    name: "丁香",
    intro: "温柔的丁香紫，App 的默认配色",
    order: 10,
    modes: "auto",
    unlock: { type: "default" },
    light: {
      bg: "#F7F6FB", surface: "#FFFFFF", surfacePress: "#F1EFFA", ink: "#221F33", ink2: "#45405C", muted: "#6E6A82", rule: "#E2DFEE",
      accent: "#5B4BDB", accentPress: "#4536B8", accentSoft: "#ECE9FD", onAccent: "#FFFFFF", inverse: "#221F33", onInverse: "#FFFFFF", danger: "#C2413A",
      heroTile: "rgba(255,255,255,.14)", heroBtn: "#FFFFFF", heroBtnInk: "#5B4BDB",
      songTiles: [["#ECE9FD", "#5B4BDB"], ["#FDEDE3", "#C2581A"], ["#E3F4EA", "#2B8A56"], ["#E5EEFC", "#2F6BD6"]],
      tones: ["#D9443B", "#C67312", "#2B8A56", "#2F6BD6", "#8A4FD8", "#0F7F8E"],
      shadowStrength: 1, segCurrent: "#B7AEF2",
    },
    dark: {
      bg: "#15131F", surface: "#1F1C2C", surfacePress: "#2A2640", ink: "#F1EFF8", ink2: "#CFCBE0", muted: "#9C97B3", rule: "#2E2A42",
      accent: "#8E80FF", accentPress: "#A79CFF", accentSoft: "#2B2550", onAccent: "#14112A", inverse: "#F1EFF8", onInverse: "#15131F", danger: "#FF8A80",
      heroTile: "rgba(20,17,42,.12)", heroBtn: "#15131F", heroBtnInk: "#A79CFF",
      songTiles: [["#2B2550", "#A79CFF"], ["#3A2618", "#FFB27A"], ["#17311F", "#5FD38D"], ["#182640", "#6FA8FF"]],
      tones: ["#FF7A70", "#FFB547", "#5FD38D", "#6FA8FF", "#B794FF", "#4CC9DB"],
      shadowStrength: 0, segCurrent: "#5A4FB0",
    },
  };
  (root.SKIN_DEFS = root.SKIN_DEFS || {})[skin.id] = skin;
  if (typeof module !== "undefined" && module.exports) module.exports = skin;
})(typeof self !== "undefined" ? self : globalThis);
