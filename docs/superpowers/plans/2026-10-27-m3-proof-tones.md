# M3 · 校对歌词 + 声调字轮换 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 播放页「⋯」菜单里加「校对歌词」页面（整首挪时间、单句微调、改错字、边听边对准、保存）；首页六个声调键帽每天自动换一组，也能手动「换一组」。

**Architecture:** 时间轴怎么改（整首挪、单句挪、删掉某句的手动读音）写成纯函数放进新文件 `proof.js`（全局 `PROOF`），用 Node 测；"今天是哪天"（凌晨 4 点换日）加到 `srs.js`；8 组声调字和"今天用哪组"放进新文件 `lessons.js`（全局 `LESSONS`，以后入门课也放这里）。校对页是新的第三层页面 `proofView`，导航从"两层"改成按层级 push：首页(0) → 播放页(1) → 校对页(2)。

**Tech Stack:** 原生 JS；`node --test`；`node tests/browser/run.js`（本机 Chrome 无界面）。

**Spec:** `docs/第二三阶段开发规格.md` v2 第 3.4 节（meta.tones、凌晨 4 点）、7.1、7.2、第 9 节 M3；`docs/设计规范.md`；截图 `docs/design/learn-line-done-edit.png` 最右边「校对歌词」。

## Global Constraints

- 组件只用 CSS 变量；按钮按设计规范 5.1 分类（保存 = `.btn.primary`，「试听这句」= `.btn.soft`，「对准现在的歌声」= `.btn.primary`，±按钮 = `.btn.soft`）；按钮 ≥ 44px；输入框 16px
- 时间显示用 `--font-latin` + `tabular-nums`
- 不用 `alert()` / `confirm()`；未保存提示用底部弹层，两个按钮「保存」「不保存」
- "今天"按本地时间凌晨 4 点换日
- 声调字 8 组照抄规格 7.2 表格，**读音不要改**
- 新文件加进 `sw.js` 的 `SHELL`，`VERSION` 改成 `"v4"`
- 不改数据库结构；校对只改 `song.lines`、`song.overrides`、`song.updated`
- 右滑返回只用系统的（M2 验收结论），不要加回 App 自己的右滑
- 提交前 `git diff --cached --name-status` 核对文件；测试数据只用编的句子；不提交 mp3、lrc、歌词
- 分支 `m3-proof`，按任务提交，最后 squash 合并到 `main`，一条中文 commit

## 计划里替开发者定的事（执行前请确认）

1. **有改动没保存就返回**：点返回按钮时弹出「有改动还没保存」（保存 / 不保存）。用系统右滑返回时，系统动画没法拦住：画面会先滑回去，再自动回到校对页并弹出同样的提示
2. **保存后回到播放页**（不是首页）。所以页面从"两层"变成"三层"：首页 → 播放页 → 校对页；从校对页返回回到播放页
3. **时间不能乱序**：一句的开始时间不能早于上一句开始后 0.1 秒，也不能晚于下一句开始前 0.1 秒，超出就停在边界上。整首往前挪时，如果第一句会早于 0 秒，就不挪并提示「已经到最前面了」
4. **校对页的时间精确到 0.1 秒**，显示成「0:42.1」；整体偏移显示成「+0.4s」「−0.2s」「0.0s」
5. **「换一组」之后**，第二天从你选的那组的下一组接着换
6. **没有音频的歌**：「试听这句」「对准现在的歌声」和底部播放按钮点了提示「先加上音频」
7. **改了文字的那一句**，它原来手动改过的读音清掉（规格 7.1），其他句子的手动读音保留

## Review Focus

1. **改了没保存就用系统右滑返回**：改动不能丢，要回到校对页并弹出保存提示。由 Task 4 的 `swipe-back-dirty-prompts` 覆盖
2. **清掉第 1 句的手动读音时误删第 11、12 句的**（`"1:"` 前缀陷阱）。由 Task 2 的 `clearLineOverrides 不误删 11:0` 覆盖
3. **单句一直往前/往后挪、整首一直往前挪**：顺序不能乱、不能出现负数时间。由 Task 2 的 clamp 测试和 `shiftAll 早于 0 → null` 覆盖
4. **凌晨 0–4 点打开 App**：声调字不换组（还算前一天）；跨月份时日期字符串正确。由 Task 1 的 `today` 测试覆盖
5. **离开校对页时歌还在放**：返回播放页或首页都要停。由 Task 5 的 `leave-pauses` 覆盖

