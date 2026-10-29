// 音频地址失效（iOS 在后台回收内存后 object URL 读不出来）时自动恢复（2026-10-29 开发者要求）。
// 在电脑上用 URL.revokeObjectURL 模拟地址失效。句子都是编的。
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const patchSong = (id, patch) => `new Promise(res => { const r = indexedDB.open("yuechang"); r.onsuccess = () => { const db = r.result; const st = db.transaction("songs", "readwrite").objectStore("songs");
  st.get(${JSON.stringify(id)}).onsuccess = e => { st.put(Object.assign(e.target.result, ${JSON.stringify(patch)})).onsuccess = () => { db.close(); res(); }; }; }; })`;
const RECORD = `speechSynthesis.speak = () => {}; speechSynthesis.cancel = () => {};`;
// 播放时读不出来：把音频元素指向一个读不出来的地址（Chrome 对正在用的地址 revoke 后照样能读，模拟不出 iPhone 的情况）
const KILL = `(() => { const a = document.querySelector("#au"); window.__oldSrc = a.src; a.src = "blob:" + location.origin + "/00000000-0000-0000-0000-000000000000"; a.load(); return a.src; })()`;
// 回到前台时地址失效：revoke（fetch 这个地址会失败）
const KILL_URL = `(() => { const a = document.querySelector("#au"); window.__oldSrc = a.src; URL.revokeObjectURL(a.src); return a.src; })()`;
const au = `({ paused: document.querySelector("#au").paused, src: document.querySelector("#au").src, t: document.querySelector("#au").currentTime })`;
const toastText = `document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText`;
const srcWorks = `fetch(document.querySelector("#au").src).then(r => r.ok, () => false)`;
module.exports = { name: "audio-recover", async run(b) {
  await F.seed(b);
  await b.ev(patchSong("t1", { progress: { learned: [], current: true } }));
  await b.nav("/");

  // 学词卡片「听原唱」：地址失效 → 自动重新读音频、换新地址、接着播，不提示
  await b.ev(RECORD); await b.ev(click('#today [data-today="start"]')); await b.sleep(1000);
  await b.ev(KILL);
  await b.ev(click('#studyView [data-act="orig"]')); await b.sleep(1500);
  let a = await b.ev(au);
  b.check("study-recover", !a.paused && a.src !== (await b.ev("window.__oldSrc")) && a.t >= 1 && (await b.ev(toastText)) === "" && await b.ev(srcWorks));
  await b.ev(click("#studyView [data-back]")); await b.sleep(900);

  // 自由听播放按钮：同样自动恢复
  await F.openSong(b, "t1");
  await b.ev(KILL);
  await b.ev(click("#bPlay")); await b.sleep(1500);
  a = await b.ev(au);
  b.check("player-recover", !a.paused && a.src !== (await b.ev("window.__oldSrc")) && (await b.ev(toastText)) === "");
  await b.ev(click("#bPlay")); await b.sleep(200);

  // 回到前台：发现地址读不出来 → 重新加载（不自动播放，位置不变）
  await b.ev(`document.querySelector("#au").currentTime = 7`); await b.sleep(300);
  await b.ev(KILL_URL);
  await b.ev(`document.dispatchEvent(new Event("visibilitychange"))`); await b.sleep(1200);
  a = await b.ev(au);
  b.check("foreground-reload", a.paused && a.src !== (await b.ev("window.__oldSrc")) && await b.ev(srcWorks) && Math.abs(a.t - 7) < 0.5);
  await b.ev(KILL_URL);
  await b.ev(`window.dispatchEvent(new Event("pageshow"))`); await b.sleep(1200);
  a = await b.ev(au);
  b.check("pageshow-reload", a.src !== (await b.ev("window.__oldSrc")) && await b.ev(srcWorks));
  // 地址正常时回到前台：不重新加载
  const keep = (await b.ev(au)).src;
  await b.ev(`document.dispatchEvent(new Event("visibilitychange"))`); await b.sleep(800);
  b.check("foreground-healthy-keeps", (await b.ev(au)).src === keep);

  // 重新读也失败（数据库里的音频没了）→ 提示里有错误代码
  await b.ev(patchSong("t1", { audio: null }));
  await b.ev(KILL);
  await b.ev(click("#bPlay")); await b.sleep(1500);
  const msg = await b.ev(toastText);
  b.check("fail-shows-code " + JSON.stringify(msg), /错误代码 \S+/.test(msg));
  b.check("no-errors", b.errors.length === 0);
} };
