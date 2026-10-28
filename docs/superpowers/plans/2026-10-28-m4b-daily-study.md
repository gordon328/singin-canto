# M4b · 每日学习流程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页「今天的学习」卡片 → 一句一句学：每个新词一张学词卡片 → 整句（原唱 0.8× 循环）→ 今日完成页（可「再学 2 句」）；中途退出下次接着学；副歌重复句自动跳过。

**Architecture:** "这句要学哪些词""下一句学哪句""今天还剩几句"这些规则写成 `study.js` 里的纯函数（Node 测试）。页面新增一个学习页 `studyView`（和歌曲页同一层，DEPTH 1），学词、整句、完成三种画面都在这个页面里由 JS 渲染；进度每一步立刻存数据库（建卡、标记 learned、`daily` 计数），所以不需要额外保存"学到哪了"——下次进来按规则算出来就是断开的地方。

**Tech Stack:** 原生 HTML/CSS/JS，IndexedDB，`node --test`，`tests/browser/run.js`。

**Spec:** `docs/第二三阶段开发规格.md` 3.3、3.4、4.3（没覆盖的字）、5.1–5.6、6.2（新卡）、9 M4b；`docs/设计规范.md` 5.1、5.4、5.8、6（学词卡片切换、完成页回弹）、8 第 3 条；设计截图 `docs/design/learn-line-done-edit.png`、`docs/design/player-wordcard.png`。

## Global Constraints

- 组件里只用 CSS 变量；新颜色先在 `:root` 定义浅色/深色两套（进度格当前格：浅 `#B7AEF2`、深 `#5A4FB0`）
- 按钮至少 44px；页面底部主按钮 56px，固定在屏幕下方 + `env(safe-area-inset-bottom)`
- 按下效果用 `.is-pressed`（新可点元素加进 `PRESSABLE`）；`:hover` 只写在 `@media (hover: hover)` 里
- 弹出层不用暗幕；顶部附近不能有带颜色的 fixed 元素
- 减弱动态效果：去掉位移和缩放，只淡入淡出
- 字号：学词大字 72px/700、粤拼 20px Outfit 700；整句字 34px/700、粤拼 14px；完成页标题 26px/700；统计数字 Outfit 28–44px
- 朗读：`speak(text, rate)`；标准 0.8、慢速 0.6；整句「标准慢读」0.6
- 原唱：学词「听原唱」播这句一次 0.8×；整句「原唱 ↻」0.8× 单句循环，再点停止
- 新卡 `SRS.newCard(...)`（due = 明天凌晨 4 点）；「我早就认识」同样建卡并 `known: true`
- "今天"用 `SRS.today(Date.now())`，凌晨 4 点换日
- 测试句子都是编的，不提交歌词/音频

**本计划替开发者做的决定（交付时列出来请他确认）：**
1. 复习页是 M5：**M5 之前首页卡片不显示「① 复习 N 个词」这一格，只显示「新学 N 句」**（开发者 2026-10-28 决定，避免看起来像功能坏了；M5 再加回来）。「开始今天的学习」直接进入新句子。`STUDY.dueCount` 照样做（完成页的明天预告要用）
2. 「设为正在学」只放在歌曲页「⋯」下拉菜单里（规格说"长按或菜单"，二选一），不做长按
3. 没有汉字的句子（只有标点/英文/空）和副歌重复句一样自动标记 learned、不占数量
4. 有汉字没有读音（自动粤拼也给不出）的字不做卡片
5. 设计图「约 12 分钟」不做（规格没写怎么算）
6. 没有词汇包时，首页卡片的按钮变成「先导入词汇包」，点了打开这首歌并弹出词汇包弹窗（复习部分 M5 再说）
7. 学的过程中这首歌全部学完：直接到完成页，标题下面写「这首歌全部学完了 🎉」，不显示「再学 2 句」，换成主色按钮「选下一首歌」（开发者 2026-10-28 补充）：点了弹出底部弹窗（普通弹窗），列出其他还没学完的歌；选一首 → 设为正在学、关弹窗、回到首页。没有其他没学完的歌 → 弹窗里写「其他歌都学完了」并给深色按钮「＋ 导入新歌」（打开导入页）

## Review Focus

