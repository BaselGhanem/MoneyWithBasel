// ui.js — Money with Basel
// Global UI helpers used across all pages

// Suppress Tailwind CDN production warning
(function() {
  const originalWarn = console.warn;
  console.warn = function(...args) {
    if (args && args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
    originalWarn.apply(console, args);
  };
})();

const DEFAULT_CURRENCY = 'JOD';
const CURRENCY_LABELS = { JOD: 'JOD', USD: 'USD', EUR: 'EUR' };

function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  localStorage.setItem('theme', theme);
}

function getCurrency() {
  return localStorage.getItem('currency') || DEFAULT_CURRENCY;
}

function setCurrency(currency) {
  localStorage.setItem('currency', CURRENCY_LABELS[currency] ? currency : DEFAULT_CURRENCY);
  updateCurrencyUnits();
}

function updateCurrencyUnits() {
  document.querySelectorAll('.currency-unit').forEach(el => {
    el.textContent = getCurrency();
  });
}

function showToast(message, type = 'default') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  const bg = type === 'error' ? '#ff4444' : type === 'success' ? '#39FF14' : '#28283e';
  const color = (type === 'success') ? '#0a0a12' : '#e8e0f0';
  toast.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:${bg};color:${color};padding:12px 24px;border-radius:9999px;
    font-family:Almarai,sans-serif;font-size:14px;font-weight:700;z-index:999;
    box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;
    animation:toastIn 0.3s ease;`;
  toast.className = 'toast';
  toast.textContent = message;
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function formatCurrency(n, visible = true) {
  if (!visible) return '••••••';
  return Number(n).toLocaleString('en-JO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateOrTimestamp) {
  const d = dateOrTimestamp?.toDate ? dateOrTimestamp.toDate() : new Date(dateOrTimestamp);
  return d.toLocaleDateString('ar-JO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function setLoading(show) {
  let el = document.getElementById('global-loader');
  if (!el && show) {
    el = document.createElement('div');
    el.id = 'global-loader';
    el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:3px;background:linear-gradient(90deg,#ff2d78,#39FF14);z-index:9999;animation:loadBar 1s ease infinite;';
    const s = document.createElement('style');
    s.textContent = '@keyframes loadBar{0%{transform:scaleX(0);transform-origin:left}50%{transform:scaleX(0.7);transform-origin:left}100%{transform:scaleX(1);transform-origin:left;opacity:0}}';
    document.head.appendChild(s);
    document.body.appendChild(el);
  } else if (el && !show) {
    el.remove();
  }
}

function getAvatar(uid, fallback) {
  return localStorage.getItem(`user_avatar_${uid}`) || fallback;
}

function signOut() {
  if (!confirm('هل تريد تسجيل الخروج؟')) return;
  auth.signOut().then(() => window.location.href = 'index.html');
}

// Override app.js showToast to use this one
window.showToast = showToast;
window.UI = { initTheme, setTheme, getCurrency, setCurrency, updateCurrencyUnits, showToast, formatCurrency, formatDate, setLoading, getAvatar, signOut };
initTheme();
