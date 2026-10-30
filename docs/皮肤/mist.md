# 皮肤：晨雾

> 按 `新皮肤模板.md` 填写的示例。代码在 `skins/mist.js`，两边要一致；改颜色以代码为准，改完跑 `node --test` 做颜色检查。

## 基本信息

- **id**：`mist`
- **名字**：晨雾
- **一句介绍**：清晨薄雾里的青绿，安静又清爽
- **深浅模式**：跟随系统
- **设计图**：docs/design/skins-home.png 第 4、5 张（浅色、深色）

## 解锁条件

- 学会第一首歌解锁

（所有皮肤都可以额外用兑换码解锁）

## 颜色

规格 7.9.6.3 给了大部分颜色；标 ※ 的是规格没给、按设计图取的。

### 浅色

| 用途 | 颜色 |
|---|---|
| 页面底色 bg | `#F3F5F4` |
| 卡片底色 surface | `#FFFFFF` |
| 按下 surfacePress | `#E9EEEC` |
| 主要文字 ink | `#1E2A28` |
| 说明文字 ink2 | `#3B4846` |
| 次要文字 muted | `#6B7774` |
| 分隔线 rule | `#E3E8E6` |
| 主色 accent | `#1F7A6B` |
| 主色按下 accentPress | `#165E52` |
| 主色浅底 accentSoft | `#E1F0EC` |
| 主色上的文字 onAccent | `#FFFFFF` |
| 深色按钮 inverse | `#1E2A28` |
| 深色按钮上的文字 onInverse | `#FFFFFF` |
| 危险操作 danger | `#C2413A` ※ |
| 「今天的学习」小格 heroTile | `rgba(255,255,255,.14)` ※ |
| 「开始今天的学习」按钮 heroBtn | `#FFFFFF` ※ |
| 按钮文字 heroBtnInk | `#1F7A6B` ※ |
| 歌曲首字方块 songTiles | `#E1F0EC / #1F7A6B` `#FDEDE3 / #C2581A` `#E3F4EA / #2E8F52` `#E5EEFC / #3A6FD0` ※ |
| 声调 1–6 tones | `#D14B45` `#C9761F` `#2E8F52` `#3A6FD0` `#8455CF` `#16808F` |
| 阴影强度 shadowStrength | `1` |
| 学习页进度条当前格 segCurrent（可选） | （自动算） |

### 深色

| 用途 | 颜色 |
|---|---|
| 页面底色 bg | `#111816` |
| 卡片底色 surface | `#1A2421` |
| 按下 surfacePress | `#23302C` |
| 主要文字 ink | `#E8EFED` |
| 说明文字 ink2 | `#C3CFCB` |
| 次要文字 muted | `#8FA19C` |
| 分隔线 rule | `#2A3733` |
| 主色 accent | `#4FB8A5` |
| 主色按下 accentPress | `#6FD0BD` |
| 主色浅底 accentSoft | `#1D3A34` |
| 主色上的文字 onAccent | `#0B1F1B` |
| 深色按钮 inverse | `#E8EFED` |
| 深色按钮上的文字 onInverse | `#111816` |
| 危险操作 danger | `#FF8A80` ※ |
| 「今天的学习」小格 heroTile | `rgba(11,31,27,.12)` ※ |
| 「开始今天的学习」按钮 heroBtn | `#0B1F1B` ※ |
| 按钮文字 heroBtnInk | `#4FB8A5` ※ |
| 歌曲首字方块 songTiles | `#1D3A34 / #4FB8A5` `#3A2618 / #FFB27A` `#17311F / #5FD38D` `#182640 / #6FA8FF` ※ |
| 声调 1–6 tones | `#FF7A70` `#FFB547` `#5FD38D` `#6FA8FF` `#B794FF` `#4CC9DB` |
| 阴影强度 shadowStrength | `0` |
| 学习页进度条当前格 segCurrent（可选） | （自动算） |
