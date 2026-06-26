const CACHE_NAME = 'mwb-v2.2.1-theme-fix';
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
    './premium-theme.css',
    './css/variables.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/premium-theme.css',
    './js/app.js',
    './js/auth.js',
    './js/db.js',
    './js/ui.js'
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

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    const url = new URL(event.request.url);
    const isFreshAsset = url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('manifest.json') || url.pathname.endsWith('favicon.ico');

    if (isFreshAsset) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }))
            .catch(() => caches.match('./index.html'))
    );
});
