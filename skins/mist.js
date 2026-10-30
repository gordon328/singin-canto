/* 晨雾（跟随系统深浅色，学会第一首歌解锁）。说明：docs/皮肤/mist.md */
(function (root) {
  "use strict";
  const skin = {
    id: "mist",
    name: "晨雾",
    intro: "清晨薄雾里的青绿，安静又清爽",
    order: 30,
    modes: "auto",
    unlock: { type: "songs", value: 1 },
    light: {
      bg: "#F3F5F4", surface: "#FFFFFF", surfacePress: "#E9EEEC", ink: "#1E2A28", ink2: "#3B4846", muted: "#6B7774", rule: "#E3E8E6",
      accent: "#1F7A6B", accentPress: "#165E52", accentSoft: "#E1F0EC", onAccent: "#FFFFFF", inverse: "#1E2A28", onInverse: "#FFFFFF", danger: "#C2413A",
      heroTile: "rgba(255,255,255,.14)", heroBtn: "#FFFFFF", heroBtnInk: "#1F7A6B",
      songTiles: [["#E1F0EC", "#1F7A6B"], ["#FDEDE3", "#C2581A"], ["#E3F4EA", "#2E8F52"], ["#E5EEFC", "#3A6FD0"]],
      tones: ["#D14B45", "#C9761F", "#2E8F52", "#3A6FD0", "#8455CF", "#16808F"],
      shadowStrength: 1,
    },
    dark: {
      bg: "#111816", surface: "#1A2421", surfacePress: "#23302C", ink: "#E8EFED", ink2: "#C3CFCB", muted: "#8FA19C", rule: "#2A3733",
      accent: "#4FB8A5", accentPress: "#6FD0BD", accentSoft: "#1D3A34", onAccent: "#0B1F1B", inverse: "#E8EFED", onInverse: "#111816", danger: "#FF8A80",
      heroTile: "rgba(11,31,27,.12)", heroBtn: "#0B1F1B", heroBtnInk: "#4FB8A5",
      songTiles: [["#1D3A34", "#4FB8A5"], ["#3A2618", "#FFB27A"], ["#17311F", "#5FD38D"], ["#182640", "#6FA8FF"]],
      tones: ["#FF7A70", "#FFB547", "#5FD38D", "#6FA8FF", "#B794FF", "#4CC9DB"],
      shadowStrength: 0,
    },
  };
  (root.SKIN_DEFS = root.SKIN_DEFS || {})[skin.id] = skin;
  if (typeof module !== "undefined" && module.exports) module.exports = skin;
})(typeof self !== "undefined" ? self : globalThis);
