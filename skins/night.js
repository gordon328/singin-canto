/* 夜曲（始终深色，连续打卡 3 天解锁）。说明：docs/皮肤/night.md */
(function (root) {
  "use strict";
  const skin = {
    id: "night",
    name: "夜曲",
    intro: "深蓝夜色配暖橙，晚上学习更护眼",
    order: 20,
    modes: "dark-only",
    unlock: { type: "streak", value: 3 },
    dark: {
      bg: "#10131B", surface: "#191E2A", surfacePress: "#252B3B", ink: "#EEF0F5", ink2: "#C9CEDA", muted: "#8C93A6", rule: "#2A3142",
      accent: "#F4A462", accentPress: "#F7BC88", accentSoft: "rgba(244,164,98,.16)", onAccent: "#1A1208", inverse: "#EEF0F5", onInverse: "#10131B", danger: "#FF8A80",
      heroTile: "rgba(26,18,8,.08)", heroBtn: "#1A1208", heroBtnInk: "#F4A462",
      songTiles: [["#3A2A1E", "#F4A462"], ["#1B2A44", "#6FA8FF"], ["#17311F", "#5FD38D"], ["#2A2448", "#B794FF"]],
      tones: ["#FF7A70", "#FFB547", "#5FD38D", "#6FA8FF", "#B794FF", "#4CC9DB"],
      shadowStrength: 0,
    },
  };
  (root.SKIN_DEFS = root.SKIN_DEFS || {})[skin.id] = skin;
  if (typeof module !== "undefined" && module.exports) module.exports = skin;
})(typeof self !== "undefined" ? self : globalThis);
