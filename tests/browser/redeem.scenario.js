// 兑换码（v0.35，开发规格 7.10.4）：设置 › 关于 › 兑换码，底部弹出输入框；成功弹「兑换成功」的解锁弹窗；失败按规格提示。
// 用的都是测试时临时加进去的码（TEST 开头），不是真的兑换码
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const sheet = `(() => { const s = document.querySelector("#sheet"); return s.hidden ? "" : document.querySelector("#sheetBody").innerText.replace(/\s+/g, " "); })()`;
const meta = k => F.idbGet("meta", k);
async function openRedeem(b) { await b.ev(click("#btnRedeem")); await b.sleep(500); }
async function redeem(b, code) {
  await b.ev(`(() => { const i = document.querySelector("#rdIn"); i.value = ${JSON.stringify(code)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev(click("#rdGo")); await b.sleep(900);
}
const msg = `document.querySelector("#rdMsg") ? document.querySelector("#rdMsg").innerText : ""`;

module.exports = { name: "redeem", async run(b) {
  await F.seed(b);
  await b.ev(F.addTestCode("TEST-NGHT-2345-ABCD", ["skin:night"]));
  await b.ev(F.addTestCode("TEST-ALLS-2345-ABCD", ["skin:*"]));
  await b.ev(F.addTestCode("TEST-NGT2-2345-ABCD", ["skin:night"]));
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("entry-in-about", (await b.ev(`[...document.querySelectorAll("#settingsView .sgrp .cell .cell-n")].map(e => e.innerText).join()`)).endsWith("版本记录,兑换码"));
  await openRedeem(b);
  const s0 = await b.ev(sheet);
  b.check("sheet " + s0, s0.includes("兑换码") && s0.includes("兑换") && await b.ev(visible("#rdIn")));
  b.check("input-16px", (await b.ev(`getComputedStyle(document.querySelector("#rdIn")).fontSize`)) === "16px");
  // 自动转大写（光标位置不乱）
  await b.ev(`(() => { const i = document.querySelector("#rdIn"); i.focus(); i.value = "test-nght"; i.setSelectionRange(9, 9); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  b.check("uppercase", (await b.ev(`document.querySelector("#rdIn").value`)) === "TEST-NGHT" && (await b.ev(`document.querySelector("#rdIn").selectionStart`)) === 9);
  b.check("44px", await b.ev(`[...document.querySelectorAll("#sheetBody .btn")].every(e => e.getBoundingClientRect().height >= 44)`));
  await b.shot("redeem-sheet");
  // 空的、无效
  await redeem(b, "  ");
  b.check("empty " + (await b.ev(msg)), (await b.ev(msg)) === "请输入兑换码");
  await redeem(b, "TEST-XXXX-0000-0000");
  b.check("invalid " + (await b.ev(msg)), (await b.ev(msg)) === "兑换码无效，请检查后重试" && (await b.ev(sheet)).includes("兑换"));
  // 成功：忽略空格、连字符、大小写；关掉输入框，弹「兑换成功」
  await redeem(b, "test nght-2345 abcd");
  const s1 = await b.ev(sheet);
  b.check("success-popup " + s1, s1.includes("兑换成功") && s1.includes("夜曲") && s1.includes("立即使用") && !(await b.ev(`!!document.querySelector("#rdIn")`)));
  await b.shot("redeem-success");
  const c = await b.ev(meta("checkin")), rd = await b.ev(meta("redeemed"));
  b.check("recorded", c.unlocked.includes("night") && c.unlockedInfo.night.by === "code" && rd && rd.list.length === 1 && /^[0-9a-f]{64}$/.test(rd.list[0].hash)
    && !JSON.stringify(rd).includes("NGHT"));
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(700);
  // 同一个码再兑换：已经用过了；另一个只给夜曲的码：已经拥有了
  await openRedeem(b); await redeem(b, "TEST-NGHT-2345-ABCD");
  b.check("used " + (await b.ev(msg)), (await b.ev(msg)) === "这个兑换码已经用过了");
  await redeem(b, "TEST-NGT2-2345-ABCD");
  b.check("owned " + (await b.ev(msg)), (await b.ev(msg)) === "这些皮肤你已经拥有了");
  // 全部皮肤：只弹还没有的（晨雾）
  await redeem(b, "TEST-ALLS-2345-ABCD");
  b.check("all-skins " + (await b.ev(sheet)), (await b.ev(sheet)).includes("兑换成功") && (await b.ev(sheet)).includes("晨雾"));
  await b.ev(click('#sheetBody [data-unlock="use"]')); await b.sleep(700);
  b.check("use-after-redeem", (await b.ev(`document.documentElement.dataset.skin`)) === "mist" && (await b.ev(sheet)) === "");
  // 兑换记录随备份导出；新设备恢复后还在，再兑换同一个码提示已经用过了
  const bk = JSON.parse(await b.ev(F.exportText));
  b.check("backup-has-redeemed", bk.meta.some(m => m.key === "redeemed" && m.list.length === 2));
  await b.nav("/__blank"); await b.ev(`(localStorage.clear(), ${F.WIPE})`); await F.seed(b);
  await b.ev(F.restoreText(JSON.stringify(bk))); await b.sleep(800);
  b.check("restored-redeemed", ((await b.ev(meta("redeemed"))) || {}).list?.length === 2);
  b.check("no-errors", b.errors.length === 0);
} };
