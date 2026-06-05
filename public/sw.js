const CACHE_NAME = "ruumly-v5";
const PRECACHE_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // NEVER cache API responses — they must always be fresh
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/api")) return;

  // Don't cache OAuth redirects
  if (url.pathname.startsWith("/~oauth")) return;

  // Don't cache Hangfire dashboard
  if (url.pathname.startsWith("/hangfire")) return;

  // Don't cache health checks
  if (url.pathname === "/health") return;

  // Only cache same-origin static assets (JS, CSS, images, fonts)
  if (url.origin !== self.location.origin) return;

  // Use stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed. Return cached if available, otherwise a synthetic offline response.
          if (cached) return cached;
          return new Response("Offline — content not cached.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        });
      return cached || fetched;
    })
  );
});
