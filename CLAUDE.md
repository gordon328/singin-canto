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

## 固定规则
- **完成后直接合并到 main 并 push 上线，不开 PR，不需要 gh 命令行工具**（开发者一个人的项目，2026-10-28 开发者决定）。做法：在功能分支上提交并跑完测试 → `git merge` 到 main（能快进就快进）→ `git push origin main`。推送后 GitHub Pages 1–2 分钟内更新，告诉开发者可以在 iPhone 上测了

## 技术约定
- **`index.html` + 少量普通 .js 文件**（`<script src>` 引入），原生 HTML/CSS/JavaScript，不用框架，不用构建工具（没有 npm build）。保持简单，开发者能直接打开
  - `srs.js`：间隔复习算法和卡片纯函数（全局 `SRS`：`newSrs`、`review`、`newCard`、`dueLabel`、`mergeCards`、`today`）。"今天"按本地凌晨 4 点换日
  - `lessons.js`：课程内容（全局 `LESSONS`：`TONE_SETS` 8 组声调字、`toneSetFor(rec, today)` 首页今天用哪组；M6 的入门课也放这里）
  - `proof.js`：编辑歌曲（原「校对歌词」）的时间计算和行操作（全局 `PROOF`：`shiftAll`、`setStart`、`fmtT`、`fmtOffset`；行操作 `toEdit`、`insertAfter`、`split`、`mergeUp`、`remove`、`toSong`，保存时 `toSong` 返回新的 lines/overrides/learned 和原行号→新行号的 map，用来更新卡片出处）
  - `gesture.js`：手势判断纯函数（全局 `GESTURE`：`dragDismissDecision`，弹层下拉关闭）
  - `pack.js`：词汇包纯函数（全局 `PACK`：`buildPrompt`、`parsePack(raw, lines)`、`computeLineFor(song, li, autoJp)`、`fixText`、`HAN`）。词汇包 v3（`v:3`）覆盖整首歌的词，只有 `key:true` 的显示下划线；导入时整包里有一个词带 `key` 字段就按 v3 处理，整包都没有 `key` 是旧格式、全部当重点词。页面里 `computeLineFor(song, li)` / `computeLine(li)` 是它的包装
  - `study.js`：每日学习规则（全局 `STUDY`：`progressOf`、`withLearned`、`mergeProgress`、`currentSong`、`setCurrent`、`goalOf`、`dailyFor`，`GOALS` 2/4/6、`GOAL_MIN` 1、`GOAL_MAX` 20）。页面里 `getDaily()` / `saveDaily(rec)` 读写 meta `daily`。M4b 的学习流程也写在这里
  - 测试：`node --test`（纯函数）；`node tests/browser/run.js [过滤]`（页面测试，用本机 Chrome 无界面跑 `tests/browser/*.scenario.js`，截图在 `tests/browser/out/` 不进仓库）。开发者不用跑
  - 页面切换：`go(view)` / `goBack()` + `history.pushState/replaceState`，按层级 `DEPTH`：首页(0) → 导入/打轴/播放/设置(1) → 编辑歌曲(2)，往深一层 push、同层 replace。右滑返回 **Safari 和主屏幕模式都只用 iOS 系统自带的**，App 不自己实现（2026-10-27 开发者 iPhone 实测：主屏幕模式下系统也有右滑返回，App 再做一套会出现两个首页）。系统手势触发的 popstate 不播 App 的返回动画；编辑歌曲页有未保存改动时 popstate 会推回编辑页并弹出保存提示
  - 歌词换行：`wrapGroups()` 把标点和前一个字、同一个词的字、最后两个字绑成不能拆开的组
  - 新增要离线可用的文件时，加进 `sw.js` 的 `SHELL` 并把 `VERSION` 加一
  - 删除类操作都用 `confirmSheet({title, body})`（返回 Promise<boolean>）先确认；删除歌曲走 `deleteSongs(ids)`：先从列表拿掉，5 秒内可撤销，`commitDelete()` 才真正删数据库（5 秒后、离开首页、切后台），卡片保留只去掉出处
  - 按下效果：**不用 CSS `:active`**，JS 在 pointerdown 时给 `.btn,.tones .key,.song,.ib,.res` 加 `.is-pressed`，抬起/取消/移出/滚动时去掉；`go()`/`goBack()` 先 `clearPressed()` 再等一帧才切页；popstate、pageshow 也清掉。`:hover` 只能写在 `@media (hover: hover)` 里
  - 浮动播放条 `.player`、首页 `.fab`（「＋ 导入新歌」）、学习页 `.study-foot`：`show()` 在切页动画结束后加 `bar-in`（从下方滑入 + 淡入）；离开时没有动画，切页时 `body.navigating` 直接隐藏。学习页原唱 `playStudyLine` 只播这一句（到下一句开始停）、固定 0.8×（`applyRate` 在学习页用 0.8），`play()` 失败或 3 秒没声音都会 toast 原因
  - 状态栏：iOS 26 Safari 用靠近屏幕顶部的 fixed 元素的颜色染状态栏，所以**顶部附近不能有带颜色的 fixed 元素**（`#topTint` 已去掉）。**弹出层不使用暗幕**（M3.12，设计规范 5.6）：底部弹窗 `openSheet(html, {modal})` 只靠 `--shadow-sheet` 阴影；点外面关闭（document 上的 pointerdown/pointerup 判断，移动超过 10px 算滚动，紧跟的 click 吞掉）；`modal: true` 的确认类弹窗（`confirmSheet`、未保存提示）没有拖动条，点外面、往下拖都不关
  - 歌曲页「⋯」是下拉小菜单 `#songMenu`（设计规范 5.9）：放在吸顶顶栏 `.bar .wrap` 里，absolute，`openMenu()`/`closeMenu(now)`，切页时 `show()` 直接收起
  - 每日学习：首页 `#today` 卡片（`renderToday()`）→ 学习页 `studyView`（DEPTH 1，`startStudy()`/`studyNext()`/`renderStudy()`，学词 `renderWord`、整句 `renderLine`、完成 `renderDone`）。**进度每一步立刻存**（「会读了」建卡、「这句会了」标 learned + `daily.newLines/done`），不另存"学到哪"，下次进来用 `STUDY.nextLine` + 排除已有卡片算出断开的地方。原唱用 `playStudyLine(loop)`（0.8×，`tick()` 里按 `study.stopAt` 停或循环）。正在学的歌：`STUDY.currentSong`，`setCurrentSong(id)`；存歌用 `saveSong(s)`（原地更新 `songs` 里的对象）
  - 设置页 `settingsView`：首页右上角齿轮进入；「每天新学几句」2/4/6/自定义（自定义展开「− 数字 +」，1–20；存 meta `daily.goal`，默认 4；旧的 `prefs.goal` 启动时搬过去）+ 备份与恢复（`renderSettings()`）
  - 声调键帽（设计规范 5.2）：`.tones .key` 里两层 `.key-base`（声调色，不动）和 `.key-face`（按下时只有它下移 4px）
