document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
        document.getElementById('error-message')?.classList.remove('active');
    });
});

auth.onAuthStateChanged(user => {
    if (user) window.location.href = 'dashboard.html';
    else {
        const el = document.getElementById('firebase-status');
        if (el) el.textContent = '✅ جاهز للدخول';
    }
});

document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showError('أدخل البريد وكلمة المرور'); return; }
    setLoading(true);
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
        const msgs = {
            'auth/user-not-found':    'البريد غير مسجل',
            'auth/wrong-password':    'كلمة المرور خاطئة',
            'auth/invalid-email':     'بريد إلكتروني غير صحيح',
            'auth/too-many-requests': 'محاولات كثيرة، انتظر قليلاً',
            'auth/invalid-credential':'البريد أو كلمة المرور خاطئة'
        };
        showError('❌ ' + (msgs[e.code] || e.message));
        setLoading(false);
    }
});

document.getElementById('signup-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;
    if (!name || !email || !password || !confirm) { showError('ملأ جميع الحقول'); return; }
    if (password !== confirm) { showError('كلمات المرور غير متطابقة'); return; }
    if (password.length < 6)  { showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setLoading(true);
    try {
        const { user } = await auth.createUserWithEmailAndPassword(email, password);
        await user.updateProfile({ displayName: name });
    } catch (e) {
        const msgs = {
            'auth/email-already-in-use': 'البريد مستخدم بالفعل',
            'auth/weak-password':        'كلمة المرور ضعيفة جداً'
        };
        showError('❌ ' + (msgs[e.code] || e.message));
        setLoading(false);
    }
});

document.getElementById('demo-btn')?.addEventListener('click', async () => {
    setLoading(true);
    const email = 'demo@money-basel.com';
    const pass  = 'Demo@123456';
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
        if (['auth/user-not-found','auth/invalid-credential'].includes(e.code)) {
            try {
                const { user } = await auth.createUserWithEmailAndPassword(email, pass);
                await user.updateProfile({ displayName: 'باسل (تجريبي)' });
            } catch (e2) { showError('❌ ' + e2.message); setLoading(false); }
        } else { showError('❌ ' + e.message); setLoading(false); }
    }
});

['login-email','login-password','signup-name','signup-email','signup-password','signup-confirm'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const tab = document.querySelector('.auth-tab.active')?.dataset.tab;
        if (tab === 'login')  document.getElementById('login-btn')?.click();
        if (tab === 'signup') document.getElementById('signup-btn')?.click();
    });
});
