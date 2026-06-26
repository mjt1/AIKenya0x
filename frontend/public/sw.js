/*
 * Suluhu service worker — Tier A offline support (US-15).
 *
 * Network-first with a cache fallback: online behaviour is unchanged, but a
 * warm app keeps working offline by serving already-visited pages and
 * previously-fetched API GETs from the cache. Writes (POST/PATCH/DELETE) are
 * never cached — offline writes go through the app's IndexedDB sync queue.
 */
const CACHE = "suluhu-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache writes

  const url = new URL(req.url);
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (
          res &&
          res.status === 200 &&
          (res.type === "basic" || res.type === "cors")
        ) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const shell = await caches.match("/queue");
          if (shell) return shell;
        }
        throw err;
      }
    })(),
  );
});
