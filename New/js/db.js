// ============================================================
// db.js — Money with Basel | Firestore Data Layer
// ============================================================

// ── USERS ────────────────────────────────────────────────────

async function createUserProfile(user) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: { theme: 'dark', currency: 'JOD' }
        });
        await seedDefaultCategories(user.uid);
    }
}

async function getUserProfile(uid) {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function updateUserPreferences(uid, preferences) {
    await db.collection('users').doc(uid).update({ preferences });
}

// ── ACCOUNTS ─────────────────────────────────────────────────

async function getAccounts(uid) {
    const snap = await db.collection('accounts')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'asc')
        .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addAccount(uid, data) {
    const ref = await db.collection('accounts').add({
        userId: uid,
        name: data.name,
        type: data.type,           // 'cash' | 'bank' | 'savings' | 'credit'
        balance: Number(data.balance) || 0,
        currency: data.currency || 'JOD',
        color: data.color || '#39FF14',
        icon: data.icon || '💰',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
}

async function updateAccount(accountId, data) {
    await db.collection('accounts').doc(accountId).update(data);
}

async function deleteAccount(accountId) {
    const batch = db.batch();
    batch.delete(db.collection('accounts').doc(accountId));

    // Get and delete all associated transactions
    const txSnap = await db.collection('transactions').where('accountId', '==', accountId).get();
    txSnap.forEach(doc => batch.delete(doc.ref));

    // Get and delete all associated commitments
    const commSnap = await db.collection('commitments').where('accountId', '==', accountId).get();
    commSnap.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
}

async function updateAccountBalance(accountId, amount, type) {
    const increment = firebase.firestore.FieldValue.increment(
        type === 'income' ? amount : -amount
    );
    await db.collection('accounts').doc(accountId).update({ balance: increment });
}

async function transferBetweenAccounts(fromId, toId, amount, uid) {
    const batch = db.batch();
    const inc = firebase.firestore.FieldValue.increment;

    batch.update(db.collection('accounts').doc(fromId), { balance: inc(-amount) });
    batch.update(db.collection('accounts').doc(toId),   { balance: inc(amount) });

    const txRef = db.collection('transactions').doc();
    batch.set(txRef, {
        userId: uid,
        type: 'transfer',
        amount: Number(amount),
        fromAccountId: fromId,
        toAccountId: toId,
        note: 'تحويل بين الحسابات',
        date: firebase.firestore.Timestamp.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
}

// ── CATEGORIES ───────────────────────────────────────────────

async function getCategories(uid) {
    const snap = await db.collection('categories')
        .where('userId', '==', uid)
        .orderBy('name', 'asc')
        .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addCategory(uid, data) {
    const ref = await db.collection('categories').add({
        userId: uid,
        name: data.name,
        type: data.type,       // 'expense' | 'income'
        emoji: data.emoji || '📦',
        color: data.color || '#39FF14',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
}

async function updateCategory(categoryId, data) {
    await db.collection('categories').doc(categoryId).update(data);
}

async function deleteCategory(categoryId) {
    await db.collection('categories').doc(categoryId).delete();
}

async function seedDefaultCategories(uid) {
    const defaults = [
        { name: 'مقاضي',        type: 'expense', emoji: '🛒', color: '#FF6B6B' },
        { name: 'مطاعم',        type: 'expense', emoji: '🍔', color: '#FF9F43' },
        { name: 'فواتير الدار', type: 'expense', emoji: '⚡', color: '#FECA57' },
        { name: 'مواصلات',      type: 'expense', emoji: '🚗', color: '#48DBFB' },
        { name: 'صحة',          type: 'expense', emoji: '💊', color: '#FF6B9D' },
        { name: 'تعليم',        type: 'expense', emoji: '📚', color: '#A29BFE' },
        { name: 'ترفيه',        type: 'expense', emoji: '🎮', color: '#6C5CE7' },
        { name: 'ملابس',        type: 'expense', emoji: '👔', color: '#FD79A8' },
        { name: 'جمعيات',       type: 'expense', emoji: '🤝', color: '#00B894' },
        { name: 'راتب',         type: 'income',  emoji: '💵', color: '#39FF14' },
        { name: 'دخل إضافي',    type: 'income',  emoji: '💸', color: '#55EFC4' },
    ];
    const batch = db.batch();
    defaults.forEach(cat => {
        const ref = db.collection('categories').doc();
        batch.set(ref, {
            userId: uid,
            ...cat,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();
}

// ── TRANSACTIONS ─────────────────────────────────────────────

async function getTransactions(uid, options = {}) {
    let query = db.collection('transactions')
        .where('userId', '==', uid)
        .orderBy('date', 'desc');

    if (options.limit)      query = query.limit(options.limit);
    if (options.startDate)  query = query.where('date', '>=', firebase.firestore.Timestamp.fromDate(options.startDate));
    if (options.endDate)    query = query.where('date', '<=', firebase.firestore.Timestamp.fromDate(options.endDate));
    if (options.type)       query = query.where('type', '==', options.type);
    if (options.accountId)  query = query.where('accountId', '==', options.accountId);
    if (options.categoryId) query = query.where('categoryId', '==', options.categoryId);

    const snap = await query.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addTransaction(uid, data) {
    const batch = db.batch();

    const txRef = db.collection('transactions').doc();
    batch.set(txRef, {
        userId: uid,
        accountId: data.accountId,
        categoryId: data.categoryId || null,
        amount: Number(data.amount),
        type: data.type,           // 'income' | 'expense'
        date: firebase.firestore.Timestamp.fromDate(new Date(data.date)),
        note: data.note || '',
        isRecurring: data.isRecurring || false,
        commitmentId: data.commitmentId || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // تحديث رصيد الحساب
    const inc = firebase.firestore.FieldValue.increment;
    const delta = data.type === 'income' ? Number(data.amount) : -Number(data.amount);
    batch.update(db.collection('accounts').doc(data.accountId), { balance: inc(delta) });

    await batch.commit();
    return txRef.id;
}

async function updateTransaction(txId, oldData, newData) {
    const batch = db.batch();

    batch.update(db.collection('transactions').doc(txId), {
        accountId:  newData.accountId,
        categoryId: newData.categoryId || null,
        amount:     Number(newData.amount),
        type:       newData.type,
        date:       firebase.firestore.Timestamp.fromDate(new Date(newData.date)),
        note:       newData.note || '',
        updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
    });

    // عكس التأثير القديم وتطبيق الجديد
    const inc = firebase.firestore.FieldValue.increment;
    const oldDelta = oldData.type === 'income' ? -Number(oldData.amount) : Number(oldData.amount);
    const newDelta = newData.type === 'income' ?  Number(newData.amount) : -Number(newData.amount);

    if (oldData.accountId === newData.accountId) {
        batch.update(db.collection('accounts').doc(newData.accountId), {
            balance: inc(oldDelta + newDelta)
        });
    } else {
        batch.update(db.collection('accounts').doc(oldData.accountId), { balance: inc(oldDelta) });
        batch.update(db.collection('accounts').doc(newData.accountId), { balance: inc(newDelta) });
    }

    await batch.commit();
}

async function deleteTransaction(txId, txData) {
    const batch = db.batch();

    batch.delete(db.collection('transactions').doc(txId));

    const inc = firebase.firestore.FieldValue.increment;
    const reversal = txData.type === 'income' ? -Number(txData.amount) : Number(txData.amount);
    batch.update(db.collection('accounts').doc(txData.accountId), { balance: inc(reversal) });

    await batch.commit();
}

// ── COMMITMENTS (الالتزامات الثابتة) ─────────────────────────

async function getCommitments(uid) {
    const snap = await db.collection('commitments')
        .where('userId', '==', uid)
        .orderBy('nextRunDate', 'asc')
        .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addCommitment(uid, data) {
    const nextRun = new Date(data.startDate);

    const ref = await db.collection('commitments').add({
        userId:      uid,
        accountId:   data.accountId,
        categoryId:  data.categoryId || null,
        name:        data.name,
        amount:      Number(data.amount),
        type:        data.type,        // 'expense' | 'income' (للراتب)
        frequency:   data.frequency || 'monthly',
        dayOfMonth:  Number(data.dayOfMonth),
        startDate:   firebase.firestore.Timestamp.fromDate(new Date(data.startDate)),
        endDate:     data.endDate
                        ? firebase.firestore.Timestamp.fromDate(new Date(data.endDate))
                        : null,
        nextRunDate: firebase.firestore.Timestamp.fromDate(nextRun),
        isActive:    true,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
}

async function updateCommitment(commitmentId, data) {
    await db.collection('commitments').doc(commitmentId).update(data);
}

async function deleteCommitment(commitmentId) {
    await db.collection('commitments').doc(commitmentId).update({ isActive: false });
}

async function processCommitment(commitment) {
    const now   = new Date();
    const txId  = await addTransaction(commitment.userId, {
        accountId:    commitment.accountId,
        categoryId:   commitment.categoryId,
        amount:       commitment.amount,
        type:         commitment.type,
        date:         now.toISOString(),
        note:         commitment.name,
        isRecurring:  true,
        commitmentId: commitment.id
    });

    // احسب الـ nextRunDate التالي
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setDate(commitment.dayOfMonth);

    // هل انتهى الالتزام؟
    const isExpired = commitment.endDate &&
        next > commitment.endDate.toDate();

    await db.collection('commitments').doc(commitment.id).update({
        nextRunDate: firebase.firestore.Timestamp.fromDate(next),
        isActive:    !isExpired,
        lastRunDate: firebase.firestore.Timestamp.fromDate(now)
    });

    return txId;
}

// ── ANALYTICS HELPERS ────────────────────────────────────────

async function getMonthlyStats(uid, year, month) {
    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 0, 23, 59, 59);

    const txs = await getTransactions(uid, { startDate: start, endDate: end });

    const income  = txs.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const byCategory = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
        if (!byCategory[t.categoryId]) byCategory[t.categoryId] = 0;
        byCategory[t.categoryId] += t.amount;
    });

    return { income, expense, net: income - expense, byCategory, transactions: txs };
}

async function getFinancialHealth(uid) {
    const now = new Date();
    const stats = await getMonthlyStats(uid, now.getFullYear(), now.getMonth());
    const accounts = await getAccounts(uid);
    const commitments = await getCommitments(uid);
    const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

    // 1. فحص الالتزامات (دين مرتفع)
    const dueThisMonth = commitments.filter(c => c.isActive).reduce((s, c) => s + (c.type === 'expense' ? c.amount : 0), 0);
    const commitmentDanger = totalBalance < (dueThisMonth * 1.1); // رصيد لا يغطي الالتزامات مع هامش 10%

    // 2. فحص سرعة الصرف (آخر 7 أيام)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTxs = await getTransactions(uid, { startDate: sevenDaysAgo, type: 'expense' });
    const recentSpending = recentTxs.reduce((s, t) => s + t.amount, 0);
    const dangerousSpeed = recentSpending > (stats.income * 0.4) && stats.income > 0;

    // 3. فحص المدى الزمني (قرب نفاد الراتب)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();
    const avgDailySpend = stats.expense / (now.getDate() || 1);
    const lowRunway = daysRemaining > 5 && (totalBalance / (avgDailySpend || 1)) < (daysRemaining * 0.7);

    const isEmergency = commitmentDanger || dangerousSpeed || lowRunway;

    return {
        isEmergency,
        reasons: { commitmentDanger, dangerousSpeed, lowRunway },
        data: { totalBalance, dueThisMonth, recentSpending, daysRemaining, avgDailySpend }
    };
}

async function getNetWorth(uid) {
    const accounts = await getAccounts(uid);
    return accounts.reduce((s, a) => s + (a.balance || 0), 0);
}

// ── DATA MANAGEMENT (Export / Import / Reset) ───────────────

async function exportFullData(uid) {
    const [accounts, categories, transactions, commitments] = await Promise.all([
        getAccounts(uid),
        getCategories(uid),
        getTransactions(uid),
        getCommitments(uid)
    ]);

    // Convert Firestore Timestamps to ISO strings for JSON compatibility
    const processDocs = (docs) => docs.map(doc => {
        const cleaned = { ...doc };
        for (let key in cleaned) {
            if (cleaned[key] && typeof cleaned[key].toDate === 'function') {
                cleaned[key] = cleaned[key].toDate().toISOString();
            }
        }
        return cleaned;
    });

    return {
        exportDate: new Date().toISOString(),
        accounts: processDocs(accounts),
        categories: processDocs(categories),
        transactions: processDocs(transactions),
        commitments: processDocs(commitments)
    };
}

async function clearAllUserData(uid, keepProfile = true) {
    const collections = ['accounts', 'categories', 'transactions', 'commitments'];
    if (!keepProfile) collections.push('users');

    const batch = db.batch();
    
    for (const col of collections) {
        const snap = await db.collection(col).where(col === 'users' ? 'uid' : 'userId', '==', uid).get();
        snap.docs.forEach(doc => batch.delete(doc.ref));
    }

    await batch.commit();
}

async function importData(uid, data) {
    // 1. Clear current data first to avoid duplicates/conflicts
    await clearAllUserData(uid, true);

    const batch = db.batch();

    const collections = ['accounts', 'categories', 'transactions', 'commitments'];
    
    collections.forEach(colName => {
        if (data[colName] && Array.isArray(data[colName])) {
            data[colName].forEach(item => {
                const { id, ...docData } = item;
                // Ensure userId is current user and strings are converted back to Timestamps
                docData.userId = uid;
                for (let key in docData) {
                    if (key.toLowerCase().includes('date') && typeof docData[key] === 'string') {
                        docData[key] = firebase.firestore.Timestamp.fromDate(new Date(docData[key]));
                    }
                }
                
                // We use the original ID to preserve relationships
                const ref = db.collection(colName).doc(id);
                batch.set(ref, docData);
            });
        }
    });

    await batch.commit();
}

// ── EXPORT ───────────────────────────────────────────────────

window.DB = {
    // Users
    createUserProfile, getUserProfile, updateUserPreferences, clearAllUserData,
    // Data Portability
    exportFullData, importData,
    // Accounts
    getAccounts, addAccount, updateAccount, deleteAccount,
    updateAccountBalance, transferBetweenAccounts,
    // Categories
    getCategories, addCategory, updateCategory, deleteCategory,
    // Transactions
    getTransactions, addTransaction, updateTransaction, deleteTransaction,
    // Commitments
    getCommitments, addCommitment, updateCommitment, deleteCommitment, processCommitment,
    // Analytics
    getMonthlyStats, getFinancialHealth, getNetWorth
};
