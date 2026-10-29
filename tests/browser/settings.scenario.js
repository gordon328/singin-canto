// 设置页（M3.11）：首页右上角齿轮 → 整页滑入；每天新学几句（先只显示）+ 备份与恢复（不再用弹窗）
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;
module.exports = { name: "settings", async run(b) {
  await F.seed(b);
  b.check("no-backup-button", !(await b.ev(`!!document.querySelector("#btnBackup")`)));
  b.check("gear-button", await b.ev(visible("#btnSettings")) && (await b.ev(`document.querySelector("#btnSettings").getAttribute("aria-label")`)) === "设置");

  const h0 = await b.ev("history.length");
  await b.ev(click("#btnSettings")); await b.sleep(300);
  b.check("slides-in", await b.ev(`document.querySelector("#settingsView").classList.contains("enter-fwd")`));
  await b.sleep(700);
  b.check("settings-page", await b.ev(visible("#settingsView")) && !(await b.ev(visible("#home"))) && (await b.ev("history.length")) === h0 + 1
    && (await b.ev(`history.state.view`)) === "settingsView" && await b.ev(`document.querySelector("#sheet").hidden`));
  const txt = await b.ev(`document.querySelector("#settingsView").innerText`);
  b.check("goal-section", txt.includes("每天新学几句") && (await b.ev(`[...document.querySelectorAll("#goalSeg button")].map(e => e.innerText.trim()).join()`)) === "2,4,6,自定义"
    && (await b.ev(`document.querySelector("#goalSeg [aria-pressed=true]").innerText.trim()`)) === "4");
  b.check("goal-note", txt.includes("每天按歌词顺序新学几句"));
  b.check("backup-section", txt.includes("备份与恢复") && txt.includes("2 首歌") && txt.includes("导出备份文件") && txt.includes("从文件恢复")
    && !txt.includes("复制备份") && await b.ev(`!document.querySelector("#settingsView textarea") && document.querySelector("#bkFile").type === "file"`));
  b.check("never-backed-up", (await b.ev(`document.querySelector("#bkAge").innerText`)) === "还没有备份过" && await b.ev(`document.querySelector("#bkAge").classList.contains("stale")`));
  b.check("settings-44px", await b.ev(`[...document.querySelectorAll("#settingsView .btn")].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)`));
  await b.shot("settings-light");

  // 导出：关掉分享面板不算备份；分享成功后「上次备份：今天」
  await b.ev(`(async () => { navigator.canShare = () => true; navigator.share = async () => { throw new DOMException("x", "AbortError"); };
    document.querySelector("#bkExport").click(); await new Promise(r => setTimeout(r, 300)); })()`);
  b.check("share-cancel-not-counted", (await b.ev(`document.querySelector("#bkAge").innerText`)) === "还没有备份过" && !(await b.ev(F.idbGet("meta", "backup"))));
  const text = await b.ev(F.exportText);
  const pad = n => String(n).padStart(2, "0"), d = new Date();
  const fname = `唱学粤语备份-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  b.check("export-file", (await b.ev(`window.__bkFile.name`)) === fname && (await b.ev(`window.__bkFile.type`)) === "application/json"
    && JSON.parse(text).songs.length === 2 && !JSON.parse(text).meta.some(m => m.key === "backup"));
  b.check("last-backup-today", (await b.ev(`document.querySelector("#bkAge").innerText`)) === "上次备份：今天" && !(await b.ev(`document.querySelector("#bkAge").classList.contains("stale")`))
    && (await b.ev(F.idbGet("meta", "backup")))?.at > 0);
  // 不支持分享文件：直接下载
  const dl = await b.ev(`(async () => { let name = null; navigator.canShare = undefined; const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { name = this.download; }; document.querySelector("#bkExport").click();
    await new Promise(r => setTimeout(r, 300)); HTMLAnchorElement.prototype.click = orig; return name; })()`);
  b.check("export-download-fallback", dl === fname);
  // 超过 7 天用提醒颜色
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
    db.transaction("meta", "readwrite").objectStore("meta").put({ key: "backup", at: Date.now() - 10 * 86400000 }).onsuccess = () => { db.close(); res(); }; }; })`);
  await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("stale-10-days", (await b.ev(`document.querySelector("#bkAge").innerText`)) === "上次备份：10 天前" && await b.ev(`document.querySelector("#bkAge").classList.contains("stale")`));
  await b.shot("settings-stale");

  // 恢复：格式不对给原因，不弹确认
  b.check("restore-bad-json", (await b.ev(F.restoreText('{"app":"yuechang","songs":['))).includes("不是备份格式") && await b.ev(`document.querySelector("#sheet").hidden`));
  b.check("restore-other-json", (await b.ev(F.restoreText('{"name":"x"}'))).includes("不是唱学粤语的备份文件"));
  b.check("restore-empty", (await b.ev(F.restoreText(""))).includes("文件是空的"));
  // 先显示摘要，取消就不恢复
  const bk = JSON.parse(text); bk.songs.push({ ...bk.songs[1], id: "t9", title: "第三首" });
  await b.ev(`(() => { const inp = document.querySelector("#bkFile"), dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(JSON.stringify(bk))}], "b.json", { type: "application/json" }));
    inp.files = dt.files; inp.dispatchEvent(new Event("change")); })()`); await b.sleep(500);
  const sum = await b.ev(F.sheetText);
  b.check("restore-summary " + sum.replace(/\n/g, " "), sum.includes(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`) && sum.includes("3 首歌") && sum.includes("0 张卡片")
    && await b.ev(`document.querySelector('#sheetBody [data-confirm="ok"]').classList.contains("primary")`));
  await b.shot("restore-confirm");
  await b.ev(`document.querySelector('#sheetBody [data-confirm="cancel"]').click()`); await b.sleep(600);
  b.check("restore-cancel", !(await b.ev(F.idbGet("songs", "t9"))));
  b.check("restore-works", (await b.ev(F.restoreText(JSON.stringify(bk)))).includes("已恢复 3 首歌") && !!(await b.ev(F.idbGet("songs", "t9"))));

  // 没有音频的歌：首页和歌曲页提示去「编辑歌曲」
  await b.nav("/");
  const note = await b.ev(`document.querySelector("#homeNote").innerText`);
  b.check("home-no-audio-note " + note, note.includes("2 首歌没有音频") && note.includes("请在「编辑歌曲」里重新选择音频"));
  await F.openSong(b, "t9");
  b.check("player-no-audio-note", (await b.ev(`document.querySelector("#noAudio").innerText`)).includes("请在「编辑歌曲」里重新选择音频"));
  await b.ev(click("#noAudio [data-proof]")); await b.sleep(900);
  b.check("note-opens-edit", await b.ev(visible("#proofView")));
  await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800);

  // 每天新学几句：存到 meta.daily.goal；2/4/6/自定义（1–20）
  const goalDb = async () => (await b.ev(F.idbGet("meta", "daily")))?.goal;
  const pressed = `document.querySelector("#goalSeg [aria-pressed=true]").innerText.trim()`;
  const reopen = async () => { await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800); };
  await b.ev(click('#goalSeg [data-goal="2"]')); await b.sleep(300);
  b.check("goal-saved-meta", (await goalDb()) === 2 && !(await b.ev(visible("#goalStep"))));
  await reopen();
  b.check("goal-persists", (await b.ev(pressed)) === "2");
  const bk2 = JSON.parse(await b.ev(F.exportText));
  b.check("goal-in-backup", bk2.meta.some(m => m.key === "daily" && m.goal === 2));
  await b.ev(click('#goalSeg [data-goal="custom"]')); await b.sleep(300);
  b.check("custom-opens", await b.ev(visible("#goalStep")) && (await b.ev(`document.querySelector("#goalNum").innerText.trim()`)) === "2"
    && (await b.ev(pressed)) === "自定义" && (await goalDb()) === 2);
  for (let i = 0; i < 5; i++) await b.ev(click("#goalPlus"));
  await b.sleep(300);
  b.check("custom-step", (await b.ev(`document.querySelector("#goalNum").innerText.trim()`)) === "7" && (await goalDb()) === 7);
  await reopen();
  b.check("custom-persists", (await b.ev(pressed)) === "自定义" && await b.ev(visible("#goalStep")) && (await b.ev(`document.querySelector("#goalNum").innerText.trim()`)) === "7");
  for (let i = 0; i < 8; i++) await b.ev(click("#goalMinus"));
  await b.sleep(300);
  b.check("custom-min", (await b.ev(`document.querySelector("#goalNum").innerText.trim()`)) === "1" && await b.ev(`document.querySelector("#goalMinus").disabled`)
    && !(await b.ev(`document.querySelector("#goalPlus").disabled`)) && (await goalDb()) === 1);
  for (let i = 0; i < 25; i++) await b.ev(`document.querySelector("#goalPlus").disabled || document.querySelector("#goalPlus").click()`);
  await b.sleep(300);
  b.check("custom-max", (await b.ev(`document.querySelector("#goalNum").innerText.trim()`)) === "20" && await b.ev(`document.querySelector("#goalPlus").disabled`)
    && !(await b.ev(`document.querySelector("#goalMinus").disabled`)) && (await goalDb()) === 20);
  b.check("custom-44px", await b.ev(`["#goalMinus", "#goalPlus"].every(s => document.querySelector(s).getBoundingClientRect().height >= 44)`));
  await b.shot("settings-custom");
  await b.ev(click('#goalSeg [data-goal="4"]')); await b.sleep(300);
  b.check("preset-closes", !(await b.ev(visible("#goalStep"))) && (await goalDb()) === 4 && (await b.ev(pressed)) === "4");

  // 返回按钮回首页；系统右滑（history.back）也回首页
  await b.ev(click("#settingsView [data-back]")); await b.sleep(900);
  b.check("back-button-home", await b.ev(visible("#home")) && !(await b.ev(visible("#settingsView"))));
  await b.ev(click("#btnSettings")); await b.sleep(800);
  await b.ev("history.back()"); await b.sleep(800);
  b.check("swipe-back-home", await b.ev(visible("#home")) && !(await b.ev(visible("#settingsView"))));
  // 多选模式下齿轮隐藏
  await b.ev(click("#btnSelect")); await b.sleep(200);
  b.check("gear-hidden-in-select", !(await b.ev(visible("#btnSettings"))));
  await b.ev(click("#btnDone")); await b.sleep(200);
  b.check("settings: 页面没有报错", b.errors.length === 0);
} };
