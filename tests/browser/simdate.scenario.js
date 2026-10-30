// M5.5a：调试面板「模拟日期」——App 的「现在」能往后推，只在调试面板打开时生效
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const putCards = cs => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("cards", "readwrite"); const st = tx.objectStore("cards");
  ${JSON.stringify(cs)}.forEach(c => st.put(c)); tx.oncomplete = () => { db.close(); res(); }; }; })`;
const mk = (w, jp, due) => ({ w, jp, zh: "", tip: "", oral: false, sources: [], known: false, created: 1, updated: 1, srs: { due, interval: 1, ease: 2.5, reps: 1, lapses: 0 } });
const dueNum = `(() => { const e = document.querySelector("#today .big"); return e ? +e.innerText : 0; })()`;
const label = `document.querySelector("#dbgSim .lbl") ? document.querySelector("#dbgSim .lbl").innerText : ""`;
const real = `(() => { const d = new Date(Date.now() - 4 * 3600e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })()`;
module.exports = { name: "simdate", async run(b) {
  await F.seed(b);
  const now = Date.now();
  // 一张现在到期、一张两天后到期：模拟 +2 天后两张都到期
  await b.ev(putCards([mk("風褸", "fung1 lau1", now - 1000), mk("街", "gaai1", now + 2 * 86400e3 - 3600e3)]));
  await b.ev(`localStorage.setItem("yc-debug", "1")`);
  await b.nav("/");
  const today = await b.ev(real);
  b.check("sim-controls", await b.ev(`["simMinus", "simPlus", "simReset", "simDate"].every(id => !!document.getElementById(id))`)
    && (await b.ev(label)).includes("模拟日期 " + today) && (await b.ev(label)).includes("真实 +0 天"));
  await b.ev(click("#dbgFab")); await b.sleep(300); // 展开调试面板才量得到大小
  b.check("sim-44px", await b.ev(`[...document.querySelectorAll("#dbgSim button, #dbgSim input")].every(e => e.getBoundingClientRect().height >= 44)`));
  const d0 = await b.ev(dueNum);
  await b.ev(click("#simPlus")); await b.sleep(200); await b.ev(click("#simPlus")); await b.sleep(300);
  b.check("sim-plus " + JSON.stringify([d0, await b.ev(dueNum)]), d0 === 1 && (await b.ev(dueNum)) === 2 && (await b.ev(label)).includes("真实 +2 天")
    && (await b.ev(`localStorage.getItem("yc-simdays")`)) === "2");
  // 选一个 10 天后的日期
  const later = await b.ev(`(() => { const d = new Date(Date.now() - 4 * 3600e3 + 10 * 86400e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })()`);
  await b.ev(`(() => { const i = document.querySelector("#simDate"); i.value = ${JSON.stringify(later)}; i.dispatchEvent(new Event("change", { bubbles: true })); })()`); await b.sleep(300);
  b.check("sim-date-input", (await b.ev(`localStorage.getItem("yc-simdays")`)) === "10" && (await b.ev(label)).includes(later));
  // 刷新后还在
  await b.nav("/");
  b.check("sim-persists", (await b.ev(label)).includes(later) && (await b.ev(dueNum)) === 2);
  await b.ev(click("#simReset")); await b.sleep(300);
  b.check("sim-reset", (await b.ev(`localStorage.getItem("yc-simdays")`)) === null && (await b.ev(dueNum)) === 1);
  await b.ev(click("#simPlus")); await b.sleep(300);
  // 版本号点三下关掉调试面板：模拟日期清零，那一行消失
  await b.ev(`(() => { const v = document.querySelector("#appVer"); for (let i = 0; i < 3; i++) v.click(); })()`); await b.sleep(300);
  b.check("sim-off-resets", (await b.ev(`localStorage.getItem("yc-simdays")`)) === null && (await b.ev(`document.querySelector("#dbgSim").hidden`)) && (await b.ev(dueNum)) === 1);
  // 关着面板时，就算 localStorage 里有天数也不生效
  await b.ev(`localStorage.setItem("yc-simdays", "5")`); await b.nav("/");
  b.check("sim-ignored-when-off", (await b.ev(dueNum)) === 1);
  b.check("simdate: 页面没有报错", b.errors.length === 0);
} };
