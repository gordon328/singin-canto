// 数据兼容（docs/数据兼容规则.md）：用 tests/fixtures/ 里每一版的旧数据造数据库，打开 App 后自动升级、数据不丢；
// 升级前有快照，能「恢复到更新前的数据」；升级失败自动恢复；每一种旧备份都能导入，太新的备份不导入；版本号和版本记录页
const fs = require("fs"), path = require("path");
const F = require("./fixtures.js");
const DATA = require("../../data.js");
// 现在的 App 版本号（index.html 的 APP_VERSION）
const APP = /const APP_VERSION="([^"]+)"/.exec(fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8"))[1];
const FX = path.join(__dirname, "..", "fixtures");
const fx = f => JSON.parse(fs.readFileSync(path.join(FX, f), "utf8"));
const fxText = f => fs.readFileSync(path.join(FX, f), "utf8");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`;

// 按旧版本的样子建数据库：第 1 版只有 songs 表（IndexedDB 版本 1），之后有 songs/cards/meta（IndexedDB 版本 2）；prefs 写进 localStorage
const seedOld = d => `new Promise((res, rej) => { localStorage.clear(); const d = ${JSON.stringify(d)}; const v1 = d.dataVersion === 1;
  const del = indexedDB.deleteDatabase("yuechang"); del.onsuccess = del.onerror = () => {
  const r = indexedDB.open("yuechang", v1 ? 1 : 2);
  r.onupgradeneeded = () => { const db = r.result; db.createObjectStore("songs", { keyPath: "id" }); if (!v1) { db.createObjectStore("cards", { keyPath: "w" }); db.createObjectStore("meta", { keyPath: "key" }); } };
  r.onsuccess = () => { const db = r.result; const names = v1 ? ["songs"] : ["songs", "cards", "meta"]; const tx = db.transaction(names, "readwrite");
    for (const s of d.songs) tx.objectStore("songs").put({ ...s, audio: null });
    if (!v1) { for (const c of d.cards || []) tx.objectStore("cards").put(c); for (const m of d.meta || []) tx.objectStore("meta").put(m); }
    if (d.prefs) localStorage.setItem("yc-prefs", JSON.stringify(d.prefs));
    tx.oncomplete = () => { db.close(); res(); }; tx.onerror = rej; }; r.onerror = rej; }; })`;
const idbAll = store => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result;
  if (!db.objectStoreNames.contains(${JSON.stringify(store)})) { db.close(); res(null); return; }
  db.transaction(${JSON.stringify(store)}).objectStore(${JSON.stringify(store)}).getAll().onsuccess = e => { db.close(); res(e.target.result); }; }; })`;