---

## 文件结构

| 文件 | 负责什么 |
|---|---|
| `srs.js`（修改） | 加 `SRS.today(now)`：凌晨 4 点换日的日期字符串 |
| `lessons.js`（新建） | `LESSONS.TONE_SETS`（8 组声调字）和 `LESSONS.toneSetFor(rec, today)` |
| `proof.js`（新建） | `PROOF.shiftAll`、`PROOF.setStart`、`PROOF.clearLineOverrides`、`PROOF.fmtT`、`PROOF.fmtOffset` |
| `tests/today-tones.test.js`、`tests/proof.test.js`（新建） | `node --test` |
| `index.html`（修改） | 首页声调区；`proofView` 页面；导航层级；菜单入口 |
| `sw.js`（修改） | `SHELL` 加 `./lessons.js`、`./proof.js`；`VERSION = "v4"` |
| `tests/browser/fixtures.js`（修改） | `t1` 的音频换成能真正播放的 50 秒静音 wav |
| `tests/browser/tones.scenario.js`、`proof.scenario.js`（新建） | 页面检查 |
| `CLAUDE.md`（修改） | 技术约定、进度 |

---

### Task 0：准备分支

- [ ] 提交本计划到 `main`（核对只有这一个文件），推送，`git switch -c m3-proof`

---

### Task 1：今天的日期 + 声调字数据和轮换规则

**Files:**
- Modify: `srs.js`
- Create: `lessons.js`、`tests/today-tones.test.js`
- Modify: `sw.js`（`SHELL` 加 `./lessons.js`，`VERSION = "v4"`）

**Interfaces:**
- Produces:
  - `SRS.today(now: number) -> "YYYY-MM-DD"`：`now - 4 小时` 的本地日期，月、日补零
  - `LESSONS.TONE_SETS: Array<{ syl: string, chars: string[6] }>`，顺序和规格 7.2 表格一致：si、fu、fan、ji、jau、wai、jan、seoi；第 k 个字的粤拼是 `syl + (k + 1)`
  - `LESSONS.toneSetFor(rec: any, today: string) -> { key: "tones", setIndex: number, date: string }`：`rec` 不是对象或 `setIndex` 不是 0–7 的整数 → `{ setIndex: 0, date: today }`；`rec.date === today` → 原样（复制一份）；否则 `setIndex = (rec.setIndex + 1) % 8`，`date = today`
  - `lessons.js` 外壳和 `srs.js` 一样（浏览器全局 `LESSONS`，Node 下 `module.exports`）