1. **同一句里同一个词出现两次，或两个相同的词挨着（「好好」被词汇包的「好」匹配两次）**：只做一张「好」的卡片，不能变成「好好」→ Task 1 测 `lineUnits: 挨着的同一个词拆开、去重`
2. **学到一半关掉，第二天再打开**：今天的计数清零、昨天学过的词不再出卡片、昨天学了一半的那句接着学 → Task 1 测 `nextLine` + Task 4 页面测试「中途退出继续」
3. **歌曲没有音频（从备份恢复的）**：学词、整句照样能学，点原唱按钮提示「先加上音频」，不报错 → Task 3、4 页面测试
4. **一句里所有词都学过了**：直接进入整句，进度格全满 → Task 4 页面测试
5. **今天的数量学完后又点「再学 2 句」，再关掉回首页**：首页显示还剩的句数正确（`goal + extra - newLines`），不出现负数 → Task 1 测 `remaining`

---

### Task 1: `study.js` 学习规则

**Files:**
- Modify: `study.js`、`srs.js`（导出 `dayDue`）
- Test: `tests/study.test.js`、`tests/srs.test.js`

**Interfaces:**
- Consumes: `PACK.computeLineFor` 的返回值形状 `{text, items, words}`（items 见 pack.js）
- Produces（全局 `STUDY`，新增）：
  - `STUDY.hasHan(text) -> boolean`
  - `STUDY.lineUnits(line) -> Unit[]`：`line` 是 `computeLineFor` 的结果。`Unit = {w, jp, chars: [{ch, jp}], word: 词汇包里的词对象 | null}`。按出现顺序：词汇包里的词按词（同一个 `word` 下标连续的字，按 `[...words[wi].w].length` 切块），没被覆盖的汉字按单字；标点、空格跳过；按 `w` 去重（保留第一次）；有汉字 `jp` 为空的单元整个跳过。`jp` = 各字 jp 空格连接（已含 overrides）
  - `STUDY.nextLine(texts, learned) -> {li: number|null, skip: number[]}`：`texts` 是每句应用 fix 后的文字。从 0 往后找第一句没 learned 的：如果它没有汉字，或 `trim()` 后和**前面某句已学会的**（包括这次 skip 里的）文字完全一样 → 放进 `skip`、继续找；找到要学的就返回它；没有了 `li: null`
  - `STUDY.upcoming(texts, learned, n) -> number[]`：接下来要学的 n 句的行号（反复调用 `nextLine`，把每次的 li 当成已学）
  - `STUDY.remaining(daily) -> number`：`max(0, goal + extra - newLines)`
  - `STUDY.dueCount(cards, now, cap = 50) -> number`：`!known && srs.due <= now` 的张数，最多 cap
  - `STUDY.dailyFor` 返回值多两个字段：`songId`（string|null）、`done`（今天学会的行号数组）；新的一天清零成 `null` / `[]`
- `SRS.dayDue(now, days)` 导出（现有函数，不改）

- [ ] **Step 1: 写失败的测试**

`tests/study.test.js` 加（`L(text, words, overrides)` 用 `PACK.computeLineFor({lines:[{t:0,end:1,text}], pack:{words, fix:[]}, overrides}, 0, auto)` 造，`auto = t => [...t].map(c => [c, "x1"])`）：
- `lineUnits: 按词、单字、去重、跳过标点` —— `我哋去，我哋` + 词 `我哋`(jp `ngo5 dei6`) → `[{w:"我哋", jp:"ngo5 dei6"}, {w:"去", jp:"x1", word:null}]`（只比 w/jp/word 是否为 null）
- `lineUnits: 挨着的同一个词拆开、去重` —— `好好` + 词 `好`(jp `hou2`) → 只有 `[{w:"好", jp:"hou2"}]`
- `lineUnits: 没读音的字跳过` —— auto 对 `𪚥` 返回 null → 不出现
- `lineUnits: overrides 的读音` —— overrides `{"0:0":"ngo4"}` → `我哋` 的 jp 是 `ngo4 dei6`
- `nextLine` —— texts `["甲乙","丙丁","甲乙","...","戊"]`，learned `[0]` → `{li:1, skip:[]}`；learned `[0,1]` → `{li:4, skip:[2,3]}`；learned `[0,1,2,3,4]` → `{li:null, skip:[]}`；learned `[]`、texts `["甲乙","甲乙"]` → `{li:0, skip:[]}`（前面没学会就不算重复）
- `upcoming` —— texts 同上、learned `[]`、n 3 → `[0,1,4]`
- `remaining` —— goal 4/extra 2/newLines 5 → 1；goal 4/extra 0/newLines 6 → 0
- `dueCount` —— 3 张到期 1 张没到期 1 张 known 到期 → 3；cap 2 → 2
- `dailyFor` 现有用例补上 `songId: null, done: []`；同一天保留 `done:[3,4]`、`songId:"t1"`；新的一天清零

