// 首页声调字：新用户 si；「换一组」；记住；第二天自动换；8 组循环
const F = require("./fixtures.js");
const caps = `[...document.querySelectorAll("#tones .key")].map(k => k.innerText.replace(/\\s+/g, " ").trim())`;
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
  b.check("keycap-still-speaks", (await b.ev(`[...document.querySelectorAll("#tones .key")].map(k => k.dataset.say).join("")`)) === "夫苦富扶婦父");
  // 设计规范 5.2（2026-10-27 改）：两层结构。底座（声调色）固定不动，按下时只有键面往下移 4px 盖住底座；
  // 按钮本身不移动、不用 box-shadow 画底边
  const geo = `(() => { const k = document.querySelectorAll("#tones .key")[2], base = k.querySelector(".key-base"), face = k.querySelector(".key-face");
    if (!base || !face) return null; const r = e => { const x = e.getBoundingClientRect(); return [Math.round(x.top), Math.round(x.bottom)]; };
    return { k: r(k), base: r(base), face: r(face), baseBg: getComputedStyle(base).backgroundColor, t3: getComputedStyle(document.documentElement).getPropertyValue("--t3").trim(),
      faceBg: getComputedStyle(face).backgroundColor, kShadow: getComputedStyle(k).boxShadow, kTf: getComputedStyle(k).transform, pressed: k.classList.contains("is-pressed") }; })()`;
  const hex = h => "rgb(" + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(", ") + ")";
  const up = await b.ev(geo);
  b.check("key-layers " + JSON.stringify(up), !!up && up.k[1] - up.k[0] === 66 && up.base[0] === up.k[0] + 4 && up.base[1] === up.k[1]
    && up.face[0] === up.k[0] && up.face[1] === up.k[1] - 4 && up.baseBg === hex(up.t3) && up.kShadow === "none");
  await b.ev(`document.querySelectorAll("#tones .key")[2].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))`); await b.sleep(200);
  const dn = await b.ev(geo);
  b.check("key-press-face-only " + JSON.stringify(dn), !!dn && dn.pressed && dn.kTf === "none" && JSON.stringify(dn.k) === JSON.stringify(up.k) && JSON.stringify(dn.base) === JSON.stringify(up.base)
    && dn.face[0] === up.face[0] + 4 && dn.face[1] === up.k[1] && dn.faceBg !== up.faceBg);
  await b.ev(`document.querySelectorAll("#tones .key")[2].dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))`); await b.sleep(600); // 松手用弹簧弹回，0.4 秒
  b.check("key-springs-back", JSON.stringify((await b.ev(geo)).face) === JSON.stringify(up.face));
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
