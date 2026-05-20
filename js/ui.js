// ============================================================
// js/ui.js — Money with Basel | UI Interactions & Controllers
// ============================================================

const UI = {
    // التهيئة الأولية عند تحميل الصفحة
    init() {
        this.initTheme();
        this.initModals();
        this.initNavigation();
    },

    // 1. إدارة الثيم (الوضع الداكن والفاتح)
    initTheme() {
        const toggle = document.getElementById('theme-toggle');
        
        // التحقق من الإعدادات المحفوظة مسبقاً أو إعدادات النظام
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

        this.applyTheme(isDark);

        if (toggle) {
            toggle.checked = isDark;
            toggle.addEventListener('change', (e) => {
                this.applyTheme(e.target.checked);
                // حفظ التفضيل في LocalStorage
                localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
            });
        }
    },

    applyTheme(isDark) {
        const html = document.documentElement;
        if (isDark) {
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else {
            html.classList.remove('dark');
            html.style.colorScheme = 'light';
        }
    },

    // 2. إدارة النوافذ المنبثقة (Modals)
    initModals() {
        // الاستماع للأحداث المخصصة لفتح النوافذ (تم استخدامها في أزرار HTML)
        document.addEventListener('openAddModal', () => this.openModal('add-transaction-modal'));
        document.addEventListener('openAddAccountModal', () => this.openModal('add-account-modal'));
        
        // إغلاق النوافذ المنبثقة عند النقر على الخلفية المظلمة (خارج محتوى النافذة)
        const modals = document.querySelectorAll('.fixed.inset-0');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // إغلاق عبر زر الهروب (Escape) في لوحة المفاتيح
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modals.forEach(modal => {
                    if (modal.classList.contains('modal-visible')) {
                        this.closeModal(modal.id);
                    }
                });
            }
        });
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.replace('modal-hidden', 'modal-visible');
            // منع التمرير في الخلفية عند فتح النافذة
            document.body.style.overflow = 'hidden';
        } else {
            console.warn(`Modal with ID "${modalId}" not found.`);
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.replace('modal-visible', 'modal-hidden');
            // إعادة تفعيل التمرير في الخلفية
            document.body.style.overflow = '';
        }
    },

    // 3. إدارة شريط التنقل السفلي (Bottom Navigation)
    initNavigation() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('nav a');
        
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            if (linkPath === currentPath) {
                // تفعيل الأيقونة واللون للصفحة الحالية
                link.classList.remove('text-on-surface-variant');
                link.classList.add('text-primary');
                const icon = link.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.style.fontVariationSettings = "'FILL' 1"; // جعل الأيقونة ممتلئة
                }
            }
        });
    },

    // 4. دوال مساعدة (Utilities)

    // تنسيق الأرقام كعملة نقدية
    formatCurrency(amount, currencyCode = 'JOD') {
        const formatter = new Intl.NumberFormat('ar-JO', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return formatter.format(amount);
    },

    // إظهار إشعارات للمستخدم (Toasts)
    showToast(message, type = 'success') {
        // مسح أي Toast سابق لتجنب التكدس
        const existingToast = document.getElementById('app-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.id = 'app-toast';
        
        // اختيار الألوان بناءً على نوع الإشعار
        const bgColor = type === 'success' ? 'bg-success' : (type === 'error' ? 'bg-error' : 'bg-primary');
        
        toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white font-bold text-sm z-[100] transition-all duration-300 translate-y-[-150%] opacity-0 shadow-lg flex items-center gap-2 ${bgColor}`;
        
        // إضافة أيقونة بناءً على النوع
        const iconName = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');
        toast.innerHTML = `<span class="material-symbols-outlined text-[20px]">${iconName}</span> ${message}`;
        
        document.body.appendChild(toast);

        // تحريك النافذة للظهور (Animation in)
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-[-150%]', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        // إخفاء النافذة بعد 3 ثوانٍ (Animation out)
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-[-150%]', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// تشغيل التهيئة عند اكتمال تحميل هيكل الصفحة (DOM)
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
