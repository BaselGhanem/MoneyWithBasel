// ============================================================
// app.js — Money with Basel | Main Controller
// ============================================================

const app = {
    // حالة المستخدم الحالية
    user: null,
    
    // تهيئة التطبيق عند تحميل الصفحة
    init: function() {
        console.log("🚀 Money with Basel: Initializing...");
        
        // تسجيل الـ Service Worker للـ PWA
        this.registerServiceWorker();
        
        // مراقبة حالة تسجيل الدخول
        this.listenToAuth();
    },

    // تسجيل الخدمة الخلفية (لجعل التطبيق يعمل أوفلاين)
    registerServiceWorker: function() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(() => console.log('✅ Service Worker registered'))
                    .catch(err => console.error('❌ Service Worker Error:', err));
            });
        }
    },

    // مراقبة حالة المستخدم (مهم جداً للتحكم في الشاشات)
    listenToAuth: function() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log("👤 User logged in:", user.email);
                this.user = user;
                // عند تسجيل الدخول، قم بإخفاء شاشة Auth وإظهار شاشة التطبيق
                this.toggleScreens(true);
                // استدعاء دالة لتحميل البيانات (من db.js أو ui.js)
                if (typeof loadDashboard === 'function') {
                    loadDashboard(user);
                }
            } else {
                console.log("👋 User logged out");
                this.user = null;
                this.toggleScreens(false);
            }
        });
    },

    // التبديل بين شاشة تسجيل الدخول وشاشة التطبيق
    toggleScreens: function(isLoggedIn) {
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        
        if (isLoggedIn) {
            if (authScreen) authScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');
        } else {
            if (authScreen) authScreen.classList.remove('hidden');
            if (appScreen) appScreen.classList.add('hidden');
        }
    }
};

// تشغيل التطبيق عند جاهزية المتصفح
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
