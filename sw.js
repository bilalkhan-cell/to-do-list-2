// Bump this whenever any cached file below changes, so returning users
// get the update instead of a stale cache.
var CACHE_NAME = 'daybook-cache-v1';

var CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(CORE_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Cache-first for same-origin app files (instant, works offline);
// network-first for everything else (e.g. Google Fonts), falling back
// to cache if the network is unavailable.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var isSameOrigin = new URL(req.url).origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          return res;
        });
      }).catch(function () { return caches.match('./index.html'); })
    );
  } else {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
  }
});