`tests/srs.test.js` 加 `dayDue：导出`：`SRS.dayDue(new Date(2026,9,28,10).getTime(), 1) === new Date(2026,9,29,4).getTime()`

- [ ] **Step 2: 跑测试确认失败** —— `node --test` → 新用例 FAIL（`is not a function` 等）
- [ ] **Step 3: 实现** `study.js`、`srs.js` 的导出
- [ ] **Step 4: 跑测试确认通过** —— `node --test` → 全部 PASS
- [ ] **Step 5: 提交** `M4b：study.js 学习规则（这句学哪些词、下一句、跳过副歌）`

---

### Task 2: 首页「今天的学习」卡片、歌曲进度、设为正在学

**Files:**
- Modify: `index.html`（首页 HTML 在「六个声调」上面加 `<div id="today"></div>`；`renderHome`；歌曲页 `#songMenu` 加一项；CSS）
- Test: `tests/browser/today.scenario.js`（新建）

**Interfaces:**
- Consumes: Task 1 的 `STUDY.currentSong/progressOf/setCurrent/upcoming/remaining/dueCount`；M4a 的 `getDaily/saveDaily`、`PACK.fixText`
- Produces: `lineTexts(song) -> string[]`（每句 fix 后文字）；`startStudy()`（Task 3 实现，这里按钮先调用它）；`saveSong(s)`（`DB.put` + 替换 `songs` 里的同 id 对象）

- [ ] **Step 1: 写失败的页面测试 `today.scenario.js`**（`F.seed` → T1 有旧词汇包、16 句；T2 没词汇包、2 句，created 都是 1）
- `card-shown`：`#today` 可见，文字含 `今天的学习`、`新学`，**不含 `复习`**，新学数字 `4`，含 `測試歌`（T1 的 `updated` 较新，currentSong 按 created 相同时取第一个——**测试先用页面表达式把 T1 设成 current**，避免依赖顺序）、`第 1–4 句`
- `goal-follows`：设置里改成 2，回首页 → 新学 `2`、`第 1–2 句`
- `song-sub-progress`：T1 的 progress `{learned:[0,1,2]}` → 歌曲卡片副标题含 `已学 3 / 16 句`；T2 含 `未开始`
- `no-pack`：把 T2 设为正在学（歌曲页「⋯」→「设为正在学」）→ 回首页卡片按钮文字 `先导入词汇包`；点它 → 进入 T2 歌曲页且词汇包弹窗打开
- `menu-current`：T2 已经是正在学时菜单里没有「设为正在学」；数据库里只有 T2 `current:true`
- `finished`：T1 设成全部 learned 并是 current → 卡片含 `这首学完了 🎉`，列出 `短句` 开头的 T2 按钮；点它 → T2 变成 current，卡片变回正常
- `done-today`：daily 设成今天 `newLines` = goal → 卡片含 `今天完成了 ✓` 和按钮 `再学 2 句`
- `buttons-44px`、`no-errors`；截图 `today-light`

