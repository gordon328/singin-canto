# 皮肤：夜曲

> 按 `新皮肤模板.md` 填写的示例。代码在 `skins/night.js`，两边要一致；改颜色以代码为准，改完跑 `node --test` 做颜色检查。

## 基本信息

- **id**：`night`
- **名字**：夜曲
- **一句介绍**：深蓝夜色配暖橙，晚上学习更护眼
- **深浅模式**：只有深色
- **设计图**：docs/design/skins-home.png 第 3 张

## 解锁条件

- 连续打卡 3 天解锁

（所有皮肤都可以额外用兑换码解锁）

## 颜色

规格 7.9.6.2 给了大部分颜色；标 ※ 的是规格没给、按设计图取的。

### 深色

| 用途 | 颜色 |
|---|---|
| 页面底色 bg | `#10131B` |
| 卡片底色 surface | `#191E2A` |
| 按下 surfacePress | `#252B3B` |
| 主要文字 ink | `#EEF0F5` |
| 说明文字 ink2 | `#C9CEDA` |
| 次要文字 muted | `#8C93A6` |
| 分隔线 rule | `#2A3142` |
| 主色 accent | `#F4A462` |
| 主色按下 accentPress | `#F7BC88` |
| 主色浅底 accentSoft | `rgba(244,164,98,.16)` |
| 主色上的文字 onAccent | `#1A1208` |
| 深色按钮 inverse | `#EEF0F5` |
| 深色按钮上的文字 onInverse | `#10131B` |
| 危险操作 danger | `#FF8A80` ※ |
| 「今天的学习」小格 heroTile | `rgba(26,18,8,.08)` ※ |
| 「开始今天的学习」按钮 heroBtn | `#1A1208` ※ |
| 按钮文字 heroBtnInk | `#F4A462` ※ |
| 歌曲首字方块 songTiles | `#3A2A1E / #F4A462` `#1B2A44 / #6FA8FF` `#17311F / #5FD38D` `#2A2448 / #B794FF` ※ |
| 声调 1–6 tones | `#FF7A70` `#FFB547` `#5FD38D` `#6FA8FF` `#B794FF` `#4CC9DB` |
| 阴影强度 shadowStrength | `0` |
| 学习页进度条当前格 segCurrent（可选） | （自动算） |