- 自动粤拼：`to-jyutping@3.1.1`（CanCLID，BSD-2），本地副本 `vendor/to-jyutping.js`（授权在 `vendor/to-jyutping.LICENSE`），全局变量 `ToJyutping`
  - `getJyutpingList(text)` 返回 `[字, 粤拼|null][]`
  - `getJyutpingText(text)` 返回空格分隔的粤拼
  - `getJyutpingCandidates(text)` 返回多音字候选
  - 注意：`getJyutping()` 返回的是「行(haang4)街(gaai1)」这种格式，不是空格分隔
- 数据存在浏览器 IndexedDB（数据库 `yuechang`，版本 2：表 `songs`（keyPath `id`）、`cards`（`w`）、`meta`（`key`）；升级只能加表，不能动 `songs`），音频以 Blob 形式存储；偏好设置存 localStorage（`yc-prefs`）
- 标准发音：浏览器 `speechSynthesis`，语言 `zh-HK`
- 歌词来源：LRCLIB 公开接口 `https://lrclib.net/api/search`（免费、无需 key，连续请求要间隔几百毫秒，偶尔返回 503 需要重试）
- 主要目标设备：**iPhone Safari**。所有功能都要在 iPhone 上能用，按钮至少 44px 高，注意安全区（刘海、底部横条）
- 支持浅色和深色模式（CSS 变量 + `prefers-color-scheme`）
- 界面按 `docs/设计规范.md`（「丁香」风格），组件里只用 CSS 变量，不写颜色值。中文用系统苹方；粤拼、数字用 Outfit（自带在 `fonts/`，OFL）。不从任何外部网站加载字体或脚本

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
- PWA 已完成并在 iPhone 上测试通过：`manifest.json`、`icons/`、`sw.js`（自己的文件联网优先，没网用缓存；改缓存列表时把 `VERSION` 加一）。添加到主屏幕、飞行模式离线打开都正常
- 注意：iPhone 上主屏幕 App 和 Safari 的存储是分开的，开发者现在只用主屏幕 App
- 第二、三阶段按 `docs/第二三阶段开发规格.md`（v2）和 `docs/设计规范.md` 做，分 M1–M7 七个里程碑
- **M1 完成**：数据库 v2、`srs.js`、备份 v2（含生词卡片，兼容 v1）、自由听词卡「＋ 加入生词」。2026-10-27 iPhone 验收通过
- **M2 完成**：丁香界面改版、iPhone 适配（不透明顶栏、输入框 16px、安全区）、Safari 和主屏幕右滑返回、字体和粤拼库自带。M2 里定的：「今天的学习」卡片留到 M4；声调键帽固定 si 组（轮换在 M3）；词汇包和删除歌曲在播放页「⋯」菜单；备份是首页右上角图标 2026-10-27 iPhone 验收通过（含验收反馈修复：歌词输入框、标点和词换行、只用系统右滑）
- **M3 完成**：校对歌词（播放页「⋯」→ 校对歌词：整首挪、单句微调、改错字、试听、对准现在的歌声、未保存提示）、首页声调字每天换一组 + 「换一组」（meta `tones`）
- **M3.1（M3 验收反馈）**：修状态栏闪暗、按钮停在按下状态、编辑页滑入透明、导入页保存（不再灰掉，提示「还差：…」）、歌词输入框露半行；切页变暗不用 filter、回首页放开音频；「换一组」图标转圈；`--danger` 红色；删除都先确认；「校对歌词」改名「编辑歌曲」（歌名歌手、更换音频、插入/拆开/合并/删除一句）；首页多选删除 + 5 秒撤销。2026-10-27 验收：其余通过，状态栏闪暗和按钮停在按下状态没解决
- **M3.2**：状态栏方案 a（顶部永久色带 `#topTint`）；按下效果改 JS 控制；播放条滑入滑出动画。方案 a 真机仍闪
- **M3.3**：状态栏方案 b（遮罩改 absolute，铺满整页，不再是 fixed）。真机不闪暗但闪白
- **M3.4**：状态栏方案 c（遮罩透明，弹层用 `--shadow-sheet` 阴影 + 描边）。真机完全不闪，但开发者不喜欢没有变暗
- **M3.5**：弹层后面加下半屏渐变变暗（开发者不喜欢，已去掉）
- **M3.6**：状态栏方案 d：整屏变暗回来了，遮罩 opacity 固定 1、过渡背景色；`#topTint` 在遮罩下面跟着变暗。真机打开闪白、关闭闪暗
- **M3.7**：状态栏方案 e：遮罩去掉过渡，一下子变暗、一下子恢复。真机打开同步，关闭晚 0.几秒
- **M3.8**：关闭弹层时把 `#topTint` 换成新元素——真机没用，M3.9 撤掉
- **M3.9**：歌曲页的「⋯」菜单和词卡状态栏不变暗：吸顶顶栏 `.bar` 被 Safari 拿来取色，弹层打开时它的背景色变透明（用背景图画底色）
- **M3.10**：开发者决定回到方案 c（完全不闪，也不变暗），代码恢复成 M3.4 的样子。真机：从主屏幕图标打开会闪
- **M3.11**：状态栏换思路，不再调遮罩：备份改成整页「设置」（首页齿轮，从右边滑入，含「每天新学几句」2/4/6 先只显示）；去掉 `#topTint`；弹窗暗色层放进当前页面（absolute，跟着页面）；声调键帽按新规范 5.2 改成底座 + 键面两层；按下 class 改名 `.is-pressed`。真机：不闪，但状态栏不变暗，和变暗的页面不协调
- **M3.12**：整个 App 不再使用暗幕：「⋯」改成下拉小菜单（编辑歌曲 / 词汇包 / 删除）；底部弹窗去掉暗色层、只用阴影，点外面关闭（确认类弹窗必须点按钮，未保存提示加了「继续编辑」）；设计规范 5.6 改写、新增 5.9 下拉菜单。2026-10-28 iPhone 验收通过。之后去掉了播放条返回时的消失动画
- **M4a 完成**（2026-10-28 iPhone 验收通过）：词汇包 v3（新提示词覆盖所有词、只有重点词有下划线、兼容旧包）；「每天新学几句」存到 meta `daily`，加了「自定义」1–20；`progress` 规则（恢复备份时已学句子取并集）
- **M4b 完成（待 iPhone 验收）**：首页「今天的学习」（M5 前不显示复习格）、学词卡片、整句（原唱 0.8× 循环）、完成页、再学 2 句、中途退出继续、副歌和没汉字的句子自动跳过、「设为正在学」、整首学完「选下一首歌」。细节见规格 9 M4b
- 设计截图：`docs/design/player-wordcard.png`（首页、播放、词卡）、`docs/design/learn-line-done-edit.png`（学词、整句、完成、校对歌词）。里面的句子是设计时编的示例，不是真实歌词

## 下一步（按顺序）
1. ~~初始化 git，推送到 GitHub，开启 GitHub Pages~~（已完成）
2. ~~加 PWA 支持~~（已完成）
3. ~~在正式网址上测试 LRCLIB 在线搜索~~（已完成：海外网络下《葡萄成熟时》搜到、时间轴准确；大陆网络仍未测）
4. M4 拆成两半（2026-10-28 开发者决定），一次只做一半：
   - M4a：词汇包 v3（规格第 4 节）+ 设置页「每天新学几句」接上功能（存 `meta.daily`）+ `progress` 数据结构，计划在 `docs/superpowers/plans/2026-10-28-m4a-pack-v3.md`
   - M4b：每日学习流程（规格 5.1–5.6），计划在 `docs/superpowers/plans/2026-10-28-m4b-daily-study.md`
5. M5：复习（规格第 6 节），首页「今天的学习」加回「① 复习 N 个词」那一格
6. 之后按规格做 M6–M7
