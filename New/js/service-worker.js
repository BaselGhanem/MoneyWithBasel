const CACHE_NAME = 'mwb-3.0.0-world-class-20260626';
const STATIC = [
    './',
    './index.html',
    './dashboard.html',
    './transactions.html',
    './accounts.html',
    './settings.html',
    './account-details.html',
    './manifest.json',
    './favicon.ico',
    './assets/icon-192.svg',
    './assets/icon-512.svg',
    './css/variables.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/product-upgrade.css',
    './js/app.js',
    './js/auth.js',
    './js/db.js',
    './js/ui.js',
    './js/automation.js',
    './js/charts.js',
    './js/product-upgrade.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.allSettled(STATIC.map(url => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.pathname.includes('/__/auth/') || requestUrl.pathname.includes('firebase')) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            const network = fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                }
                return response;
            }).catch(() => cached || caches.match('./index.html'));
            return cached || network;
        })
    );
});
