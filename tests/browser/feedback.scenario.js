// M3 验收反馈：页面底色、状态栏遮罩、歌词输入框、换一组转圈、--danger、按下状态复位、导入页保存、确认窗
const F = require("./fixtures.js");
const click = sel => `document.querySelector(${JSON.stringify(sel)}).click()`;
const toast = `(document.querySelector("#toast").hidden ? "" : document.querySelector("#toast").innerText)`;
const cs = (sel, prop) => `getComputedStyle(document.querySelector(${JSON.stringify(sel)})).${prop}`;
module.exports = { name: "feedback", async run(b) {
  await F.seed(b);

  // bug 3：每个页面从一开始就有不透明底色
  b.check("pages-opaque", await b.ev(`["home","importView","syncView","playerView","proofView","settingsView"].every(id => { const c = getComputedStyle(document.getElementById(id)).backgroundColor; return c !== "rgba(0, 0, 0, 0)" && c !== "transparent"; })`));

  // 改进 8：--danger
  const danger = `getComputedStyle(document.documentElement).getPropertyValue("--danger").trim().toUpperCase()`;
  b.check("danger-light", (await b.ev(danger)) === "#C2413A");
  await b.dark(true); await b.sleep(150);
  b.check("danger-dark", (await b.ev(danger)) === "#FF8A80");
  await b.dark(false); await b.sleep(150);

  // 改进 7：换一组的图标转一圈；减弱动态效果时不转
  const spinName = `(() => { const a = document.querySelector("#btnToneNext svg").getAnimations(); return a.map(x => x.animationName).join(); })()`;
  await b.ev(click("#btnToneNext")); await b.sleep(50);
  b.check("tone-spin", (await b.ev(spinName)) === "spin");
  await b.sleep(600);
  await b.reducedMotion(true);
  await b.ev(click("#btnToneNext")); await b.sleep(50);
  b.check("tone-spin-reduced-motion", (await b.ev(spinName)) === "");
  await b.reducedMotion(false); await b.sleep(400);

  // M3.12 弹出层不使用暗幕：Safari 的状态栏由它自己画，网页变暗时状态栏跟不上。顶部附近也不能出现有颜色的 fixed 元素。
  // 歌曲页「⋯」改成下拉小菜单（挂在吸顶顶栏里，absolute）；底部弹窗靠阴影浮在页面上，点外面关闭（确认类弹窗除外）
  const topFixed = `[...document.querySelectorAll("body *")].filter(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.position === "fixed" && r.height > 0 && r.top <= 60 && r.bottom > 0 && s.visibility !== "hidden" && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor); }).map(e => e.id || e.className)`;
  const menu = `(() => { const m = document.querySelector("#songMenu"), s = getComputedStyle(m), r = m.getBoundingClientRect(), br = document.querySelector("#btnMenu").getBoundingClientRect();
    return { hidden: m.hidden, open: m.classList.contains("open"), op: +s.opacity, tf: s.transform, pos: s.position, inBar: !!m.closest("#playerView .bar"), radius: s.borderTopLeftRadius,
      below: r.top >= br.bottom && r.top - br.bottom < 12, right: Math.abs(r.right - br.right) < 1, items: [...m.querySelectorAll("[data-menu]")].map(e => e.innerText.trim()),
      minH: Math.min(...[...m.querySelectorAll("[data-menu]")].map(e => e.getBoundingClientRect().height)) }; })()`;
  const center = sel => `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`;
  const sheetShown = `!document.querySelector("#sheet").hidden`;
  b.check("no-top-tint", !(await b.ev(`!!document.querySelector("#topTint")`)));
  b.check("no-scrim", !(await b.ev(`!!document.querySelector("#backdrop")`)) && (await b.ev(`getComputedStyle(document.documentElement).getPropertyValue("--scrim").trim()`)) === "");
  await F.openSong(b, "t1");
  await F.tapAt(b, ...(await b.ev(center("#btnMenu")))); await b.sleep(40);
  const m0 = await b.ev(menu);
  b.check("menu-anim-in " + JSON.stringify(m0), !m0.hidden && m0.open && m0.op < 1 && m0.tf !== "none");
  await b.sleep(300);
  const m1 = await b.ev(menu);
  b.check("menu-dropdown " + JSON.stringify(m1), m1.op === 1 && m1.pos === "absolute" && m1.inBar && m1.below && m1.right && m1.radius === "16px" && m1.minH >= 44
    && JSON.stringify(m1.items) === JSON.stringify(["设为正在学", "编辑歌曲", "词汇包 ✓", "删除"]));
  const surface = await b.ev(`(() => { const d = document.createElement("div"); d.style.background = "var(--surface)"; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; })()`);
  const dangerC = await b.ev(`(() => { const d = document.createElement("div"); d.style.color = "var(--danger)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })()`);
  b.check("menu-style", (await b.ev(cs("#songMenu", "backgroundColor"))) === surface && (await b.ev(cs("#songMenu", "boxShadow"))) !== "none"
    && (await b.ev(cs('[data-menu="del"]', "color"))) === dangerC && !(await b.ev(sheetShown)));
  b.check("no-colored-fixed-at-top " + JSON.stringify(await b.ev(topFixed)), JSON.stringify(await b.ev(topFixed)) === "[]");
  await b.shot("menu-light"); await b.dark(true); await b.sleep(300); await b.shot("menu-dark"); await b.dark(false); await b.sleep(200);
  // 再点「⋯」关闭
  await F.tapAt(b, ...(await b.ev(center("#btnMenu")))); await b.sleep(300);
  b.check("menu-toggle-close", (await b.ev(menu)).hidden);
  // 点菜单外面（歌词上的字）只关菜单，不会打开词卡
  await F.tapAt(b, ...(await b.ev(center("#btnMenu")))); await b.sleep(300);
  await F.tapAt(b, ...(await b.ev(center('#lyrics .line[data-li="1"] .c[data-ci="0"]')))); await b.sleep(400);
  b.check("menu-outside-close", (await b.ev(menu)).hidden && !(await b.ev(sheetShown)));
  // 词卡：后面不变暗，点外面关闭（也不会顺便打开另一个字）
  await F.tapAt(b, ...(await b.ev(center('#lyrics .line[data-li="0"] .c[data-ci="2"]')))); await b.sleep(500);
  b.check("wordcard-opens", await b.ev(sheetShown) && (await b.ev(F.sheetText)).includes("风衣"));
  b.check("wordcard-no-dim", JSON.stringify(await b.ev(topFixed)) === "[]" && (await b.ev(cs("#sheet", "boxShadow"))).includes("-8px 40px"));
  await F.tapAt(b, ...(await b.ev(center('#lyrics .line[data-li="1"] .c[data-ci="0"]')))); await b.sleep(500);
  b.check("wordcard-outside-close", !(await b.ev(sheetShown)));
  // 删除确认：有拖动条，统一间距；点外面不关；往下拖关闭等于取消
  await b.ev(click("#btnMenu")); await b.sleep(300);
  await b.ev(click('[data-menu="del"]')); await b.sleep(500);
  b.check("confirm-has-grab", (await b.ev(F.sheetText)).includes("删除这首歌？") && (await b.ev(`!!document.querySelector("#sheet .grab")`)));
  // 弹窗间距（设计规范 5.6）：顶部 12 → 拖动条 → 20 → 标题 → 8 → 说明 → 24 → 按钮 → 12 → 按钮；左右 20；底部 16
  const gaps = await b.ev(`(() => { const sh = document.querySelector("#sheet").getBoundingClientRect(), R = s => document.querySelector("#sheet " + s).getBoundingClientRect();
    const g = R(".grab"), h = R("h3"), p = R("p.note"), ok = R('[data-confirm="ok"]'), no = R('[data-confirm="cancel"]'), r = Math.round;
    return [r(g.top - sh.top), r(h.top - g.bottom), r(p.top - h.bottom), r(ok.top - p.bottom), r(no.top - ok.bottom), r(ok.left - sh.left), r(sh.right - ok.right), r(sh.bottom - no.bottom)]; })()`);
  b.check("confirm-spacing " + JSON.stringify(gaps), JSON.stringify(gaps) === "[12,20,8,24,12,20,20,16]");
  await F.tapAt(b, ...(await b.ev(center('#lyrics .line[data-li="1"] .c[data-ci="0"]')))); await b.sleep(500);
  b.check("confirm-stays", await b.ev(sheetShown) && (await b.ev(`document.querySelector("#sheet").classList.contains("open")`)));
  const st = await b.ev(`(() => { const r = document.querySelector("#sheet").getBoundingClientRect(); return [r.left + r.width / 2, r.top + 10]; })()`);
  await b.touch("touchStart", st[0], st[1]); for (let i = 1; i <= 5; i++) { await b.touch("touchMove", st[0], st[1] + i * 40); await b.sleep(16); } await b.touch("touchEnd"); await b.sleep(500);
  b.check("confirm-drag-cancels", !(await b.ev(sheetShown)) && !!(await b.ev(F.idbGet("songs", "t1"))));
  await b.ev(click("#btnMenu")); await b.sleep(300);
  await b.ev(click('[data-menu="del"]')); await b.sleep(500);
  b.check("confirm-tap-outside-stays", await b.ev(sheetShown));
  await b.ev(click('[data-confirm="cancel"]')); await b.sleep(500);
  b.check("confirm-cancel", !(await b.ev(sheetShown)) && !!(await b.ev(F.idbGet("songs", "t1"))));
  // 页面滚下去以后，菜单还是在「⋯」正下方
  await b.ev("window.scrollTo(0, document.scrollingElement.scrollHeight)"); await b.sleep(300);
  await b.ev(click("#btnMenu")); await b.sleep(300);
  const ms = await b.ev(menu);
  b.check("menu-scrolled " + JSON.stringify(ms), ms.op === 1 && ms.below && ms.right && JSON.stringify(await b.ev(topFixed)) === "[]");
  await b.ev(click("#playerView [data-back]")); await b.sleep(900);
  b.check("menu-closed-after-back", (await b.ev(menu)).hidden);

  // bug 5：歌词输入框固定高度，文字不溢出
  await b.ev(click("#btnAdd")); await b.sleep(700);
  const taH = `document.querySelector("#fLyrics").getBoundingClientRect().height`;
  const h0 = await b.ev(taH);
  await b.ev(`(() => { const t = document.querySelector("#fLyrics"); t.value = Array.from({ length: 40 }, (_, i) => "第" + i + "句測試").join("\\n"); t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.sleep(100);
  const h1 = await b.ev(taH);
  const lh = await b.ev(`parseFloat(getComputedStyle(document.querySelector("#fLyrics")).lineHeight)`);
  const below = await b.ev(`document.querySelector("#lyricsInfo").getBoundingClientRect().top >= document.querySelector("#fLyrics").getBoundingClientRect().bottom`);
  b.check(`lyrics-box-fixed ${h0} ${h1} ${lh}`, Math.abs(h0 - (lh * 7 + 24)) < 1 && h1 === h0 && below
    && (await b.ev(cs("#fLyrics", "overflowY"))) === "auto" && (await b.ev(cs("#fLyrics", "clipPath"))) !== "none");
  await b.ev(click("#importView [data-back]")); await b.sleep(700);

  // bug 2：按下效果由 JS 控制（.is-pressed），不用 CSS :active；跳转前先松开；回到首页时没有按下的元素
  b.check("no-css-active", await b.ev(`![...document.styleSheets[0].cssRules].some(function walk(r) { return /:active/.test(r.selectorText || "") || [...(r.cssRules || [])].some(walk); })`));
  const tf = `getComputedStyle(document.querySelector("#btnAdd")).transform`;
  const pdown = (sel, type) => `document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new PointerEvent(${JSON.stringify(type)}, { bubbles: true, clientX: 300, clientY: 880 }))`;
  await b.ev(pdown("#btnAdd", "pointerdown")); await b.sleep(150);
  b.check("press-on-down " + (await b.ev(tf)), await b.ev(`document.querySelector("#btnAdd").classList.contains("is-pressed")`) && (await b.ev(tf)) !== "none");
  await b.ev(pdown("#btnAdd", "pointerup"));
  b.check("release-on-up", !(await b.ev(`document.querySelector("#btnAdd").classList.contains("is-pressed")`)));
  await b.ev(pdown("#btnAdd", "pointerdown")); await b.ev(pdown("#btnAdd", "pointercancel"));
  b.check("release-on-cancel", !(await b.ev(`document.querySelector("#btnAdd").classList.contains("is-pressed")`)));
  // 按着就点了跳转：跳转开始前已经松开
  await b.ev(`(() => { const e = document.querySelector("#btnAdd"); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); e.click(); window.__pressedAtNav = null;
    requestAnimationFrame(() => { window.__pressedAtNav = e.classList.contains("is-pressed"); }); })()`);
  await b.sleep(50);
  b.check("released-before-nav", (await b.ev("window.__pressedAtNav")) === false);
  await b.sleep(700);
  await b.ev(`(() => { const e = document.querySelector("#importView [data-back]"); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); e.click(); })()`);
  await b.sleep(800);
  await b.ev(`document.querySelector("#btnAdd").classList.add("is-pressed")`);
  await b.ev(`window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))`);
  b.check("home-clean-after-back", await b.ev(`!document.querySelector("#home").hidden && !document.querySelector(".is-pressed")`));

  // bug 4：导入页保存按钮不灰掉；缺东西时提示并滚到那一步；连点只存一首
  await b.ev(click("#btnAdd")); await b.sleep(700);
  b.check("save-not-disabled", (await b.ev(`document.querySelector("#btnSave").disabled`)) === false);
  await b.ev(click("#btnSave")); await b.sleep(150);
  b.check("save-missing-both " + (await b.ev(toast)), (await b.ev(toast)) === "还差：音频文件、歌词");
  await b.ev(`(() => { const t = document.querySelector("#fLyrics"); t.value = "[00:01.00]第一句測試\\n[00:03.00]第二句測試"; t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await b.ev("window.scrollTo(0, document.body.scrollHeight)"); await b.sleep(100);
  await b.ev(click("#btnSave")); await b.sleep(700);
  const audioCard = `document.querySelector("#fAudio").closest(".card")`;
  const top = await b.ev(audioCard + ".getBoundingClientRect().top");
  b.check(`save-missing-audio ${top} ${await b.ev(toast)}`, (await b.ev(toast)) === "还差：音频文件" && top >= 60 && top <= 140
    && (await b.ev(audioCard + ".classList.contains('need')")));
  await b.ev(`(() => { const dt = new DataTransfer(); dt.items.add(${F.silentWav(5, "測試.wav")}); const i = document.querySelector("#fAudio"); i.files = dt.files; i.dispatchEvent(new Event("change")); })()`);
  await b.sleep(800);
  const before = await b.ev(F.idbCount("songs"));
  await b.ev(`(() => { const s = document.querySelector("#btnSave"); s.click(); s.click(); })()`); await b.sleep(1200);
  b.check("save-once " + before + "→" + (await b.ev(F.idbCount("songs"))), (await b.ev(F.idbCount("songs"))) === before + 1 && await b.ev(`!document.querySelector("#playerView").hidden`));

  b.check("feedback: 页面没有报错", b.errors.length === 0);
} };
