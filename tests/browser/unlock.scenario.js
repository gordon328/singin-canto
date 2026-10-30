// 皮肤解锁（v0.33）：用调试面板的模拟日期测「连续打卡 3 天解锁夜曲」；学完第一首歌解锁晨雾；同时解锁两个依次弹；备份里的解锁记录
// 测试歌 t1 有 16 句，每天从「只剩最后一句」开始学，所以第一天学完就是学会了第一首歌
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const meta = F.idbGet("meta", "checkin");
const sheet = `(() => { const s = document.querySelector("#sheet"); return s.hidden ? "" : document.querySelector("#sheetBody").innerText.replace(/\\s+/g, " "); })()`;
const plus = async b => { await b.ev(click("#simPlus")); await b.sleep(400); };
async function finishDay(b) {
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction(["songs", "cards"], "readwrite");
    tx.objectStore("cards").clear(); const st = tx.objectStore("songs");
    st.get("t1").onsuccess = e => { st.put(Object.assign(e.target.result, { progress: { learned: Array.from({ length: 15 }, (_, i) => i), current: true } })); };
    tx.oncomplete = () => { db.close(); res(); }; }; })`);
  await b.nav("/");
  await b.ev(click('#today [data-today="start"]')); await b.sleep(900);
  for (let i = 0; i < 25 && !(await b.ev(`!!document.querySelector("#stBody .st-done")`)); i++) {
    await b.ev(`(() => { const x = document.querySelector('#studyView [data-act="got"]') || document.querySelector('#studyView [data-act="lineok"]'); if (x) x.click(); })()`);
    await b.sleep(450);
  }
  await b.sleep(1800); // 打卡动画放完，解锁弹窗才出来
}
const heroBg = `getComputedStyle(document.querySelector("#sheetBody .skin-prev .p-hero")).backgroundColor`;

module.exports = { name: "unlock", async run(b) {
  await F.seed(b);
  await b.ev(`localStorage.setItem("yc-debug", "1")`); await b.nav("/");
  b.check("no-popup-at-start", (await b.ev(sheet)) === "");

  // 第 1 天：学完了第一首歌 → 晨雾；点「以后再说」
  await finishDay(b);
  let s = await b.ev(sheet);
  b.check("day1-mist " + s, s.includes("学会第一首歌") && s.includes("解锁新皮肤「晨雾」") && s.includes("立即使用") && s.includes("以后再说") && s.includes(require("../../skins/mist.js").intro));
  b.check("day1-after-checkin", await b.ev(`!!document.querySelector("#stBody .st-done .cal-day.is-today.fill")`));
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(500);
  let c = await b.ev(meta);
  b.check("later", (await b.ev(`document.documentElement.dataset.skin`)) === "lilac" && c.unlocked.includes("mist") && c.unlockedInfo.mist.by === "songs" && c.theme === "lilac" && (await b.ev(sheet)) === "");

  // 第 2 天：没有新解锁
  await b.ev(click('#studyView [data-act="home"]')); await b.sleep(900);
  await plus(b); await finishDay(b);
  b.check("day2-no-popup", (await b.ev(sheet)) === "");

  // 第 3 天：连续 3 天 → 夜曲
  await b.ev(click('#studyView [data-act="home"]')); await b.sleep(900);
  await plus(b); await finishDay(b);
  s = await b.ev(sheet);
  b.check("streak-3-unlocks-night " + s, s.includes("连续打卡 3 天达成") && s.includes("解锁新皮肤「夜曲」") && (await b.ev(heroBg)) === "rgb(244, 164, 98)");
  await b.shot("unlock-night");
  await b.ev(click('#sheetBody [data-unlock="use"]')); await b.sleep(500);
  c = await b.ev(meta);
  b.check("use-now", (await b.ev(`document.documentElement.dataset.skin`)) === "night" && c.unlocked.includes("night") && c.unlockedInfo.night.by === "streak"
    && /^\d{4}-\d{2}-\d{2}$/.test(c.unlockedInfo.night.at) && c.theme === "night" && (await b.ev(sheet)) === "");
  await b.shot("unlock-night-applied");

  // 同一天再进完成页、刷新：不再弹
  await b.nav("/"); await b.sleep(600);
  b.check("no-repeat-on-reload", (await b.ev(sheet)) === "");
  await finishDay(b);
  b.check("no-repeat-same-day", (await b.ev(sheet)) === "");

  // 备份带着解锁记录；新设备（还没打过卡）恢复：直接用备份里的打卡记录，正在用的皮肤也换成备份里的
  await b.nav("/");
  await b.ev(click("#btnSettings")); await b.sleep(800);
  const bk = await b.ev(F.exportText);
  await b.nav("/__blank"); await b.ev(`(localStorage.clear(), ${F.WIPE})`); await F.seed(b);
  await b.ev(F.restoreText(bk)); await b.sleep(600);
  c = await b.ev(meta);
  b.check("backup-keeps-skins " + JSON.stringify([c.unlocked, c.theme, await b.ev(`document.documentElement.dataset.skin`)]), ["lilac", "mist", "night"].every(id => c.unlocked.includes(id)) && c.unlockedInfo.night.by === "streak" && c.theme === "night"
    && (await b.ev(`document.documentElement.dataset.skin`)) === "night");
  b.check("restore-no-popup-for-already-unlocked", (await b.ev(sheet)) === "");

  // 恢复一份「已经满足两个条件、但还没解锁」的备份：依次弹两个，同一时间只有一个
  const raw = JSON.parse(bk);
  const ci = raw.meta.find(m => m.key === "checkin");
  Object.assign(ci, { unlocked: ["lilac"], unlockedInfo: { lilac: { by: "default" } } });
  await b.nav("/__blank"); await b.ev(`(localStorage.clear(), ${F.WIPE})`); await F.seed(b);
  await b.ev(F.restoreText(JSON.stringify(raw))); await b.sleep(900);
  s = await b.ev(sheet);
  b.check("queue-first-night " + s, s.includes("解锁新皮肤「夜曲」") && (await b.ev(`document.querySelectorAll("#sheetBody .skin-prev").length`)) === 1);
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(900);
  s = await b.ev(sheet);
  b.check("queue-then-mist " + s, s.includes("解锁新皮肤「晨雾」"));
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(700);
  b.check("queue-done", (await b.ev(sheet)) === "");
  c = await b.ev(meta);
  b.check("restore-unlocks", c.unlocked.includes("night") && c.unlocked.includes("mist"));
  await b.ev(`localStorage.removeItem("yc-debug")`);
  b.check("no-errors", b.errors.length === 0);
} };