- [ ] **Step 1：写测试** `tests/today-tones.test.js`

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const SRS = require("../srs.js");
const L = require("../lessons.js");
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
test("today：凌晨 4 点前算前一天", () => {
  assert.equal(SRS.today(at(2026, 10, 27, 3, 59)), "2026-10-26");
  assert.equal(SRS.today(at(2026, 10, 27, 4, 0)), "2026-10-27");
});
test("today：跨月、补零", () => {
  assert.equal(SRS.today(at(2026, 11, 1, 1)), "2026-10-31");
  assert.equal(SRS.today(at(2026, 3, 5, 12)), "2026-03-05");
});
test("TONE_SETS：8 组，顺序和内容照抄规格", () => {
  assert.deepEqual(L.TONE_SETS.map(s => s.syl), ["si", "fu", "fan", "ji", "jau", "wai", "jan", "seoi"]);
  assert.deepEqual(L.TONE_SETS[0].chars, ["詩", "史", "試", "時", "市", "事"]);
  assert.deepEqual(L.TONE_SETS[4].chars, ["優", "柚", "幼", "油", "友", "又"]);
  assert.deepEqual(L.TONE_SETS[7].chars, ["雖", "水", "歲", "誰", "緒", "睡"]);
});
test("toneSetFor：没有记录 → 第 0 组", () => {
  assert.deepEqual(L.toneSetFor(undefined, "2026-10-27"), { key: "tones", setIndex: 0, date: "2026-10-27" });
  assert.deepEqual(L.toneSetFor({ key: "tones", setIndex: "x" }, "2026-10-27").setIndex, 0);
  assert.deepEqual(L.toneSetFor({ key: "tones", setIndex: 9, date: "2026-10-26" }, "2026-10-27").setIndex, 0);
});
test("toneSetFor：同一天不变，新的一天 +1，7 之后回到 0", () => {
  assert.equal(L.toneSetFor({ key: "tones", setIndex: 3, date: "2026-10-27" }, "2026-10-27").setIndex, 3);
  assert.deepEqual(L.toneSetFor({ key: "tones", setIndex: 3, date: "2026-10-26" }, "2026-10-27"), { key: "tones", setIndex: 4, date: "2026-10-27" });
  assert.equal(L.toneSetFor({ key: "tones", setIndex: 7, date: "2026-10-26" }, "2026-10-27").setIndex, 0);
});
```

- [ ] **Step 2：** `node --test` → Expected：新测试 FAIL（找不到 `../lessons.js`），其他 21 个 pass
- [ ] **Step 3：实现** `SRS.today`（复用 `srs.js` 里已有的 4 小时偏移写法）、`lessons.js`；改 `sw.js`；`index.html` 在 `srs.js` 后面加 `<script src="lessons.js"></script>`
- [ ] **Step 4：** `node --test` → 26 pass；`node tests/browser/run.js assets` → 全部 PASS（`sw-shell-files-exist` 会检查 `lessons.js`）
- [ ] **Step 5：提交**

```bash
git add srs.js lessons.js sw.js index.html tests/today-tones.test.js
git commit -m "feat: 今天的日期（凌晨 4 点换日）、8 组声调字和轮换规则"
```

---

### Task 2：校对歌词的时间计算（纯函数）

**Files:**
- Create: `proof.js`、`tests/proof.test.js`
- Modify: `sw.js`（`SHELL` 加 `./proof.js`，`VERSION` 保持 `"v4"`）、`index.html`（`lessons.js` 后面加 `<script src="proof.js"></script>`）

**Interfaces:**
- Produces（全局 `PROOF`，外壳同 `srs.js`；所有函数都**不修改传入的对象**，时间统一四舍五入到 0.01 秒）：
  - `PROOF.shiftAll(lines, d) -> lines | null`：每句 `t`、`end` 都加 `d`；如果 `lines[0].t + d < 0` 返回 `null`
  - `PROOF.setStart(lines, i, t) -> lines`：把第 i 句开始时间设为 `t`，先夹在 `[lo, hi]` 里：`lo = i > 0 ? lines[i-1].t + 0.1 : 0`，`hi = i < n-1 ? lines[i+1].t - 0.1 : Infinity`。然后上一句的 `end` 设成新的 `t`；如果这句自己的 `end <= t`，设成 `i < n-1 ? lines[i+1].t : t + 3`
  - `PROOF.clearLineOverrides(overrides, i) -> overrides`：去掉键 `"<i>:<字序号>"`，其他保留（`"1:"` 不能匹配 `"11:0"`）
  - `PROOF.fmtT(t) -> "m:ss.d"`（如 `51.34 → "0:51.3"`，`62.06 → "1:02.1"`）
  - `PROOF.fmtOffset(d) -> "+0.4s" | "−0.2s" | "0.0s"`（负号用 `−` U+2212，一位小数）

- [ ] **Step 1：写测试** `tests/proof.test.js`

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../proof.js");
const L = () => [{ t: 1, end: 4, text: "一" }, { t: 4, end: 8, text: "二" }, { t: 8, end: 12, text: "三" }];
test("shiftAll +0.4", () => {
  assert.deepEqual(P.shiftAll(L(), 0.4).map(l => [l.t, l.end]), [[1.4, 4.4], [4.4, 8.4], [8.4, 12.4]]);
});
test("shiftAll 连挪三次 0.2 没有小数误差", () => {
  let x = L(); for (let k = 0; k < 3; k++) x = P.shiftAll(x, 0.2);
  assert.equal(x[0].t, 1.6);
});
test("shiftAll 早于 0 → null", () => { assert.equal(P.shiftAll(L(), -1.2), null); });
test("shiftAll 不修改传入的", () => { const a = L(); P.shiftAll(a, 1); assert.equal(a[0].t, 1); });
test("setStart：改开始时间，上一句 end 跟着变", () => {
  const x = P.setStart(L(), 1, 4.5);
  assert.equal(x[1].t, 4.5); assert.equal(x[0].end, 4.5); assert.equal(x[1].end, 8);
});
test("setStart：不能早于上一句开始 + 0.1", () => { assert.equal(P.setStart(L(), 1, 0.5)[1].t, 1.1); });
test("setStart：不能晚于下一句开始 − 0.1", () => { assert.equal(P.setStart(L(), 1, 9)[1].t, 7.9); });
test("setStart：第一句不能早于 0", () => { assert.equal(P.setStart(L(), 0, -2)[0].t, 0); });
test("setStart：最后一句挪过自己的 end → end = t + 3", () => {
  const x = P.setStart(L(), 2, 20); assert.equal(x[2].t, 20); assert.equal(x[2].end, 23);
});
test("setStart 不修改传入的", () => { const a = L(); P.setStart(a, 1, 5); assert.equal(a[1].t, 4); assert.equal(a[0].end, 4); });
test("clearLineOverrides 不误删 11:0", () => {
  assert.deepEqual(P.clearLineOverrides({ "1:0": "a", "1:3": "b", "2:0": "c", "11:0": "d" }, 1), { "2:0": "c", "11:0": "d" });
});
test("fmtT", () => { assert.equal(P.fmtT(51.34), "0:51.3"); assert.equal(P.fmtT(62.06), "1:02.1"); });
test("fmtOffset", () => { assert.equal(P.fmtOffset(0.4), "+0.4s"); assert.equal(P.fmtOffset(-0.2), "−0.2s"); assert.equal(P.fmtOffset(0), "0.0s"); });
```

