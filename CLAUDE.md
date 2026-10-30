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

## 固定规则（每次都要遵守）
- **始终用简体中文回复**，包括计划、总结、提问和 git 提交说明。读英文文档或技能后也用中文回复
- **自动上线**：每完成一个修复或里程碑，电脑上的自动测试通过后，直接合并到 main 并 push 上线，不用问我。上线后告诉我版本号和在 iPhone 上怎么测
- 上线前确认没有提交任何 mp3、lrc 或歌词文本（唯一例外：`audio/hiujin/` 里 MIT 授权的单音节发音录音，见下面「标准发音」）
- **每次改界面都要按设计规范 4.4「视觉对齐规则」检查**：间距只用 4/8/12/16/20/24/32px；左右边距和左边缘对齐；同类按钮一致；状态切换时其他元素不动。改完跑 `node tests/browser/run.js visual`（440×956，浅色 + 深色截图，检查没有横向溢出），自己看过截图、量过状态切换前后的位置，发现问题先修好再给开发者测
- **完成后直接合并到 main 并 push 上线，不开 PR，不需要 gh 命令行工具**（开发者一个人的项目，2026-10-28 开发者决定）。做法：在功能分支上提交并跑完测试 → `git merge` 到 main（能快进就快进）→ `git push origin main`。推送后 GitHub Pages 1–2 分钟内更新，告诉开发者可以在 iPhone 上测了
- **版本管理**（2026-10-30 起，从 v0.30 开始执行）：
  1. 版本号 `v0.xx`：每次上线小数点后 +1（v0.30、v0.31……v0.99 之后是 v0.100、v0.101，不会变成 v1.0）。只有开发者明确说「发布正式版」才改成 v1.0。每次同步改：`index.html` 的 `APP_VERSION`（首页底部和设置页「关于」都用它）、`sw.js` 的 `VERSION`、测试里写死的版本号（`grep -rn "v0\.[0-9]" tests/browser`）
  2. git 标签：上线（push main）后给这次的提交打标签 `git tag v0.31`，并 `git push origin v0.31`
  3. 更新记录：根目录 `CHANGELOG.md`，最新的在最上面。每个版本：`## v0.31 · 日期`，下面用中文大白话写改动（给开发者看的，不写技术细节）。改了数据结构的版本加一行醒目的「⚠️ 数据结构有变化：……」。App 里设置页「关于 → 版本记录」直接显示这个文件（`renderChangelog()`，只认 `##`、`###`、`- `、含 ⚠️ 的行、`**粗体**`）
  4. 回退：开发者说「回到某个版本」时，用新的提交把代码恢复到那个版本（`git checkout v0.xx -- .` 之类，再提交），**不用 reset 或 force push 删除历史**。中间如果有「⚠️ 数据结构有变化」的版本，先停下来告诉开发者风险，让开发者先导出备份再商量。回退也是一个新版本，版本号继续 +1，更新记录写「回退到 v0.xx」
- **每次改动涉及数据时，必须遵守 `docs/数据兼容规则.md`**（dataVersion + 迁移函数、只加不删、迁移前快照、备份兼容、`tests/fixtures/` 兼容性测试每次上线前必须通过）

