// NovaTEch BD — Service Worker v3.1
// ✅ FCM Push Notification (VAPID ready)
// ✅ Offline Queue Sync
// ✅ Smart Caching

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config (SW-এর ভেতরে দরকার FCM-এর জন্য)
firebase.initializeApp({
  apiKey: "AIzaSyAHdK7zelJcBFc8fOFSgH8G_6jEjZdNoSI",
  authDomain: "novatech-bd-10421.firebaseapp.com",
  databaseURL: "https://novatech-bd-10421-default-rtdb.firebaseio.com",
  projectId: "novatech-bd-10421",
  storageBucket: "novatech-bd-10421.firebasestorage.app",
  messagingSenderId: "1098950143887",
  appId: "1:1098950143887:web:bb7014007540c878b165fa"
});

const messaging = firebase.messaging();

// ── Background FCM message handler
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'NovaTEch BD 📒';
  const options = {
    body: payload.notification?.body || 'নতুন বিজ্ঞপ্তি',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.data?.tag || 'novatech-msg',
    renotify: true,
    data: payload.data || {},
    vibrate: [200, 100, 200]
  };
  return self.registration.showNotification(title, options);
});

// ── Cache config
const CACHE = 'novatech-v3';
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
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com') || url.hostname.includes('anthropic.com') || url.hostname.includes('firebasestorage')) {
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

// ── Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const page = e.notification.data?.page || 'dash';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const match = cls.find(c => c.url.includes(self.location.origin));
      if (match) { match.focus(); match.postMessage({ type: 'NOTIFICATION_CLICK', data: { page } }); }
      else clients.openWindow('/');
    })
  );
});

// ── Background Sync
self.addEventListener('sync', e => {
  if (e.tag === 'sync-offline-sales' || e.tag === 'sync-queue') {
    e.waitUntil(
      self.clients.matchAll().then(cls =>
        cls.forEach(c => c.postMessage({ type: 'SYNC_OFFLINE_SALES' }))
      )
    );
  }
});
