// 输入框（v0.34）：所有皮肤、所有输入框统一——底色和所在卡片明显不同（卡片里用 --bg；直接放在页面上的用 --surface）、
// 1px 看得清的边框（--field-border），点进去变成 1.5px 主色。五种配色截图
const F = require("./fixtures.js");
const SKIN = require("../../skins/skin.js");
const ids = require("../../skins/registry.js");
const defs = Object.fromEntries(ids.map(id => [id, require(`../../skins/${id}.js`)]));
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const setCheckin = o => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("meta", "readwrite").objectStore("meta");
  st.get("checkin").onsuccess = e => { st.put({ ...e.target.result, ...${JSON.stringify(o)} }).onsuccess = () => { db.close(); res(); }; }; }; })`;
const style = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); const s = getComputedStyle(e);
  return { bg: s.backgroundColor, bw: s.borderTopWidth, bc: s.borderTopColor, sh: s.boxShadow }; })()`;
const onePx = w => { const n = parseFloat(w); return n >= 0.6 && n <= 1; };
const LOOKS = [["lilac", false], ["lilac", true], ["night", false], ["mist", false], ["mist", true]];

module.exports = { name: "fields", async run(b) {
  await F.seed(b);
  await b.send("Emulation.setFocusEmulationEnabled", { enabled: true }); // 无界面浏览器里输入框才能真的获得焦点
  // 加一个生词，「我的生词」才显示搜索框
  await b.ev(`new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; db.transaction("cards", "readwrite").objectStore("cards")
    .put({ w: "你", jp: "nei5", zh: "你", tip: "", oral: false, sources: [], known: false, srs: { due: 1, interval: 1, ease: 2.5, reps: 1, lapses: 0 }, created: 1, updated: 1 }).onsuccess = () => { db.close(); res(); }; }; })`);
  for (const [id, dark] of LOOKS) {
    await b.dark(dark);
    await b.ev(setCheckin({ unlocked: ["lilac", "night", "mist"], theme: id })); await b.ev(`localStorage.setItem("yc-skin", ${JSON.stringify(id)})`);
    await b.nav("/");
    const c = SKIN.colorsFor(defs[id], dark), name = `${id}-${defs[id].modes === "dark-only" || dark ? "dark" : "light"}`;
    const want = { bg: rgb(c.bg), bw: "1px", bc: rgb(c[SKIN.FIELD_BORDER]) };
    // 导入新歌：歌名、歌手、歌词
    await b.ev(click("#btnAdd")); await b.sleep(800);
    for (const sel of ["#fTitle", "#fArtist", "#fLyrics"]) {
      const s = await b.ev(style(sel));
      b.check(`${name} ${sel} ${JSON.stringify(s)}`, s.bg === want.bg && onePx(s.bw) && s.bc === want.bc && s.bg !== rgb(c.surface));
    }
    await b.ev(`document.querySelector("#fTitle").focus()`); await b.sleep(300);
    const f = await b.ev(style("#fTitle"));
    b.check(`${name} focus ${JSON.stringify(f)}`, f.bc === rgb(c.accent) && onePx(f.bw) && f.sh.includes(rgb(c.accent)) && /0\.5px|0px 0px 0px 0\.5px/.test(f.sh));
    await b.ev(`document.querySelector("#fTitle").blur(); document.querySelector("#fTitle").value = ""`);
    await b.shot(`fields-import-${name}`);
    // 我的生词搜索框（直接放在页面上）：底色用 --surface，和页面不同
    await b.nav("/"); await b.ev(click("#btnSettings")); await b.sleep(800); await b.ev(click("#wordsRow")); await b.sleep(800);
    if (await b.ev(`!document.querySelector("#wTools").hidden`)) {
      const w = await b.ev(style("#wQ"));
      b.check(`${name} search ${JSON.stringify(w)}`, w.bg === rgb(c.surface) && onePx(w.bw) && w.bc === want.bc);
    } else b.skip(`${name} search`, "没有生词时不显示搜索框");
  }
  await b.dark(false);
  // 编辑歌曲：歌名、歌手、每一句的文字
  await b.ev(setCheckin({ theme: "lilac" })); await b.ev(`localStorage.setItem("yc-skin", "lilac")`); await b.nav("/");
  await F.openSong(b, "t1");
  await b.ev(click("#btnMenu")); await b.sleep(300);
  await b.ev(`[...document.querySelectorAll("#songMenu button")].find(x => x.innerText.includes("编辑歌曲")).click()`); await b.sleep(900);
  const lilac = SKIN.colorsFor(defs.lilac, false);
  for (const sel of ["#prTitle", "#prArtist"]) {
    const s = await b.ev(style(sel));
    b.check(`edit ${sel}`, s.bg === rgb(lilac.bg) && onePx(s.bw) && s.bc === rgb(lilac[SKIN.FIELD_BORDER]));
  }
  await b.ev(`document.querySelector("#proofList .pl .pl-head").click()`); await b.sleep(400);
  if (await b.ev(`!!document.querySelector("#proofList .pl-text")`)) {
    const s = await b.ev(style("#proofList .pl-text"));
    b.check("edit line text", onePx(s.bw) && s.bc === rgb(lilac[SKIN.FIELD_BORDER]) && s.bg !== rgb(lilac.surface));
  } else b.skip("edit line text", "没点开句子");
  b.check("no-errors", b.errors.length === 0);
} };
