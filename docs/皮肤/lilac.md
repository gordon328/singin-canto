# 皮肤：丁香

> 按 `新皮肤模板.md` 填写的示例。代码在 `skins/lilac.js`，两边要一致；改颜色以代码为准，改完跑 `node --test` 做颜色检查。

## 基本信息

- **id**：`lilac`
- **名字**：丁香
- **一句介绍**：温柔的丁香紫，App 的默认配色
- **深浅模式**：跟随系统
- **设计图**：docs/design/skins-home.png 第 1、2 张（浅色、深色）

## 解锁条件

- 默认皮肤（默认拥有）

（所有皮肤都可以额外用兑换码解锁）

## 颜色

v0.33 之前写在 index.html 里的「丁香」颜色原样搬过来，界面和以前一样。深色的「开始今天的学习」按钮按设计图改成深色底亮色字（※）。

### 浅色

| 用途 | 颜色 |
|---|---|
| 页面底色 bg | `#F7F6FB` |
| 卡片底色 surface | `#FFFFFF` |
| 按下 surfacePress | `#F1EFFA` |
| 主要文字 ink | `#221F33` |
| 说明文字 ink2 | `#45405C` |
| 次要文字 muted | `#6E6A82` |
| 分隔线 rule | `#E2DFEE` |
| 主色 accent | `#5B4BDB` |
| 主色按下 accentPress | `#4536B8` |
| 主色浅底 accentSoft | `#ECE9FD` |
| 主色上的文字 onAccent | `#FFFFFF` |
| 深色按钮 inverse | `#221F33` |
| 深色按钮上的文字 onInverse | `#FFFFFF` |
| 危险操作 danger | `#C2413A` |
| 「今天的学习」小格 heroTile | `rgba(255,255,255,.14)` |
| 「开始今天的学习」按钮 heroBtn | `#FFFFFF` |
| 按钮文字 heroBtnInk | `#5B4BDB` |
| 歌曲首字方块 songTiles | `#ECE9FD / #5B4BDB` `#FDEDE3 / #C2581A` `#E3F4EA / #2B8A56` `#E5EEFC / #2F6BD6` |
| 声调 1–6 tones | `#D9443B` `#C67312` `#2B8A56` `#2F6BD6` `#8A4FD8` `#0F7F8E` |
| 阴影强度 shadowStrength | `1` |
| 学习页进度条当前格 segCurrent（可选） | `#B7AEF2` |

### 深色

| 用途 | 颜色 |
|---|---|
| 页面底色 bg | `#15131F` |
| 卡片底色 surface | `#1F1C2C` |
| 按下 surfacePress | `#2A2640` |
| 主要文字 ink | `#F1EFF8` |
| 说明文字 ink2 | `#CFCBE0` |
| 次要文字 muted | `#9C97B3` |
| 分隔线 rule | `#2E2A42` |
| 主色 accent | `#8E80FF` |
| 主色按下 accentPress | `#A79CFF` |
| 主色浅底 accentSoft | `#2B2550` |
| 主色上的文字 onAccent | `#14112A` |
| 深色按钮 inverse | `#F1EFF8` |
| 深色按钮上的文字 onInverse | `#15131F` |
| 危险操作 danger | `#FF8A80` |
| 「今天的学习」小格 heroTile | `rgba(20,17,42,.12)` |
| 「开始今天的学习」按钮 heroBtn | `#15131F` ※ |
| 按钮文字 heroBtnInk | `#A79CFF` ※ |
| 歌曲首字方块 songTiles | `#2B2550 / #A79CFF` `#3A2618 / #FFB27A` `#17311F / #5FD38D` `#182640 / #6FA8FF` |
| 声调 1–6 tones | `#FF7A70` `#FFB547` `#5FD38D` `#6FA8FF` `#B794FF` `#4CC9DB` |
| 阴影强度 shadowStrength | `0` |
| 学习页进度条当前格 segCurrent（可选） | `#5A4FB0` |
