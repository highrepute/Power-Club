const CACHE_NAME = 'power-club-v1';

// Just the shell. Session data comes from the Apps Script endpoint and is
// deliberately never cached, so the app always shows the real sheet.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Anything off this origin (the Apps Script call, Google Fonts) goes straight
  // to the network, untouched. Caching the sheet data would show stale logs.
  if (new URL(req.url).origin !== self.location.origin) return;

  // Network-first so a new deploy is picked up, falling back to the cached
  // shell when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((cached) => cached || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