const stores = `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const n = [...db.objectStoreNames].sort(); db.close(); res(n); }; })`;
const noAudio = s => { const o = { ...s }; delete o.audio; return o; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// 旧数据里的每一首歌、每张卡片、每条 meta 都原样在数据库里
async function kept(b, d) {
  const songs = (await b.ev(idbAll("songs"))).map(noAudio), cards = await b.ev(idbAll("cards")), meta = await b.ev(idbAll("meta"));
  return songs.length === d.songs.length && d.songs.every(s => same(songs.find(x => x.id === s.id), s))
    && cards.length === (d.cards || []).length && (d.cards || []).every(c => same(cards.find(x => x.w === c.w), c))
    && (d.meta || []).every(m => {
      const x = meta.find(y => y.key === m.key);
      // App 每次启动本来就会更新的：声调字每天换一组；打卡记录补上休息日。只要求原来的打卡日子一天不少
      if (m.key === "tones") return !!x && Number.isInteger(x.setIndex);
      if (m.key === "checkin") return !!x && Object.entries(m.days).every(([k, v]) => x.days[k] && x.days[k].type === v.type) && x.restTokens >= 0;
      return same(x, m);
    });
}

module.exports = { name: "data", async run(b) {
  // ---- 每一版旧数据：打开 App 自动升级 ----
  // v0.30 以前的设备没记 dataVersion：只有 songs 表算第 1 版，有 meta 表一律按第 2 版从头升级（每一步都不会重复改数据）
  // 最后一项模拟以后的设备：记着 dataVersion 3
  for (const [f, mark] of [["data-v1.json"], ["data-v2.json"], ["data-v3.json"], ["data-v4.json"], ["data-v3.json", 3]]) {
    const d = fx(f), name = f + (mark ? "-marked" : "");
    if (mark) d.meta = [...d.meta, { key: "dataVersion", v: mark }];
    await b.nav("/__blank"); await b.ev(seedOld(d)); await b.nav("/");
    if (mark) d.meta = d.meta.filter(m => m.key !== "dataVersion");
    const dv = await b.ev(F.idbGet("meta", "dataVersion")), snap = await b.ev(F.idbGet("snapshot", "last"));
    const from = mark || (d.dataVersion === 1 ? 1 : 2);
    b.check(`${name}-upgraded`, dv && dv.v === DATA.VERSION);
    b.check(`${name}-kept`, await kept(b, d));
    b.check(`${name}-home-shows-songs`, (await b.ev(`document.querySelectorAll("#songs .song").length`)) === d.songs.length);
    b.check(`${name}-snapshot`, !!snap && snap.from === from && snap.to === DATA.VERSION && snap.app === APP
      && snap.data.songs.length === d.songs.length && snap.data.songs.every(s => !("audio" in s)) && same(snap.data.prefs, d.prefs || {}));
    b.check(`${name}-prefs-kept`, same(await b.ev(`JSON.parse(localStorage.getItem("yc-prefs"))`), { ...(d.prefs || {}) }));
    b.check(`${name}-stores`, same(await b.ev(stores), ["cards", "meta", "snapshot", "songs"]));
  }
  // 第 2 版的「每天几句」在 prefs.goal：升级后设置页显示 6
  { const d = fx("data-v2.json"); await b.nav("/__blank"); await b.ev(seedOld(d)); await b.nav("/");
    b.check("v2-goal-moved", (await b.ev(F.idbGet("meta", "daily")))?.goal === 6);
    await b.ev(click("#btnSettings")); await b.sleep(800);
    b.check("v2-goal-shown", (await b.ev(`document.querySelector("#goalSeg [aria-pressed=true]").innerText.trim()`)) === "6");
    // 「恢复到更新前的数据」已经删掉：设置页和调试面板都没有，快照只在后台用（上面已检查升级时存了快照）
    b.check("no-snapshot-in-settings", !(await b.ev(`document.querySelector("#settingsView").innerText`)).includes("恢复到更新前"));
    await b.ev(`localStorage.setItem("yc-debug", "1")`); await b.nav("/");
    const dt = await b.ev(`document.querySelector("#dbgData").textContent`);
    b.check("no-snapshot-in-debug " + dt.replace(/\s+/g, " "), !dt.includes("快照") && !dt.includes("恢复到更新前") && dt.includes(`数据格式第 ${DATA.VERSION} 版`)
      && !(await b.ev(`!!document.querySelector("#dbgSnap")`)) && !!(await b.ev(F.idbGet("snapshot", "last"))));
    await b.ev(`localStorage.removeItem("yc-debug")`);
  }

  // ---- 新装：直接是最新格式，没有快照，不显示恢复按钮 ----
  await b.nav("/__blank"); await b.ev(`(localStorage.clear(), ${F.WIPE})`); await b.nav("/");
  b.check("fresh-version", (await b.ev(F.idbGet("meta", "dataVersion")))?.v === DATA.VERSION && !(await b.ev(F.idbGet("snapshot", "last"))));
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("fresh-safari-tip", (await b.ev(`document.querySelector("#bkTip").innerText`)) === "建议添加到主屏幕使用，数据更不容易丢失" && await b.ev(visible("#bkTip")));

  // ---- 每一种旧备份都能导入（先迁移再合并）----
  for (const f of ["backup-v1.json", "backup-v2-m1.json", "backup-v2-m4.json", "backup-v2-v029.json", "backup-v3.json"]) {
    const d = fx(f);
    await b.nav("/__blank"); await b.ev(`(localStorage.clear(), ${F.WIPE})`); await b.nav("/");
    const msg = await b.ev(F.restoreText(fxText(f)));
    const songs = (await b.ev(idbAll("songs"))).map(noAudio), cards = await b.ev(idbAll("cards"));
    b.check(`${f}-restored ${msg}`, msg.includes(`已恢复 ${d.songs.length} 首歌`) && songs.length === d.songs.length && cards.length === (d.cards || []).length
      && d.songs.every(s => same(songs.find(x => x.id === s.id)?.lines, s.lines) && same(songs.find(x => x.id === s.id)?.overrides, s.overrides) && same(songs.find(x => x.id === s.id)?.pack, s.pack)));
    if ((d.meta || []).some(m => m.key === "checkin")) b.check(`${f}-checkin`, Object.keys((await b.ev(F.idbGet("meta", "checkin")))?.days || {}).length === 3);
    b.check(`${f}-dataVersion-unchanged`, (await b.ev(F.idbGet("meta", "dataVersion")))?.v === DATA.VERSION);
  }
  // 太新的备份：提示先更新 App，不弹确认、不导入
  b.check("future-backup-refused", (await b.ev(F.restoreText(fxText("backup-future.json")))).includes("这个备份来自更新的版本，请先更新 App")
    && await b.ev(`document.querySelector("#sheet").hidden`) && (await b.ev(idbAll("songs"))).length === 2);
  // 导出的备份带 dataVersion 和 App 版本
  const out = JSON.parse(await b.ev(F.exportText));
  b.check("export-has-versions", out.dataVersion === DATA.VERSION && out.appVersion === APP && !out.meta.some(m => m.key === "dataVersion"));

  // ---- 升级失败：自动用快照恢复，提示开发者 ----
  const hook = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { let D; Object.defineProperty(self, "DATA", { configurable: true,
    get() { return D; }, set(v) { v.STEPS[${DATA.VERSION}] = () => { throw new Error("测试：故意失败"); }; D = v; } }); })()` });
  { const d = fx("data-v3.json"); await b.nav("/__blank"); await b.ev(seedOld(d)); await b.nav("/");
    b.check("fail-toast", (await b.ev(`document.querySelector("#toast").innerText`)).includes("已经恢复到更新前的数据"));
    b.check("fail-data-kept", await kept(b, d) && (await b.ev(F.idbGet("meta", "dataVersion")))?.v === 2 && (await b.ev(`document.querySelectorAll("#songs .song").length`)) === 2); }
  await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: hook.result.identifier });

  // ---- 版本号和版本记录页 ----
  await b.nav("/");
  b.check("home-version", (await b.ev(`document.querySelector("#appVer").innerText`)) === "版本 " + APP);
  await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("settings-version", (await b.ev(`document.querySelector("#setVer").innerText`)) === APP);
  const h0 = await b.ev("history.length");
  await b.ev(click("#btnChangelog")); await b.sleep(1000);
  const cl = await b.ev(`document.querySelector("#clBody").innerText`);
  b.check("changelog-page", await b.ev(visible("#changelogView")) && (await b.ev("history.length")) === h0 + 1 && (await b.ev("history.state.view")) === "changelogView");
  b.check("changelog-content", cl.includes(APP) && cl.includes("v0.29") && cl.includes("第一阶段") && (await b.ev(`document.querySelectorAll("#clBody .card").length`)) > 10
    && (await b.ev(`document.querySelectorAll("#clBody .cl-warn").length`)) >= 3 && !cl.includes("# 更新记录"));
  b.check("changelog-no-overflow", await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot("changelog-light");
  await b.dark(true); await b.sleep(200); await b.shot("changelog-dark"); await b.dark(false);
  await b.ev("history.back()"); await b.sleep(900);
  b.check("changelog-back", await b.ev(visible("#settingsView")));
} };
