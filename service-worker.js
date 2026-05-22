const CACHE_NAME = 'mwb-v2';
const STATIC = [
    './',
    './index.html',
    './dashboard.html',
    './transactions.html',
    './accounts.html',
    './settings.html',
    './account-details.html',
    './manifest.json',
    './css/variables.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './js/app.js',
    './js/auth.js',
    './js/db.js',
    './js/ui.js',
    './js/automation.js'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => {
            // Use map to attempt adding each file individually so one 404 doesn't break everything
            return Promise.allSettled(STATIC.map(url => c.add(url)));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;

    // Ignore external requests (Firebase, CDNs)
    if (!e.request.url.startsWith(self.location.origin)) return;

    // ملفات محلية → Cache first, fallback network
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // IMPORTANT: Clone the response. A response is a stream
                // and can only be consumed once. We must consume the clone
                // to put it into the cache and return the original to the browser.
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(e.request, responseToCache);
                });
                return response;
            });
        }).catch(() => caches.match('./index.html'))
    );
});
