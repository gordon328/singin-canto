# 以后怎么加新皮肤

> 来自 `docs/第二三阶段开发规格.md` 7.10.7。皮肤系统的完整规则（必填颜色、自动检查、解锁条件）见 7.10。现有三个皮肤的说明是 `lilac.md`、`night.md`、`mist.md`，可以照着填。


1. 复制 `docs/皮肤/新皮肤模板.md`，改名为 `<皮肤id>.md`，填好
2. 设计图放到 `docs/design/skins/<皮肤id>.png`
3. 对 Claude Code 说：「按 docs/皮肤/README.md 加新皮肤，资料在 docs/皮肤/<皮肤id>.md」

Claude Code 收到后要做的事（只做这些，不改其他文件）：
1. 根据模板生成 `skins/<id>.js`
2. 在 `skins/registry.js` 里加一行
3. 如果模板里缺了必填颜色（比如只给了浅色），按现有皮肤的明暗关系补全，并在对话里告诉开发者补了哪些、为什么
4. 跑全部测试（含 2.2 的颜色检查）。对比度不够时，先微调颜色再告诉开发者改了什么
5. 用 440×956 截图：首页、学词卡片、日历页、皮肤页，浅色和深色（如适用），发给开发者确认
6. 确认后上线

补充（2026-10-31）：
- 「在 `skins/registry.js` 里加一行」就是在 `SKIN_IDS` 里加上新皮肤的 id；`sw.js` 会按这个列表自动把皮肤文件放进离线缓存，不用改
- 代码模板是 `skins/_template.js`
- 现有皮肤的设计图是一张合起来的 `docs/design/skins-home.png`（五种配色的首页）和 `docs/design/skins-settings.png`（皮肤页和解锁弹窗）；新皮肤的设计图按上面第 2 步放到 `docs/design/skins/<皮肤id>.png`
