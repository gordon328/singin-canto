// 校对歌词页面：入口、列表、整首挪、单句调整、改字、保存、未保存提示、试听、对准
const F = require("./fixtures.js");
const { SMALL_BTNS } = require("./base.scenario.js");
const visible = id => `!!document.querySelector("#${id}") && !document.querySelector("#${id}").hidden`;
const time = i => `document.querySelector('#proofView .pl[data-i="${i}"] .pl-time').innerText.trim()`;
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const toast = `(document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText)`;
async function openProof(b) {
  await b.ev(click("#btnMenu")); await b.sleep(500);
  await b.ev(click('[data-menu="proof"]')); await b.sleep(800);
}
async function openLine(b, i) { await b.ev(click(`#proofView .pl[data-i="${i}"] .pl-head`)); await b.sleep(250); }
module.exports = { name: "proof", async run(b) {
  await F.seed(b);
  await F.openSong(b, "t1");
  await b.ev(click("#btnMenu")); await b.sleep(500);
  b.check("menu-entry-label", (await b.ev(F.sheetText)).includes("校对歌词"));
  await b.ev(click('[data-menu="proof"]')); await b.sleep(800);
  b.check("menu-entry", await b.ev(visible("proofView")) && (await b.ev("history.state && history.state.view")) === "proofView");
  b.check("list", (await b.ev(`document.querySelectorAll("#proofView .pl").length`)) === 16 && (await b.ev(time(0))) === "0:01.0"
    && (await b.ev(`document.querySelector('#proofView .pl[data-i="0"] .pl-txt').innerText.trim()`)) === "我穿風褸出去");

  await b.ev(click("#shiftPlus")); await b.ev(click("#shiftPlus")); await b.sleep(200);
  b.check("shift-all", (await b.ev(`document.querySelector("#shiftVal").innerText.trim()`)) === "+0.4s" && (await b.ev(time(0))) === "0:01.4"
    && (await b.ev(F.idbGet("songs", "t1"))).lines[0].t === 1);
  let floorToast = "";
  for (let k = 0; k < 8; k++) { await b.ev(click("#shiftMinus")); await b.sleep(60); const tt = await b.ev(toast); if (tt) floorToast = tt; }
  b.check("shift-floor " + (await b.ev(time(0))), (await b.ev(time(0))) === "0:00.0" && floorToast.includes("已经到最前面了"));

  await b.ev(click("#proofView [data-back]")); await b.sleep(600);
  const prompt = await b.ev(F.sheetText);
  b.check("unsaved-back-prompts", await b.ev(visible("proofView")) && prompt.includes("有改动还没保存") && prompt.includes("不保存"));
  await b.ev(click('[data-dirty="discard"]')); await b.sleep(900);
  b.check("discard-back-to-player", await b.ev(visible("playerView")) && (await b.ev(F.idbGet("songs", "t1"))).lines[0].t === 1);

  await openProof(b);
  await openLine(b, 3); await openLine(b, 5);
  b.check("expand-one", (await b.ev(`[...document.querySelectorAll("#proofView .pl.open")].map(e => e.dataset.i).join()`)) === "5");
  await b.ev(click('#proofView .pl[data-i="5"] [data-nudge="0.5"]')); await b.sleep(200);
  b.check("nudge-shown " + (await b.ev(time(5))), (await b.ev(time(5))) === "0:16.5");
  const small = await b.ev(SMALL_BTNS);
  b.check("buttons-44px " + small.join(" "), small.length === 0);
  b.check("inputs-16px", await b.ev(`[...document.querySelectorAll("#proofView input[type=text]")].every(e => parseFloat(getComputedStyle(e).fontSize) >= 16)`));
  await b.shot("proof-light"); await b.dark(true); await b.sleep(300); await b.shot("proof-dark"); await b.dark(false);
  await b.send("Runtime.evaluate", { expression: "History.prototype.back.call(history)" }); await b.sleep(900);
  b.check("swipe-back-dirty-prompts", await b.ev(visible("proofView")) && (await b.ev(F.sheetText)).includes("有改动还没保存"));
  await b.ev(click('[data-dirty="save"]')); await b.sleep(900);
  const s1 = await b.ev(F.idbGet("songs", "t1"));
  b.check("nudge-saved", await b.ev(visible("playerView")) && s1.lines[5].t === 16.5 && s1.lines[4].end === 16.5);

  await openProof(b);
  await b.ev(click("#shiftPlus")); await b.ev(click("#shiftPlus")); await b.sleep(150);
  await b.ev(click("#proofSave")); await b.sleep(900);
  const s2 = await b.ev(F.idbGet("songs", "t1"));
  b.check("save-shift", await b.ev(visible("playerView")) && s2.lines[0].t === 1.4 && s2.lines[0].end === 4.4
    && (await b.ev(`document.querySelector('[data-play="0"]').innerText.trim()`)).startsWith("0:01"));

  await openProof(b);
  await openLine(b, 1);
  await b.ev(`(() => { const i = document.querySelector('#proofView .pl[data-i="1"] .pl-text'); i.value = "第三句測試"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev(click("#proofSave")); await b.sleep(900);
  const s3 = await b.ev(F.idbGet("songs", "t1"));
  b.check("edit-text " + JSON.stringify([await b.ev(visible("playerView")), s3.lines[1].text, s3.overrides, await b.ev(`(document.querySelector('#lyrics .line[data-li="1"] .c[data-ci="0"] .jp')||{}).innerText`)]), (await b.ev(`document.querySelector('#lyrics .line[data-li="1"]').innerText`)).includes("三") && s3.lines[1].text === "第三句測試"
    && !("1:0" in s3.overrides) && s3.overrides["3:0"] === "ngo4"
    && (await b.ev(`document.querySelector('#lyrics .line[data-li="1"] .c[data-ci="0"] .jp').innerText.trim()`)) === "dai6");

  await openProof(b);
  await openLine(b, 2);
  await b.ev(`(() => { const i = document.querySelector('#proofView .pl[data-i="2"] .pl-text'); i.value = "  "; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev(click("#proofSave")); await b.sleep(300);
  b.check("empty-text-blocked", (await b.ev(toast)).includes("歌词不能为空") && await b.ev(visible("proofView")));
  await b.ev(click("#proofView [data-back]")); await b.sleep(500);
  await b.ev(click('[data-dirty="discard"]')); await b.sleep(900);
  // 词汇包的错别字更正（巴士→巴仕，故意是错的）：校对页显示的要和播放页一样；改回来保存后播放页显示改后的字
  await openProof(b);
  b.check("proof-shows-fixed-text", (await b.ev(`document.querySelector('#proofView .pl[data-i="9"] .pl-txt').innerText.trim()`)) === "巴仕嚟喇");
  await openLine(b, 9);
  await b.ev(`(() => { const i = document.querySelector('#proofView .pl[data-i="9"] .pl-text'); i.value = "巴士嚟喇"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev(click("#proofSave")); await b.sleep(900);
  b.check("undo-wrong-fix", (await b.ev(`document.querySelector('#lyrics .line[data-li="9"]').innerText`)).includes("士"));

  // ---- Task 5：试听、对准、底部播放条、离开时停歌、没有音频 ----
  const au = `document.querySelector("#au")`;
  const parseT = s => { const [m, x] = s.split(":"); return +m * 60 + parseFloat(x); };
  await openProof(b);
  const L = (await b.ev(F.idbGet("songs", "t1"))).lines;
  await openLine(b, 2);
  await b.ev(click('#proofView .pl[data-i="2"] [data-audition]')); await b.sleep(400);
  const playing = await b.ev(`!${au}.paused`);
  await b.sleep((L[3].t - L[2].t + 0.6) * 1000);
  const stopAt = await b.ev(`[${au}.paused, ${au}.currentTime]`);
  b.check(`audition-stops ${JSON.stringify(stopAt)} next=${L[3].t}`, playing && stopAt[0] && Math.abs(stopAt[1] - L[3].t) <= 0.3);

  await openLine(b, 6);
  const c = await b.ev(`(async () => { const a = ${au}; a.currentTime = 20.3; await a.play(); await new Promise(r => setTimeout(r, 150));
    const c = a.currentTime; document.querySelector('#proofView .pl[data-i="6"] [data-mark]').click(); return c; })()`);
  await b.sleep(200);
  const marked = parseT(await b.ev(time(6)));
  b.check(`mark-now ${marked} expect≈${(c - 0.15).toFixed(2)}`, Math.abs(marked - (c - 0.15)) <= 0.15 && (await b.ev(toast)).includes("已对准"));
  await b.ev(`${au}.pause()`);

  await b.ev(click("#prPlay")); await b.sleep(700);
  const p1 = await b.ev(`[!${au}.paused, +document.querySelector("#prSeek").value]`);
  await b.ev(click("#prPlay")); await b.sleep(200);
  b.check("bottom-bar " + JSON.stringify(p1), p1[0] && p1[1] > 0 && await b.ev(`${au}.paused`));

  await b.ev(click("#prPlay")); await b.sleep(300);
  await b.ev(click("#proofView [data-back]")); await b.sleep(500);
  await b.ev(click('[data-dirty="discard"]')); await b.sleep(900);
  b.check("leave-pauses (有改动、选不保存)", await b.ev(visible("playerView")) && await b.ev(`${au}.paused`));
  await openProof(b);
  await b.ev(click("#prPlay")); await b.sleep(300);
  await b.ev(click("#proofView [data-back]")); await b.sleep(900);
  b.check("leave-pauses (没改动)", await b.ev(visible("playerView")) && await b.ev(`${au}.paused`));

  await b.ev(click("#playerView [data-back]")); await b.sleep(700);
  await F.openSong(b, "t2");
  await openProof(b);
  await openLine(b, 0);
  await b.ev(click('#proofView .pl[data-i="0"] [data-audition]')); await b.sleep(200);
  const t1 = await b.ev(toast);
  await b.ev(click("#prPlay")); await b.sleep(200);
  b.check("no-audio", t1.includes("先加上音频") && (await b.ev(toast)).includes("先加上音频"));
  b.check("proof: 页面没有报错", b.errors.length === 0);
} };
