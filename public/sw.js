// Service Worker：決裁者レーダー
// - install で失敗してSW死亡を避けるため allSettled で個別put
// - HTML は network only（認証コンテンツのキャッシュで情報漏洩を防止）
// - 静的アセットのみ cache first
// - API は常にネットワーク

const CACHE_VERSION = "kr-v3";
const CACHE_NAME = `${CACHE_VERSION}-static`;
const PRECACHE_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // All-or-nothing 失敗を防ぐため個別 put
      await Promise.allSettled(
        PRECACHE_URLS.map(async (u) => {
          try {
            const res = await fetch(u, { cache: "no-cache" });
            if (res.ok) await cache.put(u, res);
          } catch {}
        }),
      );
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // API は常にネットワーク（キャッシュしない）
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).catch(() => new Response("", { status: 503 })),
    );
    return;
  }

  // 静的アセットは cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((c) => c.put(req, clone));
              }
              return res;
            })
            .catch(() => new Response("", { status: 503 })),
      ),
    );
    return;
  }

  // HTMLは network only（認証コンテンツの誤キャッシュで情報漏洩を防ぐ）
  // オフライン時のみ最低限のフォールバック
  event.respondWith(
    fetch(req).catch(
      () =>
        new Response(
          "<!doctype html><meta charset='utf-8'><body style='font-family:sans-serif;padding:2rem;text-align:center'>オフラインです。ネットワーク接続を確認してください。</body>",
          {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        ),
    ),
  );
});
