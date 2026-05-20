// ============================================================
// service-worker.js — Money with Basel | PWA Offline Support
// ============================================================

const CACHE_NAME = 'money-with-basel-v1';
const ASSETS_TO_CACHE = [
    '/MoneyWithBasel/',
    '/MoneyWithBasel/index.html',
    '/MoneyWithBasel/dashboard.html',
    '/MoneyWithBasel/transactions.html',
    '/MoneyWithBasel/accounts.html',
    '/MoneyWithBasel/settings.html',
    '/MoneyWithBasel/js/ui.js',
    '/MoneyWithBasel/js/charts.js',
    '/MoneyWithBasel/js/automation.js',
    '/MoneyWithBasel/js/db.js',
    // باقي الروابط الخارجية تبقى كما هي
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// 1. تثبيت الـ Service Worker وحفظ الموارد في الكاش
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 فتح الكاش وتخزين الملفات الأساسية');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. تفعيل الخدمة وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('🧹 حذف الكاش القديم:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. اعتراض طلبات الشبكة وتقديمها من الكاش
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // إرجاع الملف من الكاش إذا وجد، وإلا حاول جلبه من الشبكة
            return response || fetch(event.request).catch(() => {
                // في حال فشل الاتصال وعدم وجود الملف في الكاش (صفحة الـ Offline)
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
