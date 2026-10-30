// 设置 › 皮肤页（v0.33，设计图 docs/design/skins-settings.png）：每个皮肤一张卡片，预览按颜色变量画出来，点已解锁的切换
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const visible = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`;
const card = id => `#skinsView .skin-card[data-skin-id="${id}"]`;
const text = sel => `document.querySelector(${JSON.stringify(sel)}).innerText.replace(/\\s+/g, " ").trim()`;
const day = n => `(() => { const d = new Date(Date.now() - 4 * 3600e3 + ${n} * 86400e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })()`;
const setCheckin = o => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
  st.get("checkin").onsuccess = e => { st.put({ ...e.target.result, ...(${o}) }).onsuccess = () => { db.close(); res(); }; }; }; })`;
async function openSkins(b) { await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800); await b.ev(click("#skinRow")); await b.sleep(900); }

module.exports = { name: "skinpage", async run(b) {
  await F.seed(b);
  // 连续 2 天（昨天、今天打卡）
  const d0 = await b.ev(day(0)), d1 = await b.ev(day(-1));
  await b.ev(setCheckin(`({ days: { ${JSON.stringify(d1)}: { type: "done" }, ${JSON.stringify(d0)}: { type: "done" } }, bestStreak: 2, lastProcessed: ${JSON.stringify(d1)} })`));
  await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800);
  b.check("groups", (await b.ev(`[...document.querySelectorAll("#settingsView .sgrp-t")].map(e => e.innerText).join()`)) === "学习,外观,数据,关于");
  b.check("entry-row " + (await b.ev(text("#skinRow"))), (await b.ev(text("#skinRow"))) === "皮肤 丁香");
  const h0 = await b.ev("history.length");
  await b.ev(click("#skinRow")); await b.sleep(900);
  b.check("page", await b.ev(visible("#skinsView")) && (await b.ev("history.state.view")) === "skinsView" && (await b.ev("history.length")) === h0 + 1);
  b.check("intro", (await b.ev(text("#skinsView .skins-note"))) === "皮肤只改变颜色，学习进度和设置都不受影响。");
  // 两组：已拥有、未解锁；每组按 order 排；小标题和设置页分组一样（12px、--muted）
  const groups = `[...document.querySelectorAll("#skinsList .skins-group")].map(g => g.dataset.group + ":" + [...g.querySelectorAll(".skin-card")].map(e => e.dataset.skinId).join("|")).join(" ")`;
  b.check("groups-owned-locked " + (await b.ev(groups)), (await b.ev(groups)) === "owned:lilac locked:night|mist");
  b.check("group-titles", (await b.ev(`[...document.querySelectorAll("#skinsList .sgrp-t")].map(e => e.innerText).join()`)) === "已拥有,未解锁"
    && await b.ev(`(() => { const t = getComputedStyle(document.querySelector("#skinsList .sgrp-t")), s = getComputedStyle(document.querySelector("#settingsView .sgrp-t"));
      return t.fontSize === "12px" && s.fontSize === "12px" && t.color === s.color && t.fontWeight === s.fontWeight; })()`));
  // 丁香：使用中
  const lilac = await b.ev(text(card("lilac")));
  b.check("lilac-in-use " + lilac, lilac.includes("丁香") && lilac.includes("跟随系统深浅色") && lilac.includes("默认皮肤") && lilac.includes("使用中")
    && await b.ev(`getComputedStyle(document.querySelector(${JSON.stringify(card("lilac"))})).borderColor === getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().replace(/^#(..)(..)(..)$/, (m, r, g, b) => "rgb(" + [r, g, b].map(x => parseInt(x, 16)).join(", ") + ")")`));
  // 夜曲：没解锁，进度 2/3
  const night = await b.ev(text(card("night")));
  b.check("night-locked-progress " + night, night.includes("夜曲") && night.includes("始终深色") && night.includes("连续打卡 3 天解锁") && night.includes("2/3") && night.includes("未解锁"));
  const bar = await b.ev(`(() => { const t = document.querySelector(${JSON.stringify(card("night") + " .skin-bar")}); return t.firstElementChild.getBoundingClientRect().width / t.getBoundingClientRect().width; })()`);
  b.check("progress-bar " + bar.toFixed(2), Math.abs(bar - 2 / 3) < 0.02);
  b.check("locked-preview-faded", (await b.ev(`getComputedStyle(document.querySelector(${JSON.stringify(card("night") + " .skin-prev")})).opacity`)) === "0.5"
    && (await b.ev(`getComputedStyle(document.querySelector(${JSON.stringify(card("night") + " .skin-name")})).opacity`)) === "1");
  // 预览是按颜色变量画的：夜曲的主色块 = #F4A462，没有图片
  b.check("preview-from-vars", (await b.ev(`getComputedStyle(document.querySelector(${JSON.stringify(card("night") + " .skin-prev .p-hero")})).backgroundColor`)) === "rgb(244, 164, 98)"
    && (await b.ev(`document.querySelectorAll("#skinsView img").length`)) === 0 && (await b.ev(`document.querySelectorAll(${JSON.stringify(card("lilac") + " .skin-prev .p-tone")})`.replace("document.querySelectorAll", "document.querySelectorAll") + ".length")) === 6);
  // 晨雾：未解锁时点了不切换
  await b.ev(click(card("mist"))); await b.sleep(300);
  b.check("locked-no-switch", (await b.ev(`document.documentElement.dataset.skin`)) === "lilac" && (await b.ev(`document.querySelector("#toast").innerText`)).includes("还没解锁"));
  b.check("44px", await b.ev(`[...document.querySelectorAll("#skinsView .skin-card")].every(e => e.getBoundingClientRect().height >= 44)`));
  b.check("no-overflow", await b.ev(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot("skins-page-light");
  await b.dark(true); await b.sleep(200); await b.shot("skins-page-dark"); await b.dark(false);

  // 晨雾解锁后：「学会第一首歌 · 已解锁」（主色）+「使用」；点了切换
  await b.ev(setCheckin(`({ unlocked: ["lilac", "mist"], unlockedInfo: { lilac: { by: "default" }, mist: { by: "songs", at: ${JSON.stringify(d0)} } } })`));
  // 解锁后第一次打开皮肤页：晨雾先在「未解锁」里，然后移到「已拥有」，有位置过渡动画
  await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800); await b.ev(click("#skinRow")); await b.sleep(300);
  b.check("moves-from-locked " + (await b.ev(groups)), (await b.ev(groups)) === "owned:lilac locked:night|mist");
  await b.sleep(450);
  b.check("moves-to-owned-animated " + (await b.ev(groups)), (await b.ev(groups)) === "owned:lilac|mist locked:night"
    && (await b.ev(`document.querySelector(${JSON.stringify(card("mist"))}).getAnimations().length`)) > 0);
  await b.sleep(700);
  await b.shot("skins-page-grouped");
  // 再打开就不再动
  await b.ev("history.back()"); await b.sleep(900); await b.ev(click("#skinRow")); await b.sleep(1300);
  b.check("no-move-next-time", (await b.ev(groups)) === "owned:lilac|mist locked:night" && (await b.ev(`document.querySelector(${JSON.stringify(card("mist"))}).getAnimations().length`)) === 0);
  const mist = await b.ev(text(card("mist")));
  b.check("mist-unlocked-label " + mist, mist.includes("学会第一首歌 · 已解锁") && mist.includes("使用") && !mist.includes("使用中"));
  b.check("unlocked-label-accent", (await b.ev(`getComputedStyle(document.querySelector(${JSON.stringify(card("mist") + " .skin-cond")})).color`))
    === (await b.ev(`getComputedStyle(document.querySelector(${JSON.stringify(card("lilac") + " .skin-pill")})).backgroundColor`)));
  await b.ev(click(card("mist"))); await b.sleep(100);
  b.check("switch-fades", await b.ev(`document.documentElement.classList.contains("skin-fade")`));
  await b.sleep(500);
  b.check("switch-skin", (await b.ev(`document.documentElement.dataset.skin`)) === "mist" && (await b.ev(F.idbGet("meta", "checkin"))).theme === "mist"
    && (await b.ev(`localStorage.getItem("yc-skin")`)) === "mist" && (await b.ev(text(card("mist")))).includes("使用中"));
  await b.shot("skins-page-mist");
  await b.ev("history.back()"); await b.sleep(900);
  b.check("settings-row-updated", (await b.ev(text("#skinRow"))) === "皮肤 晨雾");
  // 刷新后还是晨雾
  await b.nav("/");
  b.check("persists", (await b.ev(`document.documentElement.dataset.skin`)) === "mist");
  b.check("no-errors", b.errors.length === 0);
} };