- [ ] **Step 2: 跑 `node tests/browser/run.js today` 确认失败**
- [ ] **Step 3: 实现**
  - 卡片 HTML（设计规范 5.4，截图首页）：`.today` 主色底、`--on-accent` 字、圆角 28px；标题行「今天的学习」；一个小格 `rgba(255,255,255,.14)`（写成变量 `--on-accent-veil`）「新学 **N** 句」，数字 Outfit 28px（M5 再加「① 复习」那一格，两格并排）；下面一行 `歌名 · 第 a–b 句`；白色按钮（`--surface` 底、`--accent` 字）「开始今天的学习」
  - 新学数 = `min(remaining(daily), upcoming(...).length)`；`remaining` 为 0 → 显示「今天完成了 ✓」+ 按钮「再学 2 句」（`extra += 2` 后 `startStudy()`）
  - 正在学的歌全部学完（`nextLine` 返回 null）→ 「这首学完了 🎉 选下一首」+ 其他没学完的歌的白色小按钮（点 → `setCurrent` 存库、重画）；没有别的歌就只显示一行字
  - 没有歌时不显示卡片；没词汇包 → 按钮「先导入词汇包」：`openSong(id)` 后 `setTimeout(()=>{if(curView==="playerView")openPack()},450)`
  - 歌曲卡片副标题：`[歌手, learned>0 ? "已学 x / n 句" : "未开始", 未导入词汇包?, 缺少音频?]`（替换原来的 `n 句`）
  - `#songMenu` 加 `<button data-menu="current">设为正在学</button>`（第一项）；`openMenu` 时正在学的歌隐藏这一项；点了 `setCurrent` 存库、toast「已设为正在学」
- [ ] **Step 4: 跑 `today` 和全部页面测试** → 全部 PASS（`delete`/`playerbar`/`feedback` 里如果检查了菜单项数量或副标题文字，按新文字更新并在 ledger 记一条 Ruling）
- [ ] **Step 5: 提交** `M4b：首页「今天的学习」卡片、歌曲进度、设为正在学`

---

### Task 3: 学习页——学词卡片

**Files:**
- Modify: `index.html`（新 `<section id="studyView">`；`views`/`DEPTH`（studyView: 1）；`tick()`；popstate 离开时 `speechSynthesis.cancel()`；CSS）
- Test: `tests/browser/study.scenario.js`（新建）

**Interfaces:**
- Consumes: Task 1 `STUDY.lineUnits/nextLine/remaining`；Task 2 `lineTexts/saveSong`；`computeLineFor`、`speak`、`setAudio`、`SRS.newCard`、`TJ`
- Produces: 页面变量 `study = {song, li, units, i, phase: "word"|"line"|"done", stopAt: number|null, loop: boolean}`；`startStudy()`；`studyNext()`（跳过要 skip 的句子、看今天还剩几句，进入下一句的学词或整句，或完成页）；`renderStudy()`；`playStudyLine(loop: boolean)`、`stopStudyAudio()`（Task 4 用）

- [ ] **Step 1: 写失败的页面测试 `study.scenario.js`**（T1 设为 current；第 0 句「我穿風褸出去」，旧词汇包里只有「風褸」，其余单字）
- `enter`：点「开始今天的学习」→ `#studyView` 可见、`history.state.view === "studyView"`
- `word-card-1`：第 1 张是「我」：顶部 `1 / 5`（我、穿、風褸、出、去）、5 个进度格、第 1 格是当前色；上方一条含 `今日第 1 句` 且「我」高亮（`.hl`）；大字「我」上面有粤拼；有声调标签 `第 N 声`；释义显示 `暂无释义`、提示「可以重新生成词汇包」
- `speak-auto`：页面里把 `speechSynthesis.speak` 换成记录函数 → 卡片出现后记录到「我」
- `buttons`：🔊（0.8）、「慢速再听」（0.6）、「听原唱」都在，高度 ≥ 44px；「听原唱」点了 `#au` 在播（`!au.paused`）、`playbackRate === 0.8`，过了这句 `end` 后停
- `known`：先点两次「会读了，下一个」→ 第 3 张是「風褸」、显示 `风衣`；点「我早就认识这个词」→ 数据库 `風褸` 卡 `known === true`；「我」卡 `known === false`、`srs.interval === 1`、`sources[0]` 是 `{songId:"t1", li:0}`
- `no-audio`：把 T2 设为 current、给 T2 一个只有「短」字的词汇包 → 学词「听原唱」点了 toast 含「先加上音频」，`b.errors` 为空
- `close`：点 ×（`[data-back]`）→ 回首页，`#au` 暂停
- `no-errors`；截图 `study-word-light`

