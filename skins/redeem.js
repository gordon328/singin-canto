/* 兑换码（纯函数）。浏览器里是全局 REDEEM；Node 里 require("./skins/redeem.js")。规则见开发规格 7.10.4。
   兑换码原文绝不进仓库：skins/codes.js 只存哈希（SHA-256，算之前先 normalize）。用户输入的码在这里算一次哈希再比对。 */
(function (root) {
  "use strict";
  // 去掉容易混淆的 0/O/1/I
  const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const MESSAGES = {
    invalid: "兑换码无效，请检查后重试",
    used: "这个兑换码已经用过了",
    owned: "这些皮肤你已经拥有了",
    devOn: "开发者模式已经开着了",
    empty: "请输入兑换码",
  };
  const cryptoObj = () => root.crypto || require("crypto").webcrypto;

  // 转大写，去掉空格和连字符
  const normalize = s => String(s || "").toUpperCase().replace(/[\s-]/g, "");

  async function sha256(text) {
    const buf = await cryptoObj().subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // CANTO-XXXX-XXXX-XXXX：12 个随机字符，32 选 1，约 60 位随机数，没法穷举
  function generate() {
    const r = cryptoObj().getRandomValues(new Uint8Array(12));
    const s = [...r].map(x => ALPHABET[x % ALPHABET.length]).join("");
    return `CANTO-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
  }

  const find = (codes, hash) => (codes || []).find(c => c && c.hash === hash) || null;

  // 能不能兑换：state = { unlocked, devMode, redeemed: [哈希], skinIds }。
  // 有新东西可给就 ok（用过的「全部皮肤」码，以后加了新皮肤还能再领；关掉的开发者模式能再打开）；
  // 没有新东西：这台设备用过 → used；皮肤都有了 → owned；开发者模式已经开着 → devOn
  function plan(entry, { unlocked = [], devMode = false, redeemed = [], skinIds = [] }) {
    if (!entry) return { status: "invalid", skins: [], dev: false };
    const rw = entry.rewards || [];
    const skins = [...new Set(rw.flatMap(r => (r === "skin:*" ? skinIds : r.startsWith("skin:") && skinIds.includes(r.slice(5)) ? [r.slice(5)] : [])))];
    const fresh = skins.filter(id => !unlocked.includes(id)), dev = rw.includes("dev") && !devMode;
    if (fresh.length || dev) return { status: "ok", skins: skinIds.filter(id => fresh.includes(id)), dev };
    if (redeemed.includes(entry.hash)) return { status: "used", skins: [], dev: false };
    return { status: rw.includes("dev") && !skins.length ? "devOn" : "owned", skins: [], dev: false };
  }

  const REDEEM = { ALPHABET, MESSAGES, normalize, sha256, generate, find, plan };
  root.REDEEM = REDEEM;
  if (typeof module !== "undefined" && module.exports) module.exports = REDEEM;
})(typeof self !== "undefined" ? self : globalThis);
