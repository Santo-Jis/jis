// NovaTEch BD — Service Worker v3.2
// ✅ Spark plan compatible — No FCM needed
// ✅ Browser Push Notification
// ✅ Offline Sync

const CACHE = 'novatech-v4';
const STATIC = ['/', '/index.html', '/styles.css', '/app.js', '/analytics.js', '/features.js', '/manifest.json'];
const FONT_CACHE = 'novatech-fonts';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(cache => cache.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; });
    })));
    return;
  }
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com') ||
      url.hostname.includes('anthropic.com') || url.hostname.includes('cloudinary.com')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  if (STATIC.some(s => url.pathname === s || url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
    e.respondWith(caches.open(CACHE).then(cache => cache.match(e.request).then(cached => {
      const fp = fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; });
      return cached || fp;
    })));
    return;
  }
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(c => c || caches.match('/index.html'))));
});

// ✅ Browser Push Notification handler
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title: 'NovaTEch BD', body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(payload.title || 'NovaTEch BD 📒', {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag || 'novatech',
    renotify: true,
    data: payload.data || {},
    vibrate: [200, 100, 200]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const match = cls.find(c => c.url.includes(self.location.origin));
      if (match) { match.focus(); match.postMessage({ type: 'NOTIFICATION_CLICK', data: e.notification.data }); }
      else clients.openWindow('/');
    })
  );
});

// ✅ Background Sync
self.addEventListener('sync', e => {
  if (e.tag === 'sync-offline-sales') {
    e.waitUntil(self.clients.matchAll().then(cls =>
      cls.forEach(c => c.postMessage({ type: 'SYNC_OFFLINE_SALES' }))
    ));
  }
});
