// 「添加到主屏幕」教程截图（v0.41，给开发者看，存在 tests/browser/out/a2hs/）：440×956、375×667，浅色、深色，每一步一张；
// 顺便检查没有横向滚动、截图不超出弹窗、整个教程不用上下滚动
const fs = require("fs"), path = require("path");
const F = require("./fixtures.js");
const OUT = path.join(__dirname, "out/a2hs");
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

module.exports = { name: "a2hsshots", async run(b) {
  fs.mkdirSync(OUT, { recursive: true });
  const shot = async name => fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from((await b.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
  await F.seed(b);
  await b.send("Emulation.setUserAgentOverride", { userAgent: IPHONE, platform: "iPhone" });
  for (const [w, h] of [[440, 956], [375, 667]]) for (const [mode, dark] of [["light", false], ["dark", true]]) {
    await b.viewport(w, h); await b.dark(dark);
    await b.ev(`localStorage.removeItem("yc-prefs")`); await b.nav("/"); await b.sleep(1200);
    await b.ev(`Promise.all([...document.querySelectorAll("#sheetBody .a2-shot img")].map(i => i.decode()))`); await b.sleep(300);
    for (let i = 0; i < 3; i++) {
      if (i) { await b.ev(`document.querySelector("#sheetBody [data-a2='go']").click()`); await b.sleep(700); }
      await shot(`${mode}-${w}x${h}-step${i + 1}`);
      const m = await b.ev(`(() => { const sh = document.querySelector("#sheet"), st = document.querySelectorAll("#sheetBody .a2-step")[${i}], img = st.querySelector(".a2-stage img").getBoundingClientRect(), s = st.getBoundingClientRect();
        return { pageX: document.documentElement.scrollWidth <= innerWidth, sheetX: sh.scrollWidth <= sh.clientWidth, inStep: img.left >= s.left - 0.5 && img.right <= s.right + 0.5, imgH: Math.round(img.height), imgW: Math.round(img.width), stageH: Math.round(st.querySelector(".a2-stage").getBoundingClientRect().height), goTop: Math.round(document.querySelector("#sheetBody [data-a2='go']").getBoundingClientRect().top),
          sheetScroll: sh.scrollHeight - sh.clientHeight }; })()`);
      b.check(`${mode}-${w}x${h}-step${i + 1} ` + JSON.stringify(m), m.pageX && m.sheetX && m.inStep && m.sheetScroll <= 1);
    }
  }
  await b.dark(false); await b.send("Emulation.setUserAgentOverride", { userAgent: "" });
  // 总览：每个尺寸一张（浅色一行、深色一行）
  for (const size of ["440x956", "375x667"]) {
    const rows = ["light", "dark"].map(m => [1, 2, 3].map(i => [m + " · 第 " + i + " 步", fs.readFileSync(path.join(OUT, m + "-" + size + "-step" + i + ".png")).toString("base64")]));
    await b.viewport(1500, size === "440x956" ? 2200 : 1800); await b.send("Page.navigate", { url: "http://localhost:8080/__blank" }); await b.sleep(300);
    await b.ev(`(async () => { const rows = ${JSON.stringify(rows)}; document.body.style.cssText = "margin:0;padding:16px;background:#888;font:14px -apple-system,sans-serif;color:#fff";
      document.body.innerHTML = rows.map(r => '<div style="display:flex;gap:16px;margin-bottom:12px">' + r.map(([t, d]) => '<figure style="margin:0;text-align:center;flex:1"><img src="data:image/png;base64,' + d + '" style="width:100%;display:block;border-radius:8px"><figcaption>' + t + '</figcaption></figure>').join("") + '</div>').join("");
      await Promise.all([...document.images].map(i => i.decode())); return true; })()`);
    await shot("sheet-" + size);
  }
  b.check("no-errors", b.errors.length === 0);
} };