- [ ] **Step 2: 跑 `node tests/browser/run.js study` 确认失败**
- [ ] **Step 3: 实现**（照截图「学词」）
  - 顶栏：左 × 关闭（`data-back`），中间进度格（`.cells`，每格 8px 高、圆角 4px，done `--accent`、cur `--cell-cur`、其他 `--rule`），右边 `2 / 5`
  - 句子条：白底圆角 18px，`今日第 k 句 · ` + 整句，当前词的字加 `.hl`（`--accent-soft` 底）；`k = daily.newLines + 1`
  - 大卡片（`--surface`、`--shadow-2`、圆角 30px）：每字一列（粤拼声调色 20px 在上、汉字 72px 在下）；声调标签（复用 `.tone-tag`）；释义 22px（没有就 `暂无释义` + 小字「这个字词汇包里没有，可以重新生成词汇包」）；提示框 `tip`；三个按钮：🔊 圆形 64px 主色、「慢速再听」「听原唱」浅色
  - `TJ.getJyutpingText(w) !== jp` 时按钮下面小字「系统朗读可能不准，以粤拼为准」
  - 底部固定：深色 56px「会读了，下一个」、文字按钮「我早就认识这个词」
  - 卡片出现时 `speak(w, 0.8)`（try/catch，不报错）
  - 切换：旧卡片 `.out`（往左滑出淡出）、新卡片 `.in`（从右滑入），`--dur`；减弱动态只淡入淡出
  - 建卡：`SRS.newCard({w, jp, zh, tip, oral}, {songId, li}, Date.now())`，known 时再加 `known: true`；已存在同 w 的卡不覆盖（只跳过）
  - 原唱：`setAudio(song.audio)` 在 `startStudy` 时做；`playStudyLine(loop)`：没音频 toast「先加上音频」；`au.currentTime = t`、`au.playbackRate = 0.8`、`study.stopAt = end`、`study.loop = loop`、`play()`；`tick()` 加 studyView 分支：到 `stopAt` 时 loop 就跳回 `t`，否则暂停
  - `startStudy()`：`currentSong` 没有 current 标记就 `setCurrent` 存库；`daily.songId` 设为这首；`go("studyView")`；`studyNext()`
- [ ] **Step 4: 跑 `study` 和全部测试** → PASS
- [ ] **Step 5: 提交** `M4b：学习页——学词卡片`

---

### Task 4: 整句、完成页、再学 2 句、中途退出继续、副歌跳过

**Files:**
- Modify: `index.html`、`CLAUDE.md`、`docs/第二三阶段开发规格.md`（9 M4b 补"本计划替开发者做的决定"7 条）
- Test: `tests/browser/study.scenario.js`（加检查）

**Interfaces:**
- Consumes: Task 3 的 `study`、`studyNext`、`renderStudy`、`playStudyLine/stopStudyAudio`；Task 1 的 `upcoming`、`dueCount`；`SRS.dayDue`

- [ ] **Step 1: 写失败的检查**（接着 Task 3 的场景，句子是 fixture 里编的；先用页面表达式给 T1 插一句和第 0 句一样的副歌：把第 2 句文字改成「我穿風褸出去」，第 3 句改成「……」）
- `line-view`：第 0 句词学完 → 进度格全满（`--accent`）、右边 `整句`；小字「把这句连起来读」；整句卡片每字粤拼 + 汉字
- `line-buttons`：「标准慢读」→ 朗读整句 0.6；「原唱 ↻」→ 在播、0.8、下方 `0.8× · 循环中`；过了 `end` 跳回 `t`（循环）；再点 → 停
- `line-done`：点「这句会了，下一句」→ 停止播放；数据库 T1 `progress.learned` 含 0；meta `daily.newLines === 1`、`done` 含 0
- `skip-learned-words`：第 1 句的卡片里没有第 0 句学过的字
- `resume`：在第 1 句学了 1 个词后点 × → 首页新学数仍是 3（4−1）；再点「开始今天的学习」→ 直接是第 1 句的第 2 个新词（不是第 1 个）
- `chorus-skip`：学完第 1 句 → 下一句是第 4 句（第 2 句和第 0 句一样、第 3 句没有汉字，都自动 learned，`newLines` 不加）
- `done-page`：设置每天 2 句时学完第 2 句 → 完成页：标题 `今天的 2 句学完了`、`測試歌 · 第 1、2 句` 的范围写成 `第 1–2 句`（用 done 的最小/最大行号 +1）、三个统计（复习的词 0、新学的词 = 今天建的卡数、已学句子 = learned 数）、预告 `明天要复习 N 个词，再学第 a–b 句。`（N = `dueCount(cards, SRS.dayDue(now,1))`，a–b = `upcoming(...goal)`）；勾选图标有 `.pop` 动画
- `more-2`：点「还有精神，再学 2 句」→ `daily.extra === 2`，进入下一句学词
- `home-btn`：「回到首页」→ 首页
- `song-finished`：只剩最后一句时学完 → 完成页含「这首歌全部学完了 🎉」、没有「再学 2 句」、有「选下一首歌」
- `pick-next`：点「选下一首歌」→ 弹窗列出 T2（`短句` 开头）；点它 → 回到首页，数据库 T2 `current:true`、T1 `current:false`
- `pick-next-none`：T2 也全部 learned 时点「选下一首歌」→ 弹窗含「其他歌都学完了」和「＋ 导入新歌」；点它 → `#importView` 可见
- `swipe-back`：学习中 `history.back()` → 回首页，已学的保存了
- `no-errors`；截图 `study-line-light`、`study-done-light`、`study-done-dark`（深色用 `Emulation.setEmulatedMedia`，照现有场景写法）

