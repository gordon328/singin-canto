/* 词汇包（纯函数，不碰页面和数据库）：生成提示词、导入 Claude 的回复、算一句里每个字的读音和所属的词。
   浏览器里是全局 PACK；Node 测试里 require("./pack.js")。
   规则见 docs/第二三阶段开发规格.md 第 4 节。词汇包 v3 覆盖整首歌的词，只有 key:true 的是重点词（显示下划线）。 */
(function (root) {
  "use strict";
  const HAN = /\p{Script=Han}/u;

  function fixText(song, text) {
    let t = text;
    if (song.pack) for (const f of song.pack.fix || []) if (f.from) t = t.split(f.from).join(f.to);
    return t;
  }

  // 第 li 句：每个字的读音和所属的词（items[i].word 是 words 的下标，-1 表示不在词汇包里）。
  // 先应用 fix，再长词优先匹配，最后用 overrides（手动改过的读音）。autoJp(text) 返回 [字, 粤拼|null][]
  function computeLineFor(song, li, autoJp) {
    const text = fixText(song, song.lines[li].text);
    const chars = [...text]; const auto = autoJp(text); const same = auto.length === chars.length;
    const items = chars.map((c, i) => {
      if (/\s/.test(c)) return { space: true };
      const h = HAN.test(c);
      return { ch: c, han: h, word: -1, jp: h ? (same ? auto[i][1] : autoJp(c)[0][1]) : null };
    });
    const words = song.pack ? song.pack.words : [];
    if (words.length) {
      const order = words.map((_, i) => i).sort((a, b) => [...words[b].w].length - [...words[a].w].length);
      for (const wi of order) {
        const w = words[wi], wc = [...w.w], syl = w.jp ? w.jp.split(/\s+/) : null;
        for (let i = 0; i + wc.length <= chars.length; i++) {
          if (wc.every((c, k) => chars[i + k] === c && !items[i + k].space && items[i + k].word === -1)) {
            let si = 0; wc.forEach((c, k) => { const it = items[i + k]; it.word = wi; if (syl && it.han) it.jp = syl[si++]; });
            i += wc.length - 1;
          }
        }
      }
    }
    items.forEach((it, ci) => { const o = song.overrides && song.overrides[li + ":" + ci]; if (o && !it.space) { it.jp = o; it.ov = true; } });
    return { text, items, words };
  }

  function buildPrompt(s) {
    const lyr = s.lines.map(l => l.text).join("\n");
    return `你是粤语老师。下面是一首粤语歌的歌词，只供你参考，不要在回复里重复歌词。请为普通话母语、粤语零基础的学习者整理这首歌的"词汇包"。只输出一个 JSON 代码块，不要写其他文字。

歌曲：${s.title}${s.artist ? " - " + s.artist : ""}

要求：
1. 不要输出完整歌词，也不要逐句翻译，只整理词汇。
2. words：覆盖歌词里出现的所有词，一个字都不要漏。按词切分（比如「海旁」是一个词，「好凍」拆成「好」和「凍」，由你判断），同一个词只写一次。每个词写：
   - w：词，写法和歌词里完全一致（繁体）
   - jp：粤拼（Jyutping），每个汉字一个音节，用空格分开，带声调数字 1-6，按歌里实际唱的读音
   - zh：简短的普通话意思
3. 其中最值得学的 30 到 50 个词（粤语口语字、和普通话读音差别大的字、多音字、常用词）加 "key": true，并写 tip：一句帮助记忆的提示，比如普粤读音的对应规律或用法。其他词不要写 key 和 tip。
4. 粤语口语字加 "oral": true，其他可以省略。
5. words 的顺序随意，不要按歌词顺序排列。
6. fix：歌词里明显的错别字，写成 {"from": "错的写法", "to": "正确写法"}，每处不超过 4 个字。没有就写空列表。
7. summary：用你自己的话，两三句概括这首歌讲什么。

格式示例（示例内容和这首歌无关）：
{"summary":"…","words":[{"w":"今日","jp":"gam1 jat6","zh":"今天","key":true,"tip":"粤语说今日，不说今天"},{"w":"我","jp":"ngo5","zh":"我"},{"w":"佢","jp":"keoi5","zh":"他/她","key":true,"oral":true,"tip":"最常用的粤语口语字之一"}],"fix":[]}

歌词：
${lyr}`;
  }

  // 导入 Claude 的回复。整包里只要有一个词带 key 字段就是 v3（没写 key 的不是重点词）；整包都没有 key 是旧格式，全部当重点词
  function parsePack(raw, lines) {
    const errs = [], warns = [];
    const txt = String(raw || "").trim(); const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
    if (a < 0 || b < a) return { errs: ["没找到 JSON 内容。请复制 Claude 回复里从 { 开始到 } 结束的整段。"], warns, pack: null };
    let obj;
    try { obj = JSON.parse(txt.slice(a, b + 1)); } catch (e) { return { errs: ["JSON 格式有误（" + e.message + "）。通常是没复制完整。请确认复制了整段，或者让 Claude 重新输出。"], warns, pack: null }; }
    if (!obj || !Array.isArray(obj.words)) return { errs: ["内容里缺少 words 列表。"], warns, pack: null };
    const fix = (Array.isArray(obj.fix) ? obj.fix : []).filter(f => f && typeof f.from === "string" && typeof f.to === "string" && f.from && f.from !== f.to && [...f.from].length <= 8).map(f => ({ from: f.from, to: f.to }));
    const all = lines.map(l => { let t = l.text; fix.forEach(f => t = t.split(f.from).join(f.to)); return t; }).join("\n");
    const hasKey = obj.words.some(w => w && typeof w === "object" && "key" in w);
    const byW = new Map(), words = []; let missing = 0;
    obj.words.forEach(w => {
      if (!w || typeof w.w !== "string" || !w.w.trim()) return;
      const ww = w.w.trim();
      let jp = String(w.jp || "").trim().toLowerCase().replace(/\s+/g, " ");
      const han = [...ww].filter(c => HAN.test(c)).length, syl = jp ? jp.split(" ") : [];
      if (syl.length !== han || syl.some(x => !/^[a-z]+[1-6]$/.test(x))) { warns.push(`「${ww}」的粤拼「${jp}」不对，改用自动粤拼`); jp = ""; }
      const item = { w: ww, jp, key: hasKey ? w.key === true : true, oral: !!w.oral, zh: typeof w.zh === "string" ? w.zh : "", tip: typeof w.tip === "string" ? w.tip : "" };
      const ex = byW.get(ww);
      if (ex) { // 重复的词合并进第一次出现的那个
        ex.key = ex.key || item.key; ex.oral = ex.oral || item.oral;
        for (const k of ["jp", "zh", "tip"]) if (!ex[k]) ex[k] = item[k];
        return;
      }
      byW.set(ww, item); words.push(item);
      if (!all.includes(ww)) missing++;
    });
    if (!words.length) errs.push("词汇列表是空的。");
    if (missing) warns.push(`有 ${missing} 个词在歌词里没找到（可能写法不同），它们不会显示下划线`);
    if (!hasKey && words.length > 60) warns.push("Claude 没有标出重点词，所有词都会显示下划线。可以重新复制提示词再生成一次");
    if (errs.length) return { errs, warns, pack: null };
    const pack = { v: 3, summary: typeof obj.summary === "string" ? obj.summary : "", words, fix, imported: Date.now() };
    const song = { lines, pack, overrides: {} }, noJp = t => [...t].map(c => [c, null]), uncovered = new Set();
    lines.forEach((_, li) => computeLineFor(song, li, noJp).items.forEach(it => { if (it.han && it.word === -1) uncovered.add(it.ch); }));
    if (uncovered.size) warns.push(`有 ${uncovered.size} 个字没被词汇包覆盖，读音用自动粤拼，学习时会显示"暂无释义"`);
    return { errs, warns, pack };
  }

  const PACK = { HAN, fixText, computeLineFor, buildPrompt, parsePack };
  root.PACK = PACK;
  if (typeof module !== "undefined" && module.exports) module.exports = PACK;
})(typeof self !== "undefined" ? self : globalThis);