- [ ] **Step 2：** `node --test` → 新的 13 个 FAIL
- [ ] **Step 3：实现 `proof.js`**，改 `sw.js`、`index.html`
- [ ] **Step 4：** `node --test` → 39 pass；`node tests/browser/run.js assets` PASS
- [ ] **Step 5：提交**

```bash
git add proof.js sw.js index.html tests/proof.test.js
git commit -m "feat: proof.js 校对歌词的时间计算（整首挪、单句调整、清读音）"
```

---

### Task 3：首页声调字每天换一组 + 「换一组」

**Files:**
- Modify: `index.html`：首页声调区 HTML（约第 265 行）、`TONES` 渲染（约第 443–445 行）、`renderHome()`、键帽动画 CSS
- Create: `tests/browser/tones.scenario.js`

**Interfaces:**
- Consumes: `SRS.today`、`LESSONS.TONE_SETS`、`LESSONS.toneSetFor`（Task 1）；`metaRecs`、`DB.put(rec, "meta")`
- Produces: `renderTones(animate: boolean)`：按 `metaRecs.get("tones")` 画键帽和标题

改法：
- 标题行改成「六个声调 · <音节>」+ 右边「换一组」按钮（`.btn.soft.small`，刷新图标 + 文字，`id="btnToneNext"`）
- 去掉写死的 `TONES`；`renderHome()` 开头：`const rec = LESSONS.toneSetFor(metaRecs.get("tones"), SRS.today(Date.now()))`，和原来不同（或没有）就 `DB.put(rec, "meta")`、`metaRecs.set("tones", rec)`；然后 `renderTones(false)`
- 「换一组」：`setIndex = (setIndex + 1) % 8`，`date = 今天`，存 meta，`renderTones(true)`
- 键帽 `aria-label` 和 `data-say` 用当前组的字；名称用 `TONE_NAMES`
- 换组动画（设计规范 5.2）：六个键帽依次淡出淡入，第 k 个延迟 `k * 30ms`，用 `--dur`；减弱动态时直接换

