/* Service worker：让 App 没网也能打开。
   - 自己的文件（index.html、粤拼库、字体等）：先联网拿最新版，没网时用缓存
   - 歌词搜索（lrclib）等其他网站的请求：不缓存，照常联网
   每次改了要缓存的文件列表，把 VERSION 加一。 */
const VERSION = "v11";
const CACHE = "yuechang-" + VERSION;
const SHELL = ["./", "./srs.js", "./lessons.js", "./proof.js", "./gesture.js", "./vendor/to-jyutping.js", "./fonts/outfit-500.woff2", "./fonts/outfit-600.woff2", "./fonts/outfit-700.woff2", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
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
  if (new URL(req.url).origin !== location.origin) return;
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
});
