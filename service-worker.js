const CACHE_NAME = 'mwb-v1';
const BASE = '/MoneyWithBasel';
const STATIC = [
    BASE + '/',
    BASE + '/index.html',
    BASE + '/dashboard.html',
    BASE + '/transactions.html',
    BASE + '/accounts.html',
    BASE + '/settings.html',
    BASE + '/manifest.json',
    BASE + '/css/variables.css',
    BASE + '/css/base.css',
    BASE + '/css/layout.css',
    BASE + '/css/components.css',
    BASE + '/js/app.js',
    BASE + '/js/auth.js',
    BASE + '/js/db.js',
    BASE + '/js/ui.js',
    BASE + '/js/automation.js'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
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
    const url = new URL(e.request.url);

    // موارد خارجية (Firebase, Tailwind, Fonts) → شبكة فقط
    if (!url.pathname.startsWith(BASE)) {
        return;
    }

    // ملفات محلية → Cache first, fallback network
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (res.ok) {
                    caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
                }
                return res;
            });
        }).catch(() => caches.match(BASE + '/index.html'))
    );
});
