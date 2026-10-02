/* Daybreak offline copy. Network first, saved copy only when offline.
   This file never needs a version bump: new app versions arrive through index.html. */
const CACHE = "daybreak-offline";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/* Same-site GET only (the weather request goes straight to the network and is never saved). */
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const net = fetch(r).then((res) => { if (res && res.ok) c.put(r, res.clone()); return res; });
    net.catch(() => {});
    try {
      return await Promise.race([net, new Promise((_, rej) => setTimeout(rej, 4000))]);
    } catch {
      const hit = await c.match(r, { ignoreSearch: true });
      if (hit) return hit;
      try { return await net; } catch { return (r.mode === "navigate" ? await c.match("index.html") : undefined) || Response.error(); }
    }
  })());
});
