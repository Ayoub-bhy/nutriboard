const CACHE = "nutriboard-v2";
const ASSETS = ["./", "./index.html", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // cross-origin (fonts, chart.js, google, weather) → network
  if (e.request.mode === "navigate") { // network-first for the page so updates show immediately
    e.respondWith(fetch(e.request).then(resp => { const cp = resp.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return resp; }).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return resp; })));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(cl => { for (const c of cl) { if ("focus" in c) return c.focus(); } if (clients.openWindow) return clients.openWindow("./"); }));
});
