// ui.js — Money with Basel
// Global UI helpers used across all pages

// Suppress Tailwind CDN production warning
(function () {
  const originalWarn = console.warn;
  console.warn = function (...args) {
    if (args && args[0] && typeof args[0] === `string` && args[0].includes(`cdn.tailwindcss.com`)) return;
    originalWarn.apply(console, args);
  };
})();

const DEFAULT_CURRENCY = `JOD`;
const CURRENCY_LABELS = { JOD: `JOD`, USD: `USD`, EUR: `EUR` };
const APP_VERSION = `2.2.1`; // غير هذا الرقم يدوياً لتصفير الكاش عند المستخدمين
const DEFAULT_PRIMARY_COLOR = `#099999`;
const DEFAULT_DARK_TEXT_COLOR = `#e8e0f0`;
const DEFAULT_LIGHT_TEXT_COLOR = `#111827`;
const COLOR_PRESETS = [`#099999`, `#0f766e`, `#2563eb`, `#7c3aed`, `#d81b60`, `#f97316`, `#111827`];

function sanitizeHexColor(value, fallback) {
  const raw = String(value || ``).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return fallback;
}

function hexToRgb(hex) {
  const clean = sanitizeHexColor(hex, DEFAULT_PRIMARY_COLOR).replace(`#`, ``);
  const num = parseInt(clean, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function getStoredTheme() {
  return localStorage.getItem(`theme`) === `light` ? `light` : `dark`;
}

function getDefaultTextColor(theme = getStoredTheme()) {
  return theme === `light` ? DEFAULT_LIGHT_TEXT_COLOR : DEFAULT_DARK_TEXT_COLOR;
}

function getPrimaryColor() {
  return sanitizeHexColor(localStorage.getItem(`mwb_primary_color`), DEFAULT_PRIMARY_COLOR);
}

function getTextColor() {
  return sanitizeHexColor(localStorage.getItem(`mwb_text_color`), getDefaultTextColor());
}

function getAppearancePreferences() {
  const theme = getStoredTheme();
  return {
    theme,
    currency: getCurrency(),
    primaryColor: getPrimaryColor(),
    textColor: getTextColor()
  };
}

function applyAppearancePreferences(preferences = {}) {
  const root = document.documentElement;
  const theme = preferences.theme === `light` ? `light` : getStoredTheme();
  const primaryColor = sanitizeHexColor(preferences.primaryColor || localStorage.getItem(`mwb_primary_color`), DEFAULT_PRIMARY_COLOR);
  const textColor = sanitizeHexColor(preferences.textColor || localStorage.getItem(`mwb_text_color`), getDefaultTextColor(theme));

  root.classList.toggle(`dark`, theme === `dark`);
  root.classList.toggle(`light`, theme === `light`);
  root.style.setProperty(`--user-primary`, primaryColor);
  root.style.setProperty(`--user-primary-rgb`, hexToRgb(primaryColor));
  root.style.setProperty(`--user-font-color`, textColor);

  const metaTheme = document.querySelector(`meta[name="theme-color"]`);
  if (metaTheme) metaTheme.setAttribute(`content`, theme === `light` ? `#f6f8fa` : `#020205`);
}

async function checkVersion() {
  const lastVersion = localStorage.getItem(`mwb_app_version`);
  if (lastVersion && lastVersion !== APP_VERSION) {
    console.log(`New version detected, clearing cache...`);
    if (`caches` in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if (`serviceWorker` in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    localStorage.setItem(`mwb_app_version`, APP_VERSION);
    window.location.reload();
  }
  localStorage.setItem(`mwb_app_version`, APP_VERSION);

  document.addEventListener(`DOMContentLoaded`, () => {
    const el = document.getElementById(`app-version-display`);
    if (el) el.textContent = `الإصدار ${APP_VERSION}`;
  });
}

function initTheme() {
  applyAppearancePreferences(getAppearancePreferences());
  checkVersion();
}

function setTheme(theme) {
  const safeTheme = theme === `light` ? `light` : `dark`;
  localStorage.setItem(`theme`, safeTheme);
  if (!localStorage.getItem(`mwb_text_color`)) {
    document.documentElement.style.setProperty(`--user-font-color`, getDefaultTextColor(safeTheme));
  }
  applyAppearancePreferences({ ...getAppearancePreferences(), theme: safeTheme });
}

function setPrimaryColor(color, persist = true) {
  const safe = sanitizeHexColor(color, DEFAULT_PRIMARY_COLOR);
  if (persist) localStorage.setItem(`mwb_primary_color`, safe);
  applyAppearancePreferences({ ...getAppearancePreferences(), primaryColor: safe });
  return safe;
}

function setTextColor(color, persist = true) {
  const safe = sanitizeHexColor(color, getDefaultTextColor());
  if (persist) localStorage.setItem(`mwb_text_color`, safe);
  applyAppearancePreferences({ ...getAppearancePreferences(), textColor: safe });
  return safe;
}

function resetAppearancePreferences() {
  localStorage.removeItem(`mwb_primary_color`);
  localStorage.removeItem(`mwb_text_color`);
  applyAppearancePreferences(getAppearancePreferences());
}

async function saveUserPreferences(uid) {
  if (!uid || !window.DB || typeof DB.updateUserPreferences !== `function`) return false;
  const preferences = getAppearancePreferences();
  await DB.updateUserPreferences(uid, preferences);
  return true;
}

async function loadUserPreferences(uid) {
  if (!uid || !window.DB || typeof DB.getUserProfile !== `function`) {
    applyAppearancePreferences(getAppearancePreferences());
    return getAppearancePreferences();
  }

  try {
    const profile = await DB.getUserProfile(uid);
    const prefs = profile?.preferences || {};
    if (prefs.theme === `dark` || prefs.theme === `light`) localStorage.setItem(`theme`, prefs.theme);
    if (CURRENCY_LABELS[prefs.currency]) localStorage.setItem(`currency`, prefs.currency);
    if (prefs.primaryColor) localStorage.setItem(`mwb_primary_color`, sanitizeHexColor(prefs.primaryColor, DEFAULT_PRIMARY_COLOR));
    if (prefs.textColor) localStorage.setItem(`mwb_text_color`, sanitizeHexColor(prefs.textColor, getDefaultTextColor(prefs.theme)));
    applyAppearancePreferences(getAppearancePreferences());
    updateCurrencyUnits();
    return getAppearancePreferences();
  } catch (error) {
    console.warn(`Could not load user preferences`, error);
    applyAppearancePreferences(getAppearancePreferences());
    return getAppearancePreferences();
  }
}

function getCurrency() {
  return localStorage.getItem(`currency`) || DEFAULT_CURRENCY;
}

function setCurrency(currency) {
  localStorage.setItem(`currency`, CURRENCY_LABELS[currency] ? currency : DEFAULT_CURRENCY);
  updateCurrencyUnits();
}

function updateCurrencyUnits() {
  document.querySelectorAll(`.currency-unit`).forEach(el => {
    el.textContent = getCurrency();
  });
}

function showToast(message, type = `default`) {
  const existing = document.querySelector(`.toast`);
  if (existing) existing.remove();

  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue(`--user-primary`).trim() || DEFAULT_PRIMARY_COLOR;
  const text = styles.getPropertyValue(`--mwb-text-main`).trim() || `#e8e0f0`;
  const surface = styles.getPropertyValue(`--mwb-bg-surface-solid`).trim() || `#28283e`;
  const bg = type === `error` ? `#ef4444` : type === `success` ? primary : surface;
  const color = type === `success` ? `#ffffff` : text;

  const toast = document.createElement(`div`);
  toast.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:${bg};color:${color};padding:12px 24px;border-radius:9999px;
    font-family:Almarai,sans-serif;font-size:14px;font-weight:800;z-index:9999;
    box-shadow:0 16px 40px rgba(0,0,0,0.22);white-space:nowrap;
    border:1px solid rgba(255,255,255,0.12);animation:toastIn 0.3s ease;`;
  toast.className = `toast`;
  toast.textContent = message;

  if (!document.getElementById(`toast-style`)) {
    const s = document.createElement(`style`);
    s.id = `toast-style`;
    s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = `0`;
    toast.style.transition = `opacity 0.3s`;
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatCurrency(n, visible = true) {
  if (!visible) return `••••••`;
  return Number(n).toLocaleString(`en-JO`, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateOrTimestamp) {
  const d = dateOrTimestamp?.toDate ? dateOrTimestamp.toDate() : new Date(dateOrTimestamp);
  return d.toLocaleDateString(`ar-JO`, { year: `numeric`, month: `short`, day: `numeric` });
}

function setLoading(show) {
  let el = document.getElementById(`global-loader`);
  if (!el && show) {
    el = document.createElement(`div`);
    el.id = `global-loader`;
    el.style.cssText = `position:fixed;top:0;left:0;width:100%;height:3px;background:var(--color-primary-gradient);z-index:9999;animation:loadBar 1s ease infinite;`;
    const s = document.createElement(`style`);
    s.textContent = `@keyframes loadBar{0%{transform:scaleX(0);transform-origin:left}50%{transform:scaleX(0.7);transform-origin:left}100%{transform:scaleX(1);transform-origin:left;opacity:0}}`;
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
  if (!confirm(`هل تريد تسجيل الخروج؟`)) return;
  auth.signOut().then(() => window.location.href = `index.html`);
}

window.showToast = showToast;
window.UI = {
  initTheme,
  setTheme,
  getCurrency,
  setCurrency,
  updateCurrencyUnits,
  showToast,
  formatCurrency,
  formatDate,
  setLoading,
  getAvatar,
  signOut,
  APP_VERSION,
  COLOR_PRESETS,
  getAppearancePreferences,
  applyAppearancePreferences,
  getPrimaryColor,
  setPrimaryColor,
  getTextColor,
  setTextColor,
  resetAppearancePreferences,
  saveUserPreferences,
  loadUserPreferences,
  syncUserPreferences: loadUserPreferences
};

initTheme();
