# 唱学粤语 · 项目说明（给 Claude Code）

## 这是什么
一个通过粤语歌学粤语的手机网页应用（PWA）。开发者自己用，完全免费，以后可能分享链接给朋友。
完整产品方案在 `docs/产品方案.md`，所有需求决定都在那里，开始工作前先读。方案已经讨论定稿，不需要重新头脑风暴。

## 开发者情况（很重要）
- 开发者**零编程基础**，只懂 hello world。代码由 Claude 写，开发者负责提需求、在 iPhone 上测试、反馈问题
- 用**中文**沟通，用大白话解释，不要堆技术术语
- 每一步说清楚：你在做什么、开发者需要做什么（比如在终端输入哪条命令、在手机上点哪里）
- 一次只做一小步，做完让开发者在手机上试，确认没问题再继续
- 遇到需要开发者做决定的地方，给出推荐选项，而不是开放式提问

## 技术约定
- **单个 `index.html` 文件**，原生 HTML/CSS/JavaScript，不用框架，不用构建工具（没有 npm build）。保持简单，开发者能直接打开
- 自动粤拼：`to-jyutping@3.1.1`（CanCLID，BSD-2），从 jsDelivr 加载 UMD 版本，全局变量 `ToJyutping`
  - `getJyutpingList(text)` 返回 `[字, 粤拼|null][]`
  - `getJyutpingText(text)` 返回空格分隔的粤拼
  - `getJyutpingCandidates(text)` 返回多音字候选
  - 注意：`getJyutping()` 返回的是「行(haang4)街(gaai1)」这种格式，不是空格分隔
- 数据存在浏览器 IndexedDB（数据库 `yuechang`，表 `songs`），音频以 Blob 形式存储；偏好设置存 localStorage（`yc-prefs`）
- 标准发音：浏览器 `speechSynthesis`，语言 `zh-HK`
- 歌词来源：LRCLIB 公开接口 `https://lrclib.net/api/search`（免费、无需 key，连续请求要间隔几百毫秒，偶尔返回 503 需要重试）
- 主要目标设备：**iPhone Safari**。所有功能都要在 iPhone 上能用，按钮至少 44px 高，注意安全区（刘海、底部横条）
- 支持浅色和深色模式（CSS 变量 + `prefers-color-scheme`）

## 版权规则（必须遵守）
- **不要把任何歌词或音频提交到 git 仓库**。仓库会公开发布到 GitHub Pages
- 歌词和音频只存在用户自己的浏览器里
- 「词汇包」功能：App 生成提示词，用户把它发给 Claude 聊天，再把结果粘贴回来。词汇包**不包含完整歌词，也没有逐句翻译**（Claude 不会输出这些），只包含：
  ```json
  {"summary": "整首歌大意，两三句",
   "words": [{"w": "風褸", "jp": "fung1 lau1", "zh": "风衣、外套", "tip": "记忆提示", "oral": false}],
   "fix": [{"from": "風樓", "to": "風褸"}]}
  ```
  App 在歌词里自动匹配这些词（长词优先），标上读音和下划线；其余字用 to-jyutping 自动标注。不依赖行号
- `samples/` 里只放不含歌词的示例数据

## 当前进度
- 第一阶段（播放器）原型已完成：导入音频和歌词（LRC / 纯文本打轴 / LRCLIB 搜索）、逐字粤拼按声调上色、点字看词卡和听发音、改读音、单句循环、慢放、词汇包导入、备份恢复
- 测试歌曲：陈奕迅《富士山下》
- 已发布到 GitHub Pages：https://gordon328.github.io/singin-canto/ （仓库 github.com/gordon328/singin-canto，main 分支根目录），iPhone 上已确认能打开

## 下一步（按顺序）
1. ~~初始化 git，推送到 GitHub，开启 GitHub Pages~~（已完成）
2. 加 PWA 支持：`manifest.json`、图标、service worker（离线可用、添加到主屏幕）
3. 在正式网址上测试 LRCLIB 在线搜索
4. 根据开发者的试用反馈修改
5. 第二阶段：记忆卡片和间隔复习（见方案文档）