- [ ] **Step 1：写 `tones.scenario.js`**，检查项：
  - `first-day-si`：新用户首页标题含「六个声调 · si」，第一个键帽是「詩 si1」；数据库 meta `tones` 为 `{setIndex: 0, date: 今天}`
  - `next-set-button`：点 `#btnToneNext` → 标题「六个声调 · fu」，键帽依次「夫 苦 富 扶 婦 父」，粤拼 fu1…fu6；数据库 `setIndex` 为 1
  - `remembered-after-reload`：重新打开页面仍是 fu
  - `next-day`：把数据库里 `tones.date` 改成昨天（`SRS.today(Date.now() - 86400000)`）后重新打开 → 变成 fan（setIndex 2）
  - `wraps`：连点 8 次「换一组」回到同一组
  - `keycap-still-speaks`：键帽 `data-say` 等于当前组的字
  - `button-44px`：`#btnToneNext` 高度 ≥ 44
  - 截图 `tones-light`
- [ ] **Step 2：** `node tests/browser/run.js tones` → FAIL
- [ ] **Step 3：实现**
- [ ] **Step 4：** `node tests/browser/run.js` 全部 PASS（`home` 里的 keycaps 检查仍要求新用户是 si）
- [ ] **Step 5：提交**

```bash
git add index.html tests/browser/tones.scenario.js
git commit -m "feat: 首页声调字每天换一组，可以手动换一组"
```

---

### Task 4：校对歌词页面 + 三层导航 + 保存 / 未保存提示

**Files:**
- Modify: `index.html`：新增 `<section id="proofView" hidden>`；`views` 加 `"proofView"`；`go()` / `popstate`；「⋯」菜单加「校对歌词」；校对页 CSS
- Modify: `tests/browser/fixtures.js`：`T1` 的音频改成 `silentWav(50)` 生成的能播放的 wav（`SEED_V1` 里生成），`m1.scenario.js` 里"音频还在"的判断从 `size === 1000` 改成 `size > 1000`
- Create: `tests/browser/proof.scenario.js`

**Interfaces:**
- Consumes: `PROOF.*`（Task 2）
- Produces（Task 5 用）：
  - 全局 `proof = { song, lines, texts, offset, open, dirty }`：`lines` 是草稿（`t/end/text` 的深拷贝），`offset` 是累计整体偏移，`open` 是展开的那句下标或 `-1`
  - `openProof()`：用 `cur` 建草稿，`go("proofView", {songId})`
  - `renderProof()`：重画列表
  - 导航层级 `DEPTH = { home: 0, importView: 1, syncView: 1, playerView: 1, proofView: 2 }`：`go()` 在新页层级更深时 `pushState`，否则 `replaceState`

