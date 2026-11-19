/* BookLens service worker — app shell only.
   Caches the static shell so the installed app opens instantly and offline.
   Never caches /api/ responses or any user data (profiles and books live in
   localStorage on the device and are never touched by this worker).
   Bump SHELL_VERSION on each release so old shells are cleaned up. */
var SHELL_VERSION = 'v3';
var CACHE = 'booklens-shell-' + SHELL_VERSION;
var SHELL = [
  '/',
  '/booklens-study-companion.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/demo/booklens-how-to-poster.jpg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () { /* best effort per file */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.pathname.indexOf('/api/') === 0) return; // never cache API
  if (req.mode === 'navigate') {
    // Network first so new deploys arrive immediately; cache is the offline fallback.
    event.respondWith(
      fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (cache) { cache.put('/', copy); });
        return resp;
      }).catch(function () {
        return caches.match('/').then(function (hit) { return hit || caches.match('/booklens-study-companion.html'); });
      })
    );
    return;
  }
  if (url.origin === self.location.origin) {
    // Stale-while-revalidate for same-origin static files.
    event.respondWith(
      caches.match(req).then(function (hit) {
        var network = fetch(req).then(function (resp) {
          if (resp && resp.ok) {
            var copy = resp.clone();
            caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
          }
          return resp;
        }).catch(function () { return hit; });
        return hit || network;
      })
    );
  }
});