## 技术约定
- **`index.html` + 少量普通 .js 文件**（`<script src>` 引入），原生 HTML/CSS/JavaScript，不用框架，不用构建工具（没有 npm build）。保持简单，开发者能直接打开
  - `srs.js`：间隔复习算法和卡片纯函数（全局 `SRS`：`newSrs`、`review`、`newCard`、`dueLabel`、`mergeCards`、`today`、`dayDue`；「我的生词」筛选 `inTab(c, tab, now)`、搜索 `matchCard(c, q)`）。"今天"按本地凌晨 4 点换日
  - `lessons.js`：课程内容（全局 `LESSONS`：`TONE_SETS` 8 组声调字、`toneSetFor(rec, today)` 首页今天用哪组；M6 的入门课也放这里）
  - `proof.js`：编辑歌曲（原「校对歌词」）的时间计算和行操作（全局 `PROOF`：`shiftAll`、`setStart`、`fmtT`、`fmtOffset`；行操作 `toEdit`、`insertAfter`、`split`、`mergeUp`、`remove`、`toSong`，保存时 `toSong` 返回新的 lines/overrides/learned 和原行号→新行号的 map，用来更新卡片出处）
  - `gesture.js`：手势判断纯函数（全局 `GESTURE`：`dragDismissDecision`，弹层下拉关闭）
  - `checkin.js`：打卡规则纯函数（全局 `CHECKIN`：`normalize`、`qualifies`、`markDone`、`process`（发休息卡、补漏打卡）、`streak`、`total`、`best`、`dayState`（日历格子：done / more / rest）、`weekOf`、`monthGrid`、`detail`、`merge`、`isoWeek`、`addDays`），数据在 meta `checkin`（规格 7.9）
  - 时间：日期和复习相关的「现在」都用 `appNow()`（= 真实时间 + 调试面板「模拟日期」的天数，存 localStorage `yc-simdays`，只在调试面板打开、并且不是主屏幕 App 时生效：模拟期间写下的数据都是真的会留下来，所以只在 Safari 里测）；只有 `uid` 和歌词滚动计时用 `Date.now()`
  - 打卡：完成页 `renderDone()` 里 `checkinToday()`；启动、切回前台、改模拟日期时 `onDayChange()` → `processCheckin()`；日历页 `calendarView`（首页那一行进入，DEPTH 1，`renderCalendar()`）
  - `voice.js`：标准发音的音节清单和纯函数（全局 `VOICE`：`HAS`、`plan(jp)`、`url`、`trimRange`、`GAP`）
  - `pack.js`：词汇包纯函数（全局 `PACK`：`buildPrompt`、`parsePack(raw, lines)`、`computeLineFor(song, li, autoJp)`、`fixText`、`HAN`）。词汇包 v3（`v:3`）覆盖整首歌的词，只有 `key:true` 的显示下划线；导入时整包里有一个词带 `key` 字段就按 v3 处理，整包都没有 `key` 是旧格式、全部当重点词。页面里 `computeLineFor(song, li)` / `computeLine(li)` 是它的包装
  - `study.js`：每日学习规则（全局 `STUDY`：`progressOf`、`withLearned`、`mergeProgress`、`currentSong`、`setCurrent`、`goalOf`、`dailyFor`，`GOALS` 2/4/6、`GOAL_MIN` 1、`GOAL_MAX` 20）。页面里 `getDaily()` / `saveDaily(rec)` 读写 meta `daily`。M4b 的学习流程也写在这里
  - 测试：`node --test`（纯函数）；`node tests/browser/run.js [过滤]`（页面测试，用本机 Chrome 无界面跑 `tests/browser/*.scenario.js`，截图在 `tests/browser/out/` 不进仓库）。开发者不用跑
  - 页面切换：`go(view)` / `goBack()` + `history.pushState/replaceState`，按层级 `DEPTH`：首页(0) → 导入/打轴/播放/设置(1) → 编辑歌曲(2)，往深一层 push、同层 replace。右滑返回 **Safari 和主屏幕模式都只用 iOS 系统自带的**，App 不自己实现（2026-10-27 开发者 iPhone 实测：主屏幕模式下系统也有右滑返回，App 再做一套会出现两个首页）。系统手势触发的 popstate 不播 App 的返回动画。**跳转都走 `afterRelease()`**（`go()`/`goBack()` 里）：先松开按钮、等两帧再等 120ms 弹回动画才 pushState，否则系统右滑的快照里按钮是按下的（设计规范 8.1）；编辑歌曲页有未保存改动时 popstate 会推回编辑页并弹出保存提示
  - 歌词换行：`wrapGroups()` 把标点和前一个字、同一个词的字、最后两个字绑成不能拆开的组
  - 新增要离线可用的文件时，加进 `sw.js` 的 `SHELL` 并把 `VERSION` 加一
  - 删除类操作都用 `confirmSheet({title, body})`（返回 Promise<boolean>）先确认；删除歌曲走 `deleteSongs(ids)`：先从列表拿掉，5 秒内可撤销，`commitDelete()` 才真正删数据库（5 秒后、离开首页、切后台），卡片保留只去掉出处
  - 按下效果：**不用 CSS `:active`**，JS 在 pointerdown 时给 `PRESSABLE`（`.btn,.tones .key,.song,.ib,.res,.streak,.cal-grid .cal-day`）加 `.is-pressed`，抬起/取消/移出/滚动时去掉；`go()`/`goBack()` 先 `clearPressed()` 再等一帧才切页；popstate、pageshow 也清掉。`:hover` 只能写在 `@media (hover: hover)` 里
  - 浮动播放条 `.player`、学习页 `.study-foot`：`show()` 在切页动画结束后加 `bar-in`（从下方滑入 + 淡入）；离开时没有动画，切页时 `body.navigating` 直接隐藏。**常驻按钮**「＋ 导入新歌」`#btnAdd`、导入页「保存」`#btnSave`：放在 section 外面（`data-page="home"` / `"importView"`），`pageButtons()` 按当前页面直接显示/隐藏，没有动画。学习页原唱 `playStudyLine` 只播这一句（到下一句开始停）、固定 0.8×（`applyRate` 在学习页用 0.8），所有播放都走 `playAu({at, onFail})`（必须在点击里直接调用）：失败或 4 秒没播起来 → `reloadAudio()` 从 IndexedDB（`DB.fresh`，绕过内存缓存）重新读这首歌的音频、换新 object URL 再试一次，还失败才 toast，提示带「错误代码」（MediaError code · play() 错误名 · 超时 T+readyState+networkState）。App 回到前台（visibilitychange / pageshow）时 `checkAudio()` 检查音频还读不读得出来，不行就重新加载。测试 `audio-recover`、累积检查 `stress2`（学习页、自由听、编辑歌曲进出 33 次）
  - 状态栏：iOS 26 Safari 用靠近屏幕顶部的 fixed 元素的颜色染状态栏，所以**顶部附近不能有带颜色的 fixed 元素**（`#topTint` 已去掉）。**弹出层不使用暗幕**（M3.12，设计规范 5.6）：底部弹窗 `openSheet(html, {modal})` 只靠 `--shadow-sheet` 阴影；点外面关闭（document 上的 pointerdown/pointerup 判断，移动超过 10px 算滚动，紧跟的 click 吞掉）；所有弹窗都有拖动条、统一间距（设计规范 5.6）；`modal: true` 的确认类弹窗（`confirmSheet`、未保存提示）点外面不关，往下拖关闭等于取消
  - 歌曲页「⋯」是下拉小菜单 `#songMenu`（设计规范 5.9）：放在吸顶顶栏 `.bar .wrap` 里，absolute，`openMenu()`/`closeMenu(now)`，切页时 `show()` 直接收起
  - 每日学习：首页 `#today` 卡片（`renderToday()`）→ 学习页 `studyView`（DEPTH 1，`startStudy()`/`studyNext()`/`renderStudy()`，学词 `renderWord`、整句 `renderLine`、完成 `renderDone`）。**进度每一步立刻存**（「会读了」建卡、「这句会了」标 learned + `daily.newLines/done`），不另存"学到哪"，下次进来用 `STUDY.nextLine` + 排除已有卡片算出断开的地方。原唱用 `playStudyLine(loop)` / `playLineOf(song, li, loop)`（0.8×，`tick()` 里按 `study.stopAt` 停或循环）。**复习**（M5）是学习页的第一段 `phase: "review"`（`renderReview`、`gradeCard`）：`STUDY.reviewQueue` 到期早的先、最多 50 张，「忘了」的卡这一轮最后再出一次（`STUDY.afterGrade`），每张卡评完立刻存 `srs` 和 `daily.reviewed`；`startStudy({reviewOnly})` 只复习、复习完到完成页。「我的生词」`wordsView`（设置页进入，DEPTH 2，`renderWords`、`openWordCard`；筛选标签 + 搜索 + 多选，底部「标为认识 / 取消认识 / 删除」，删除走 `deleteWords(ws)`，5 秒内可撤销，`commitWordDel()` 才真正删数据库（5 秒后、离开这页、切后台））正在学的歌：`STUDY.currentSong`，`setCurrentSong(id)`；存歌用 `saveSong(s)`（原地更新 `songs` 里的对象）
  - 设置页 `settingsView`（设计规范 5.11，v0.31 起是分组列表 `.sgrp` / `.cell`，行高 52px）：首页右上角齿轮进入。学习组：「每天新学几句」2/4/6/自定义（自定义展开「− 数字 +」，1–20；存 meta `daily.goal`，默认 4）、我的生词 `#wordsRow`；数据组：导出备份文件 `#bkExport`（右边 `#bkAge`「上次：今天」）、从文件恢复（`#bkFile`）、只在 Safari 打开时显示 `#bkTip`；关于组：版本记录 `#btnChangelog`。`renderSettings()`。导出、恢复结果用 toast。注意 `.grp` 是歌词换行用的 class，设置页别用
  - 声调键帽（设计规范 5.2）：`.tones .key` 里两层 `.key-base`（声调色，不动）和 `.key-face`（按下时只有它下移 4px）