页面（对照截图最右边那屏）：
- 顶部栏：返回（`data-back`）、标题「校对歌词」、右边「保存」`id="proofSave"`（`.btn.primary.small`）
- 第一张卡片：左边「整首歌一起挪」+ 小字「歌词整体比歌声早或晚时用」；右边「−」`id="shiftMinus"`、偏移 `id="shiftVal"`（`PROOF.fmtOffset`）、「+」`id="shiftPlus"`。每次 ±0.2 秒，用 `PROOF.shiftAll`；返回 `null` 时 `toast("已经到最前面了")`
- 每句一张卡片 `.pl`（`data-i`）：左边时间（`PROOF.fmtT`），右边文字；点卡片展开（同时只展开一句，再点收起）。展开的卡片有 `0 0 0 2px var(--accent)` 描边，里面：小字「歌词文字（点一下就能改错字）」、文字输入框 `.pl-text`（16px）、四个按钮 `data-nudge="-0.5|-0.1|0.1|0.5"`（`.btn.soft.small`，Outfit）、「▶ 试听这句」`data-audition`（`.btn.soft`）、「对准现在的歌声」`data-mark`（`.btn.primary`）
- 任何改动都设 `proof.dirty = true`
- 保存：对每句，文字和原来不同就 `cur.overrides = PROOF.clearLineOverrides(cur.overrides, i)`；`cur.lines = 草稿`（`text` 去掉首尾空格，空文字不允许：`toast("歌词不能为空")` 并停止保存）；`cur.updated = Date.now()`；`DB.put(cur)`；`proof.dirty = false`；`toast("已保存")`；`goBack()`
- 返回按钮在 `proof.dirty` 时不直接返回，而是弹层「有改动还没保存」+「保存」(`.btn.primary.block`) +「不保存」(`.btn.block`)；不保存 → `proof.dirty = false; goBack()`
- `popstate` 离开校对页时如果 `proof.dirty`：`history.pushState({view: "proofView", songId}, "")` 留在校对页，弹出同样的提示（计划决定 1）
- 从校对页返回到播放页：`popstate` 的 `playerView` 分支调用 `openSong(id, {restore: true, anim: "back"})`，`openSong` 把 `anim` 传给 `show()`；回到播放页后歌词按新时间和新文字重画

- [ ] **Step 1：写 `proof.scenario.js`**（用 `t1`），检查项：
  - `menu-entry`：「⋯」菜单里有「校对歌词」，点了打开 `#proofView`，`history.state.view === "proofView"`
  - `list`：有 16 张 `.pl`，第一张时间是「0:01.0」，文字「我穿風褸出去」
  - `shift-all`：点 `#shiftPlus` 两次 → `#shiftVal` 为「+0.4s」，第一句时间「0:01.4」；还没保存时数据库里 `lines[0].t` 仍是 1
  - `shift-floor`：点 `#shiftMinus` 8 次 → 第一句不早于 0，出现提示「已经到最前面了」
  - `expand-one`：点第 3 句展开，再点第 5 句 → 只有第 5 句展开
  - `nudge`：第 5 句点 `+0.5` → 时间加 0.5，上一句 `end` 跟着变（保存后在数据库里检查）
  - `unsaved-back-prompts`：有改动时点返回 → 仍在校对页，弹层有「有改动还没保存」「保存」「不保存」；点「不保存」→ 回到播放页，数据库没变
  - `swipe-back-dirty-prompts`：有改动时调用 `History.prototype.back.call(history)`（模拟系统右滑）→ 等 700ms，`#proofView` 可见，弹出提示
  - `save-shift`：整体 +0.4 后点保存 → 回到播放页（不是首页），数据库 `lines[0].t === 1.4`、`lines[0].end === 4.4`；播放页第 0 句时间显示「0:01」
  - `edit-text`：把第 1 句（有手动读音 `1:0 → dai2`）改成「第三句測試」并保存 → 播放页第 1 句文字更新；数据库里 `overrides["1:0"]` 不存在，其他句的手动读音还在；第 1 句第 0 个字的粤拼是自动的 `dai6`
  - `empty-text-blocked`：把一句清空后保存 → 提示「歌词不能为空」，还在校对页
  - `inputs-16px`、`buttons-44px`（用 `base.scenario.js` 的 `SMALL_BTNS`）
  - 截图 `proof-light`、`proof-dark`，和设计图对比
- [ ] **Step 2：** `node tests/browser/run.js proof` → FAIL
- [ ] **Step 3：实现**
- [ ] **Step 4：** `node tests/browser/run.js` 全部 PASS（`nav` 的 `chain-replace` 仍要通过：导入页和打轴页同层级用 `replaceState`）
- [ ] **Step 5：提交**

```bash
git add index.html tests/browser/fixtures.js tests/browser/m1.scenario.js tests/browser/proof.scenario.js
git commit -m "feat: 校对歌词页面（整首挪、单句微调、改错字、保存和未保存提示），页面导航改为三层"
```

---

### Task 5：校对页的试听、对准现在的歌声、底部播放条

