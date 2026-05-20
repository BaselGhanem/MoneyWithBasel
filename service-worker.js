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
    '/MoneyWithBasel/js/db.js'
    // تم إزالة الموارد الخارجية (tailwind, fonts) لأنها تسبب CORS
];

// تثبيت الـ Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 تخزين الملفات المحلية');
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch(err => {
            console.error('❌ فشل التخزين:', err);
        })
    );
});

// تفعيل وتنظيف الكاش القديم
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
    self.clients.claim();
});

// استراتيجية الشبكة أولاً مع الاحتفاظ بالكاش للملفات المحلية
self.addEventListener('fetch', (event) => {
    // نتعامل فقط مع طلبات GET
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // إذا كان الطلب لملف محلي (ضمن مجلد MoneyWithBasel)
    if (url.pathname.startsWith('/MoneyWithBasel/')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    // تخزين نسخة جديدة للاستخدام المستقبلي
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            }).catch(() => {
                return caches.match('/MoneyWithBasel/index.html');
            })
        );
    } else {
        // للموارد الخارجية (مثل Tailwind، Fonts) لا نتدخل، نتركها للشبكة
        event.respondWith(fetch(event.request));
    }
});