- 自动粤拼：`to-jyutping@3.1.1`（CanCLID，BSD-2），本地副本 `vendor/to-jyutping.js`（授权在 `vendor/to-jyutping.LICENSE`），全局变量 `ToJyutping`
  - `getJyutpingList(text)` 返回 `[字, 粤拼|null][]`
  - `getJyutpingText(text)` 返回空格分隔的粤拼
  - `getJyutpingCandidates(text)` 返回多音字候选
  - 注意：`getJyutping()` 返回的是「行(haang4)街(gaai1)」这种格式，不是空格分隔
- 数据存在浏览器 IndexedDB（数据库 `yuechang`，v0.30 起版本 3：表 `songs`（keyPath `id`）、`cards`（`w`）、`meta`（`key`）、`snapshot`（`key`，升级前快照）；`DB.open()` 不写死版本号，缺表才加一；升级只能加表），音频以 Blob 形式存储；偏好设置存 localStorage（`yc-prefs`）
  - 数据格式：`data.js`（全局 `DATA`：`VERSION`、`STEPS`、`migrate`、`backupVersion`、`upgradeBackup`），本机版本在 meta `dataVersion`。启动时 `upgradeData()`（先存快照再迁移，失败自动恢复）；设置页「恢复到更新前的数据」`restoreSnapshot()`。规则见 `docs/数据兼容规则.md`，示例数据在 `tests/fixtures/`，测试 `tests/data.test.js` 和 `tests/browser/data.scenario.js`
