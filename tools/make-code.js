#!/usr/bin/env node
/* 生成兑换码（开发者在电脑上运行）：
     node tools/make-code.js skin:night "给朋友A"
     node tools/make-code.js skin:* "全部皮肤"
     node tools/make-code.js dev "开发者模式"
   多个奖励用逗号隔开：skin:night,skin:mist
   兑换码原文只在终端里显示一次，文件里只存哈希。原文请自己记下来（比如存进手机备忘录），丢了只能重新生成。 */
"use strict";
const fs = require("fs"), path = require("path");
const REDEEM = require("../skins/redeem.js");
const SKIN_IDS = require("../skins/registry.js");
const FILE = process.env.CODES_FILE || path.join(__dirname, "../skins/codes.js");
const MARK = "    // ↑ 新的兑换码由 tools/make-code.js 加在这一行上面";

(async () => {
  const [rewardArg, note = ""] = process.argv.slice(2);
  if (!rewardArg) { console.error('用法：node tools/make-code.js skin:night "备注"'); process.exit(1); }
  const rewards = rewardArg.split(",").map(s => s.trim()).filter(Boolean);
  for (const r of rewards) if (!(r === "dev" || r === "skin:*" || (r.startsWith("skin:") && SKIN_IDS.includes(r.slice(5))))) {
    console.error(`不认识的奖励：${r}（可以用 dev、skin:*、skin:${SKIN_IDS.join("、skin:")}）`); process.exit(1);
  }
  const text = fs.readFileSync(FILE, "utf8");
  if (!text.includes(MARK)) { console.error("codes.js 里找不到插入位置"); process.exit(1); }
  const code = REDEEM.generate();
  const hash = await REDEEM.sha256(REDEEM.normalize(code));
  const line = `    { hash: ${JSON.stringify(hash)}, rewards: ${JSON.stringify(rewards)}, note: ${JSON.stringify(note)} },\n`;
  fs.writeFileSync(FILE, text.replace(MARK, line + MARK));
  console.log(`兑换码（只显示这一次，请自己记下来）：${code}`);
  console.log(`奖励：${rewards.join("、")}　备注：${note}`);
  console.log(`已经把哈希加进 ${path.relative(process.cwd(), FILE)}`);
})();
