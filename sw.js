// JoinUp Service Worker — network-first 策略，支援離線 fallback
const CACHE = "joinup-v2-" + "20260428";
const CORE = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(()=>{});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});