- 标准发音（v24，规格 7.8）：用 `audio/hiujin/音节.mp3` 单音节录音（Cantone 数据集的 Amazon Hiujin，MIT，授权在 `audio/LICENSE`），`say(text, jp, mode, rate)` 用 Web Audio 拼接：正常字间 0.05 秒，「逐字听」和整句「标准慢读」0.3 秒。有音节没录音时整个词退回浏览器 `speechSynthesis`（`speak()`，zh-HK）。`sw.js` 把 `audio/` 存在单独缓存 `voice-hiujin-1`（先用缓存，换版本不删）；启动后和打开歌曲时提前下载要用的音节。`.gitignore` 只放行 `audio/hiujin/*.mp3`
- 歌词来源：LRCLIB 公开接口 `https://lrclib.net/api/search`（免费、无需 key，连续请求要间隔几百毫秒，偶尔返回 503 需要重试）
- 主要目标设备：**iPhone Safari**。所有功能都要在 iPhone 上能用，按钮至少 44px 高，注意安全区（刘海、底部横条）
- 支持浅色和深色模式（CSS 变量 + `prefers-color-scheme`）
- **皮肤**（v0.33，开发规格 7.10）：颜色值**只在** `skins/<id>.js`（丁香 lilac、夜曲 night、晨雾 mist），`index.html` 里没有任何颜色值，**组件代码里不能出现针对某个皮肤 id 的判断**，差别全靠变量（有测试 `skins` 检查）
  - `skins/registry.js`：`SKIN_IDS`（加皮肤只在这里加一行），页面里按顺序同步加载皮肤文件；`sw.js` 用它自动缓存
  - `skins/skin.js`（`SKIN`）：`cssVars`、`stylesheet`、`colorsFor`、`check`（颜色自动检查，`tests/skins.test.js`，不通过不能上线）、`pick`；`skins/unlock-rules.js`（`UNLOCK`）：`RULES`、`context`、`newlyUnlocked`
  - `<head>` 里「皮肤：开始/结束」那一块：生成样式表、按 localStorage `yc-skin` 在第一帧前套用、全局 `applySkin(id,{animate})`（0.3 秒过渡、theme-color）。当前皮肤记在 meta `checkin.theme`，已解锁 `checkin.unlocked`（文字数组）+ `unlockedInfo`（来源、日期）；`syncSkin()` 启动和恢复备份后按记录换皮肤（不存在或没解锁用丁香）
  - 输入框（设计规范 5.14）：卡片里底色 `--bg`、页面上 `.on-page` 用 `--surface`；1px `--field-border`（引擎给，=muted，颜色检查 ≥ 3:1），点进去 1.5px 主色。新加输入框不用另写样式
  - 设置 › 外观 › 皮肤 `skinsView`（DEPTH 2，分「已拥有」「未解锁」两组，`openSkinsPage()` 处理刚解锁的移位动画，`renderSkins()`、`skinPreview(def,size)`、`useSkin(id)`）；解锁 `checkUnlocks()`（启动、回到首页、完成页打卡动画后、恢复备份后）；没弹过窗的记在 `checkin.unseen`，`showUnlocks()` 一个个弹，学习中间不弹
  - 加新皮肤按 `docs/皮肤/README.md`；每个皮肤的说明在 `docs/皮肤/<id>.md`
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
- **M3.12（v18）**：查「回首页按钮还像按下」先抓证据：首页底部版本号连点 3 下开关调试面板（`#dbg`，存 localStorage `yc-debug`），回首页后 0/≈100/≈500/≈1000/3000ms 量刚才点的按钮（is-pressed、:active、:focus、:hover、焦点、transform、背景）+ 最近 10 个触摸事件。同时回首页时 `freshHome()` 把首页固定按钮换成新元素并 blur（这些按钮的点击改成 `onClick(id,fn)` 在 document 上分发）。注意：歌曲卡片本来每次回首页就是新元素，开发者说卡片也会卡住，所以旧 class 大概率不是原因。等真机截图
- **M3.12**：整个 App 不再使用暗幕：「⋯」改成下拉小菜单（编辑歌曲 / 词汇包 / 删除）；底部弹窗去掉暗色层、只用阴影，点外面关闭（确认类弹窗必须点按钮，未保存提示加了「继续编辑」）；设计规范 5.6 改写、新增 5.9 下拉菜单。2026-10-28 iPhone 验收通过。之后去掉了播放条返回时的消失动画
- **M4a 完成**（2026-10-28 iPhone 验收通过）：词汇包 v3（新提示词覆盖所有词、只有重点词有下划线、兼容旧包）；「每天新学几句」存到 meta `daily`，加了「自定义」1–20；`progress` 规则（恢复备份时已学句子取并集）
- **M5 完成（待 iPhone 验收）**：复习（翻面卡片、忘了/模糊/记得、出处和原唱这句、先复习后新学）、首页两格并排 / 只剩复习时「开始复习」、设置页「我的生词」。细节见规格 9 M5
- **我的生词：筛选和多选**（v20，待 iPhone 验收）：全部 / 学习中 / 已认识 / 今天到期（带数量）、搜索汉字/粤拼/意思、「选择」多选 +「全选」（只选当前筛选结果）、底部「标为认识 / 取消认识 / 删除」（删除 5 秒撤销）。取消认识 = 明天凌晨 4 点开始复习。见规格 6.3
- **M4b 完成**（2026-10-29 iPhone 验收通过，含验收反馈：底部按钮动画、首页紧凑一行、原唱只播这一句、「＋ 导入新歌」和「保存」常驻）：首页「今天的学习」（M5 前不显示复习格）、学词卡片、整句（原唱 0.8× 循环）、完成页、再学 2 句、中途退出继续、副歌和没汉字的句子自动跳过、「设为正在学」、整首学完「选下一首歌」。细节见规格 9 M4b
- **v22**：首页底部渐进模糊上边缘对齐「＋ 导入新歌」（`fitEdgeBlur()` 按按钮位置算），最强 4px
- **v23（2026-10-30）**：修编辑歌曲页能左右拖（「更换音频」里的选文件框在 iPhone 上超出屏幕，现在钉在按钮左上角、按钮 `overflow:hidden`；`html, body { overflow-x: clip }` 保险）；所有弹窗统一间距、都有拖动条（确认类往下拖 = 取消）；选择模式不再挪动别的元素（勾选框改到右边、「选择」「完成」60 宽、「我的歌」行固定高、生词列表留白固定）；齿轮按下就转 60 度（0.5 秒 ease-out，取消转回）；全 App 视觉对齐（设计规范 4.4），新增 `visual` 截图测试。2026-10-30 iPhone 验收通过
- **v24（2026-10-30）**：发音改进。开发者在试听页选了 Hiujin；标准发音换成单音节录音（规格 7.8）、「慢速再听」改名「逐字听」、多字词音节连读停 0.05 秒；有录音时不再显示「系统朗读可能读错」。iPhone 验收通过
- **v25（2026-10-30）**：开发者听过决定多字词保持录音连读；整句「标准慢读」也改成逐字录音（停 0.3 秒，有音节没录音时整句退回系统朗读）。2026-10-30 iPhone 验收通过
- **v0.34（2026-10-31，待 iPhone 验收）**：输入框统一（深色下看得清）、颜色检查加输入框边框 ≥ 3:1；皮肤页分「已拥有」「未解锁」两组，解锁后移位动画；分组小标题 12px
- **v0.33（2026-10-31）**：M5.5 后半「皮肤」（计划 `docs/superpowers/plans/2026-10-31-m55b-skins.md`）：丁香 / 夜曲（连续打卡 3 天）/ 晨雾（学会第一首歌）三个独立皮肤文件、颜色自动检查、「今天的学习」小格和按钮变量、设置 › 皮肤页、解锁弹窗、数据格式第 5 版（`unlockedInfo`）。兑换码和开发者模式下一次做
- **v0.32（2026-10-31）**：删掉「恢复到更新前的数据」（快照只在后台：迁移前存、失败自动恢复）；调试面板可以收起：`#dbgWrap` 里小圆按钮 `#dbgFab`（44px 半透明，默认收起，可拖动，松手吸到左边或右边，位置存 localStorage `yc-dbgpos`，top ≥ 120 不进状态栏；展开时挪到面板上方）+ 面板 `#dbgPanel`（下半屏，`.dbg-body` 能滚动，没有暗幕；里面是 `#dbg` 触摸记录、`#dbgSim` 模拟日期、`#dbgData` 数据和最近的错误）。`setDbgOpen()`、`renderDbgShell()`；收起时照常记录。测试 `dbgfab`
- **v0.31（2026-10-31）**：修 v0.30「从文件恢复」同时提示「已恢复」和「保存失败：空间不够」——写歌曲时改用数据库里的音频（内存里的音频切后台后会失效），`DB.write()` 一个事务全有或全无、连接断了重开再试、按真正错误原因提示（`errText`）、恢复后核对数量（`verifyRestore`）、错误记录 `yc-errlog` 在调试面板「数据」里；设置页改成分组列表
- **v0.30（2026-10-30）**：版本号改成 v0.xx、git 标签、CHANGELOG.md 和设置页「版本记录」；数据兼容：dataVersion + 迁移、升级前快照和「恢复到更新前的数据」、备份带版本（太新的不导入）、申请持久存储、`tests/fixtures/` 兼容性测试
- **v29（2026-10-30，待 iPhone 验收）**：打卡日历不再按学习量分深浅：打卡的日子都用主色填满，当天点过「再学 2 句」的日子右上角加小星星（打卡记录里 `more: true`）；图例改成已打卡 / 多学了 / 休息日；完成页本周格子同样规则
- **v28（2026-10-30）**：打卡日历页顶部统计改成一张合并卡片（设计图 `docs/design/calendar-stats.png` 方案 B）：上面连续 / 累计 / 最长连续三列（连续断了显示「—」），下面休息卡横栏；整个月在 iPhone 17 Pro Max 上不用滚动就能看到
- **v27（2026-10-30）**：休息卡改成三个小卡片图标 +「N/3」（日历页统计、首页提示统一用 `tokensHTML()`）；说明文字没存满时「每周一发 1 张」，存满时「已存满，用掉后才会继续发放」
- **v26（2026-10-30，待 iPhone 验收）**：M5.5 前半「打卡」（规格 7.9，计划 `docs/superpowers/plans/2026-10-30-m55a-checkin.md`）：首页连续/累计天数、日历页、完成页本周格子和打卡动画、休息卡、调试面板模拟日期、备份合并打卡记录。下一步：测好后做后半「皮肤」（解锁弹窗、设置里的皮肤页、夜曲和晨雾配色）
- 设计截图：`docs/design/player-wordcard.png`（首页、播放、词卡）、`docs/design/learn-line-done-edit.png`（学词、整句、完成、校对歌词）。里面的句子是设计时编的示例，不是真实歌词

## 下一步（按顺序）
1. ~~初始化 git，推送到 GitHub，开启 GitHub Pages~~（已完成）
2. ~~加 PWA 支持~~（已完成）
3. ~~在正式网址上测试 LRCLIB 在线搜索~~（已完成：海外网络下《葡萄成熟时》搜到、时间轴准确；大陆网络仍未测）
4. M4 拆成两半（2026-10-28 开发者决定），一次只做一半：
   - M4a：词汇包 v3（规格第 4 节）+ 设置页「每天新学几句」接上功能（存 `meta.daily`）+ `progress` 数据结构，计划在 `docs/superpowers/plans/2026-10-28-m4a-pack-v3.md`
   - M4b：每日学习流程（规格 5.1–5.6），计划在 `docs/superpowers/plans/2026-10-28-m4b-daily-study.md`
5. M5 验收：iPhone 测完后，按规格"第二阶段完成"：开发者正常用几天，收集反馈
6. 之后按规格做 M6（小测验组件 + 入门单元）、M7（今日小测）
