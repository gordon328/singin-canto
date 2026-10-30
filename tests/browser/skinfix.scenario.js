// 皮肤：最终检查发现的问题（v0.33）。每一条先复现再修
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const meta = F.idbGet("meta", "checkin");
const sheet = `(() => { const s = document.querySelector("#sheet"); return s.hidden ? "" : document.querySelector("#sheetBody").innerText.replace(/\s+/g, " "); })()`;
const day = n => `(() => { const d = new Date(Date.now() - 4 * 3600e3 + ${n} * 86400e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })()`;
const setCheckin = o => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
  st.get("checkin").onsuccess = e => { st.put({ ...e.target.result, ...(${o}) }).onsuccess = () => { db.close(); res(); }; }; }; })`;
const songs = `document.querySelectorAll("#songs .song").length`;

module.exports = { name: "skinfix", async run(b) {
  await F.seed(b);
  const d0 = await b.ev(day(0)), d1 = await b.ev(day(-1)), d2 = await b.ev(day(-2));
  const three = `({ days: { ${JSON.stringify(d2)}: { type: "done" }, ${JSON.stringify(d1)}: { type: "done" }, ${JSON.stringify(d0)}: { type: "done" } }, bestStreak: 3, lastProcessed: ${JSON.stringify(d1)} })`;

  // 1. 浏览器不让用 localStorage：App 照样能打开，首页有歌
  let hook = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const t = () => { throw new DOMException("blocked", "SecurityError"); };
    Storage.prototype.getItem = t; Storage.prototype.setItem = t; Storage.prototype.removeItem = t; })()` });
  await b.nav("/"); await b.sleep(500);
  b.check("storage-blocked-boots", (await b.ev(songs)) === 2 && (await b.ev(`document.documentElement.dataset.skin`)) === "lilac");
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: hook.result.identifier });

  // 2. 达成条件后很快离开完成页（或在别处达成）：回到首页时照样解锁、弹窗
  await b.ev(setCheckin(three)); await b.nav("/"); await b.sleep(1200);
  b.check("boot-unlocks-night", (await b.ev(sheet)).includes("解锁新皮肤「夜曲」"));
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(600);
  // 第 3 天学完后马上离开完成页（打卡动画还没放完）：回到首页照样解锁、弹窗
  const two = `({ days: { ${JSON.stringify(d2)}: { type: "done" }, ${JSON.stringify(d1)}: { type: "done" } }, bestStreak: 2, lastProcessed: ${JSON.stringify(d1)}, unlocked: ["lilac"], unlockedInfo: { lilac: { by: "default" } }, unseen: [] })`;
  await b.ev(setCheckin(two));
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction(["songs", "cards"], "readwrite");
    tx.objectStore("cards").clear(); const st = tx.objectStore("songs");
    st.get("t1").onsuccess = e => { st.put(Object.assign(e.target.result, { progress: { learned: Array.from({ length: 15 }, (_, i) => i), current: true } })); };
    tx.oncomplete = () => { db.close(); res(); }; }; })`);
  await b.nav("/"); await b.sleep(600);
  b.check("not-yet", (await b.ev(sheet)) === "");
  await b.ev(click('#today [data-today="start"]')); await b.sleep(900);
  for (let i = 0; i < 25 && !(await b.ev(`!!document.querySelector("#stBody .st-done")`)); i++) {
    await b.ev(`(() => { const x = document.querySelector('#studyView [data-act="got"]') || document.querySelector('#studyView [data-act="lineok"]'); if (x) x.click(); })()`);
    await b.sleep(450);
  }
  await b.ev(click('#studyView [data-act="home"]')); await b.sleep(1800); // 完成页一出现就离开（打卡动画要 1.1 秒）
  b.check("left-done-page-quickly-still-unlocks " + (await b.ev(sheet)), (await b.ev(sheet)).includes("解锁新皮肤「夜曲」") && (await b.ev(meta)).unlocked.includes("night"));
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(900);
  if ((await b.ev(sheet)).includes("晨雾")) { await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(600); }

  // 3. 解锁了但弹窗还没出来 App 就被关掉：下次打开还会弹（没看过的记在打卡记录里）
  await b.ev(setCheckin(`({ unlocked: ["lilac", "night"], unlockedInfo: { lilac: { by: "default" }, night: { by: "streak", at: ${JSON.stringify(d0)} } }, unseen: ["night"] })`));
  await b.nav("/"); await b.sleep(1200);
  b.check("unseen-survives-restart", (await b.ev(sheet)).includes("解锁新皮肤「夜曲」"));
  await b.ev(click('#sheetBody [data-unlock="later"]')); await b.sleep(600);
  b.check("unseen-cleared", ((await b.ev(meta)).unseen || []).length === 0);
  await b.nav("/"); await b.sleep(1200);
  b.check("no-repeat-after-seen", (await b.ev(sheet)) === "");

  // 5. 这台设备还没打过卡、但有解锁记录：恢复备份不能丢掉这台设备的解锁记录
  await b.ev(setCheckin(`({ days: {}, bestStreak: 0, unlocked: ["lilac", "night"], unlockedInfo: { lilac: { by: "default" }, night: { by: "code", at: "2026-10-01" } }, unseen: [] })`));
  await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800);
  const bk = JSON.parse(await b.ev(F.exportText));
  const ci = bk.meta.find(m => m.key === "checkin");
  Object.assign(ci, { days: { [d0]: { type: "done" } }, unlocked: ["lilac"], unlockedInfo: { lilac: { by: "default" } } });
  await b.ev(F.restoreText(JSON.stringify(bk))); await b.sleep(600);
  const c5 = await b.ev(meta);
  b.check("restore-keeps-local-unlocks " + JSON.stringify(c5.unlockedInfo), c5.unlocked.includes("night") && c5.unlockedInfo.night.by === "code" && c5.unlockedInfo.night.at === "2026-10-01" && !!c5.days[d0]);

  // 6. 点「立即使用」：弹窗照样滑下去（换皮肤的颜色过渡不能盖掉弹窗自己的动画）
  await b.ev(setCheckin(`({ unlocked: ["lilac"], unlockedInfo: { lilac: { by: "default" } }, unseen: [], theme: "lilac" })`));
  await b.ev(setCheckin(three)); await b.nav("/"); await b.sleep(1200);
  b.check("popup-for-use", (await b.ev(sheet)).includes("夜曲"));
  await b.ev(click('#sheetBody [data-unlock="use"]')); await b.sleep(60);
  b.check("sheet-keeps-slide " + (await b.ev(`getComputedStyle(document.querySelector("#sheet")).transitionProperty`)),
    (await b.ev(`getComputedStyle(document.querySelector("#sheet")).transitionProperty`)).includes("transform") && await b.ev(`document.documentElement.classList.contains("skin-fade")`));
  await b.sleep(600);

  // 7. 皮肤文件没加载到（刚更新时网络断了）：不白屏，首页照样能用
  await b.send("Network.setBlockedURLs", { urls: ["*skins/lilac.js*", "*skins/night.js*"] });
  await b.ev(`caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))`);
  await b.nav("/"); await b.sleep(800);
  b.check("missing-skin-file-boots", (await b.ev(songs)) === 2);
  await b.send("Network.setBlockedURLs", { urls: [] });
  b.check("no-uncaught-errors " + b.errors.slice(0, 2).join(" | "), b.errors.every(e => /ERR_BLOCKED|Failed to load|net::/.test(e)));
} };