**Files:**
- Modify: `index.html`：`proofView` 底部播放条、`tick()`、试听/对准的点击处理
- Modify: `tests/browser/proof.scenario.js`（追加）

**Interfaces:**
- Consumes: `proof`、`renderProof()`（Task 4）；`PROOF.setStart`；`au`、`setAudio`

改法：
- 校对页底部浮动播放条（复用 `.player` 样式）：播放/暂停 `id="prPlay"`、进度 `id="prSeek"`、当前时间/总时长（Outfit）。进校对页时 `setAudio(cur.audio)` 不变（和播放页同一个 `au`），`au.pause()`
- `tick()`：校对页可见时更新 `prSeek` 和时间；有 `proof.stopAt` 时 `au.currentTime >= proof.stopAt` 就暂停并清掉 `stopAt`
- 「▶ 试听这句」：`au.currentTime = 草稿[i].t`，`proof.stopAt = 下一句的 t`（最后一句用 `end`），播放
- 「对准现在的歌声」：`草稿 = PROOF.setStart(草稿, i, au.currentTime - 0.15)`，`dirty = true`，重画，`toast("已对准：" + PROOF.fmtT(新的 t))`
- 没有音频（`!cur.audio`）时这三个按钮 `toast("先加上音频")`
- 离开校对页（返回到播放页或首页）时 `au.pause()`、清掉 `stopAt`

- [ ] **Step 1：追加检查项**（`t1` 现在有 50 秒能播放的静音音频）：
  - `audition-stops`：第 2 句点「试听这句」→ 播放中；等到超过第 3 句开始 + 0.5 秒（约 4 秒）→ `au.paused === true`，`au.currentTime` 在第 3 句开始附近（±0.3 秒）
  - `mark-now`：`au.currentTime = 20.3` 并播放，展开第 4 句点「对准现在的歌声」→ 第 4 句时间在 20.15 附近（±0.1；会被夹在第 3、5 句之间的话用夹好的值）
  - `bottom-bar`：`#prPlay` 点了能播放/暂停；`#prSeek` 跟着走
  - `leave-pauses`：播放中点返回（没改动的情况）→ 回到播放页，`au.paused === true`
  - `no-audio`：`t2`（没有音频）打开校对页，点「试听这句」→ 提示「先加上音频」，没有报错
- [ ] **Step 2：** `node tests/browser/run.js proof` → 新检查 FAIL
- [ ] **Step 3：实现**
- [ ] **Step 4：** `node tests/browser/run.js` 全部 PASS；`node --test` 39 pass
- [ ] **Step 5：提交**

```bash
git add index.html tests/browser/proof.scenario.js
git commit -m "feat: 校对页试听这句、对准现在的歌声、底部播放条"
```

---

### Task 6：文档、合并、发布、交给开发者验收

- [ ] **Step 1：更新 `CLAUDE.md`**：技术约定加 `lessons.js`（`LESSONS.TONE_SETS`、`toneSetFor`）、`proof.js`（`PROOF.*`）、`SRS.today`；页面导航改成"三层：首页 → 播放页 → 校对页，按层级 push"；当前进度加"M3 完成"；下一步改成 M4
- [ ] **Step 2：** `node --test` 39 pass；`node tests/browser/run.js` 全部 PASS
- [ ] **Step 3：最终审查后** squash 合并到 `main`，核对文件列表，推送，删分支
- [ ] **Step 4：确认上线**：`lessons.js`、`proof.js` 返回 200，线上 `sw.js` 是 `v4`
- [ ] **Step 5：交给开发者在 iPhone 上验收**（规格第 9 节 M3）：
  1. 完全关掉主屏幕 App 再打开
  2. 打开《富士山下》→「⋯」→「校对歌词」，整体 +0.4 秒，保存，回到播放页播放，高亮跟着歌声走
  3. 改一个错字，保存后歌词页显示正确，读音也更新了
  4. 边听边点「对准现在的歌声」能对齐一句
  5. 改了东西不保存就返回（点按钮、右滑各试一次），会提示保存
  6. 首页「换一组」能换声调字；第二天（早上 4 点以后）打开自动换了一组
