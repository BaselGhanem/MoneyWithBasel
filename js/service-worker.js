const CACHE_NAME = 'mwb-v2';
const STATIC = [
  '/', '/index.html', '/dashboard.html', '/transactions.html',
  '/accounts.html', '/settings.html',
  '/css/variables.css', '/css/base.css', '/css/layout.css', '/css/components.css',
  '/js/app.js', '/js/auth.js', '/js/db.js', '/js/ui.js', '/js/automation.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore') || e.request.url.includes('googleapis')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || network;
    })
  );
});
