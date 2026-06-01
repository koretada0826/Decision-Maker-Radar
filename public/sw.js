// Service Worker：決裁者レーダー
// - 静的アセット（HTML/JS/CSS/画像）は stale-while-revalidate
// - APIコール（/api/*）は network only（キャッシュしない）
// - オフライン時は直近の HTML を返す

const CACHE_NAME = "kr-static-v1";
const PRECACHE_URLS = ["/search", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 同一オリジン以外はそのまま
  if (url.origin !== self.location.origin) return;

  // API は常にネットワーク（キャッシュしない）
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
    return;
  }

  // Next.js のコードチャンクと静的アセット：cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            return res;
          }),
      ),
    );
    return;
  }

  // それ以外（HTML 等）：network first → fail なら cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        return res;
      })
      .catch(() =>
        caches.match(req).then(
          (cached) =>
            cached ||
            caches.match("/search") ||
            new Response("オフラインです", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        ),
      ),
  );
});
