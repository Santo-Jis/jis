// NovaTEch BD — Optimized Service Worker v2.0
const CACHE = 'novatech-v2';
const STATIC = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/analytics.js',
  '/manifest.json',
];
const FONT_CACHE = 'novatech-fonts';
const API_CACHE  = 'novatech-api';

// ── Install: সব static file cache করি
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// ── Activate: পুরনো cache মুছি
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE && k !== API_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Smart caching strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Google Fonts — Cache first (চিরকাল)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; });
        })
      )
    );
    return;
  }

  // Firebase API — Network first, cache fallback (real-time data)
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Static files (HTML, CSS, JS) — Cache first, update in background
  if (STATIC.some(s => url.pathname === s || url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Default: Network with offline fallback
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(cached => cached || caches.match('/index.html'))
    )
  );
});

// ── Background sync for offline queue
self.addEventListener('sync', e => {
  if (e.tag === 'sync-queue') {
    e.waitUntil(self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'SYNC_QUEUE' }))
    ));
  }
});
