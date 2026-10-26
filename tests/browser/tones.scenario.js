// 首页声调字：新用户 si；「换一组」；记住；第二天自动换；8 组循环
const F = require("./fixtures.js");
const caps = `[...document.querySelectorAll(".keycap")].map(k => k.innerText.replace(/\\s+/g, " ").trim())`;
const title = `document.querySelector("#home .sec-title").innerText`;
const next = async b => { await b.ev(`document.querySelector("#btnToneNext").click()`); await b.sleep(500); };
module.exports = { name: "tones", async run(b) {
  await F.seed(b);
  const today = await b.ev(`SRS.today(Date.now())`);
  const rec0 = await b.ev(F.idbGet("meta", "tones"));
  b.check("first-day-si " + JSON.stringify(rec0), (await b.ev(title)).includes("六个声调 · si") && (await b.ev(caps))[0] === "詩 si1"
    && !!rec0 && rec0.setIndex === 0 && rec0.date === today);
  await next(b);
  const c1 = await b.ev(caps);
  b.check("next-set-button " + c1.join(","), (await b.ev(title)).includes("六个声调 · fu")
    && c1.join(",") === "夫 fu1,苦 fu2,富 fu3,扶 fu4,婦 fu5,父 fu6" && (await b.ev(F.idbGet("meta", "tones"))).setIndex === 1);
  b.check("keycap-still-speaks", (await b.ev(`[...document.querySelectorAll(".keycap")].map(k => k.dataset.say).join("")`)) === "夫苦富扶婦父");
  b.check("button-44px", (await b.ev(`document.querySelector("#btnToneNext").getBoundingClientRect().height`)) >= 44);
  await b.shot("tones-light");
  await b.nav("/");
  b.check("remembered-after-reload", (await b.ev(title)).includes("六个声调 · fu"));
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ key: "tones", setIndex: 1, date: SRS.today(Date.now() - 86400000) }); tx.oncomplete = () => { db.close(); res(); }; }; })`);
  await b.nav("/");
  b.check("next-day", (await b.ev(title)).includes("六个声调 · fan") && (await b.ev(F.idbGet("meta", "tones"))).setIndex === 2);
  for (let i = 0; i < 8; i++) await next(b);
  b.check("wraps", (await b.ev(title)).includes("六个声调 · fan"));
  b.check("tones: 页面没有报错", b.errors.length === 0);
} };
