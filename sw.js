/* GTO 策略训练器 Service Worker：首次访问后缓存，离线可用；版本更新时自动清理旧缓存 */
const CACHE = "gto-trainer-v11";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/storage.js",
  "./js/cards.js",
  "./js/app.js",
  "./data/preflop.js",
  "./data/flop.js",
  "./data/turn.js",
  "./data/river.js",
  "./icons/icon-192.png",
  "./img/reward-wechat.jpg",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，失败时回退缓存（保证能拿到最新版本）
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 静态资源（含 data/*.js?v=N）：按完整 URL（含版本参数）缓存优先；
  // 数据更新时升版本号（POKER_DATA_VERSION / ?v=），新 URL 未命中即走网络，避免旧缓存残留
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});






