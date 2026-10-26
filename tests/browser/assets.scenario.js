// 字体和粤拼库自带，不访问外部网站；离线缓存列表里的文件都存在
const F = require("./fixtures.js");
module.exports = { name: "assets", async run(b) {
  await F.seed(b);
  await F.openSong(b, "t1");
  const ext = b.requests.filter(u => !/^(http:\/\/localhost:8080|data:|blob:)/.test(u));
  b.check("no-external-requests" + (ext.length ? " " + ext.join(" ") : ""), ext.length === 0);
  b.check("jyutping-loaded", await b.ev(`typeof ToJyutping === "object" && ToJyutping.getJyutpingText("風") === "fung1"`));
  b.check("outfit-loaded", await b.ev(`document.fonts.load("600 16px Outfit").then(() => [...document.fonts].some(f => f.family.replace(/\"/g, "") === "Outfit" && String(f.weight) === "600" && f.status === "loaded"))`));
  const missing = await b.ev(`fetch("sw.js").then(r => r.text()).then(async t => {
    const shell = JSON.parse(t.match(/const SHELL = (\\[[^\\]]*\\])/)[1].replace(/'/g, '"'));
    const bad = []; for (const p of shell) { const r = await fetch(p); if (r.status !== 200) bad.push(p); } return bad; })`);
  b.check("sw-shell-files-exist" + (missing.length ? " missing: " + missing.join(" ") : ""), missing.length === 0);
} };
