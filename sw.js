/* Service worker：让 App 没网也能打开。
   - 自己的文件（index.html 等）：先联网拿最新版，没网时用缓存
   - 粤拼库、字体：第一次下载后存起来，以后直接用缓存
   - 歌词搜索（lrclib）等其他请求：不缓存，照常联网
   每次改了要缓存的文件列表，把 VERSION 加一。 */
const VERSION = "v1";
const CACHE = "yuechang-" + VERSION;
const SHELL = ["./", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
const JYUTPING = "https://cdn.jsdelivr.net/npm/to-jyutping@3.1.1/dist/index.js";
const CDN_HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    try { await c.add(new Request(JYUTPING, { mode: "cors" })); } catch (err) { /* 下次打开时再存 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("yuechang-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req.mode === "navigate" ? "./" : req, res.clone());
        return res;
      } catch (err) {
        return (await c.match(req.mode === "navigate" ? "./" : req, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    })());
  }
});
