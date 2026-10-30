/* Service worker：让 App 没网也能打开。
   - 自己的文件（index.html、粤拼库、字体等）：先联网拿最新版，没网时用缓存
   - 标准发音录音（audio/）：内容不会变，先用缓存，没有再联网下载并存起来。单独一个缓存，换版本不删
   - 歌词搜索（lrclib）等其他网站的请求：不缓存，照常联网
   每次改了要缓存的文件列表，把 VERSION 加一。 */
const VERSION = "v27";
const CACHE = "yuechang-" + VERSION;
const VOICE_CACHE = "voice-hiujin-1";
const SHELL = ["./", "./pack.js", "./srs.js", "./study.js", "./checkin.js", "./lessons.js", "./proof.js", "./gesture.js", "./backup.js", "./voice.js", "./vendor/to-jyutping.js", "./fonts/outfit-500.woff2", "./fonts/outfit-600.woff2", "./fonts/outfit-700.woff2", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

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
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.includes("/audio/")) {
    e.respondWith((async () => {
      const c = await caches.open(VOICE_CACHE), hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    })());
    return;
  }
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
