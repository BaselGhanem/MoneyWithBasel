const firebaseConfig = {
    apiKey: "AIzaSyDUSHbMd1A98_OpE3JSNXPD-XT0do8FutM",
    authDomain: "moneywithbasel.firebaseapp.com",
    projectId: "moneywithbasel",
    storageBucket: "moneywithbasel.firebasestorage.app",
    messagingSenderId: "1000601907861",
    appId: "1:1000601907861:web:6995a21e42d36c1981a19c"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

const app = {
    user: null,
    data: { transactions: [], accounts: [], categories: [], commitments: [] }
};

function showToast(message, type = 'default') {
    document.querySelector('.toast')?.remove();
    const toast = document.createElement('div');
    const bg    = type === 'error' ? '#ff4444' : type === 'success' ? '#39FF14' : '#28283e';
    const color = type === 'success' ? '#0a0a12' : '#e8e0f0';
    toast.className = 'toast';
    toast.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
        background:${bg};color:${color};padding:12px 24px;border-radius:9999px;
        font-family:Almarai,sans-serif;font-size:14px;font-weight:700;z-index:9999;
        box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

function setLoading(show) {
    document.getElementById('loading')?.classList.toggle('active', show);
}

function showError(message) {
    const el = document.getElementById('error-message');
    if (!el) return;
    el.textContent = message;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 5000);
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

window.app        = app;
window.showToast  = showToast;
window.showModal  = showModal;
window.closeModal = closeModal;
window.setLoading = setLoading;
window.showError  = showError;