- [ ] **Step 2: 跑 `study` 确认新检查失败**
- [ ] **Step 3: 实现**
  - 整句（照截图「整句」）：小字「把这句连起来读」；白色大卡片，每字粤拼 14px + 汉字 34px，可换行（复用 `wrapGroups`）；两个大按钮：白色「标准慢读」（副标题「一个字一个字」）、主色「原唱 ↻」（播放中副标题 `0.8× · 循环中`）；提示框「先听原唱，再跟着小声唱出来。能跟上了就点下面。」；底部深色「这句会了，下一句」
  - 「这句会了」：`stopStudyAudio()`；`progress = STUDY.withLearned`；`daily.newLines += 1`、`daily.done.push(li)`；存库；`studyNext()`
  - `studyNext()`：`nextLine` 的 `skip` 全部 `withLearned` 存库（不加 newLines）；`li === null` 或 `remaining(daily) === 0` → 完成页；否则算 units（排除 `cards.has(w)`），空的直接整句
  - 完成页（照截图「完成」）：勾选图标 96px 方圆 `--accent-soft` 底，`.pop` 0.6→1 回弹；标题 26px；三个统计白卡片；预告白卡片；底部主色「还有精神，再学 2 句」、白色「回到首页」（`goBack()`）
  - 新学的词 = 今天建的卡（`SRS.today(c.created) === today`）数
  - `CLAUDE.md`：技术约定加学习页一条（`studyView`、`startStudy/studyNext`、进度每步立即保存）；当前进度「M4b 完成（待 iPhone 验收）」；下一步改成 M5
  - 规格 9 M4b 下面加"实现时定下的细节"（本计划开头 7 条）
- [ ] **Step 4: 跑 `node --test` 和 `node tests/browser/run.js`** → 全部 PASS
- [ ] **Step 5: 提交** `M4b：整句、完成页、再学 2 句、中途继续、副歌跳过`

---

## 交给开发者在 iPhone 上测（M4b 验收）

（完成后直接合并到 main 并 push，见 CLAUDE.md 固定规则）

1. 首页最上面有紫色「今天的学习」卡片：新学 4 句、「富士山下 · 第 1–4 句」（复习那一格 M5 才加）
2. 设置里改成 2 句，首页跟着变成 2
3. 点「开始今天的学习」：每个新词一张卡片，出现时自动读一次；「会读了，下一个」换下一张，卡片左滑出、右滑入
4. 词都学完进入整句：「原唱 ↻」0.8 倍速一直循环，再点停止
5. 学第 2 句时，第 1 句学过的字不再出现
6. 学到一半点 × 关掉，再点「开始今天的学习」，从断开的那个词继续
7. 学完今天的句数出现完成页；「还有精神，再学 2 句」能接着学
8. 副歌重复的句子自动跳过（完成页的句子范围会跳过它）
9. 歌曲页「⋯」→「设为正在学」能换一首歌学；一首歌全部学完时，完成页「选下一首歌」能选别的歌
10. 手机切深色模式，学习页和完成页都正常
