/* ============================================================
   Money with Basel — Product Transformation Layer v3.0.0
   Additive only. Preserves the original codebase and upgrades UX.
   ============================================================ */
(function () {
  'use strict';

  const VERSION = '3.0.0-world-class-20260626';
  const MONEY_LOCALE = 'en-JO';

  const safe = {
    text(value) {
      return String(value ?? '').replace(/[&<>'"]/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      }[ch]));
    },
    number(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    },
    date(value) {
      if (!value) return null;
      if (value.toDate && typeof value.toDate === 'function') return value.toDate();
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    },
    monthKey(date) {
      const d = safe.date(date) || new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    uid() {
      return window.app?.user?.uid || window.auth?.currentUser?.uid || 'guest';
    },
    currency() {
      return window.UI?.getCurrency ? window.UI.getCurrency() : (localStorage.getItem('currency') || 'JOD');
    },
    money(value, visible = true) {
      if (!visible) return '••••••';
      return safe.number(value).toLocaleString(MONEY_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  function storageKey(name) {
    return `mwb_${safe.uid()}_${name}`;
  }

  function getJSON(name, fallback) {
    try {
      const raw = localStorage.getItem(storageKey(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setJSON(name, value) {
    localStorage.setItem(storageKey(name), JSON.stringify(value));
  }

  function ensureToastStack() {
    let stack = document.querySelector('.mwb-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'mwb-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function premiumToast(message, options = {}) {
    const stack = ensureToastStack();
    const toast = document.createElement('div');
    const typeClass = options.type ? ` mwb-toast--${options.type}` : '';
    toast.className = `mwb-toast${typeClass}`;
    toast.innerHTML = `
      <div class="mwb-toast__message">${safe.text(message)}</div>
      ${options.actionText ? `<button type="button" class="mwb-toast__action">${safe.text(options.actionText)}</button>` : ''}
    `;
    if (options.actionText && typeof options.onAction === 'function') {
      toast.querySelector('button').addEventListener('click', async () => {
        try { await options.onAction(); } finally { toast.remove(); }
      });
    }
    stack.appendChild(toast);
    const ttl = options.ttl || 5200;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity .22s, transform .22s';
      setTimeout(() => toast.remove(), 240);
    }, ttl);
  }

  function ensureConfirmDialog() {
    let overlay = document.getElementById('mwb-confirm-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'mwb-confirm-overlay';
    overlay.className = 'mwb-confirm-overlay';
    overlay.innerHTML = `
      <div class="mwb-dialog" role="dialog" aria-modal="true" aria-labelledby="mwb-confirm-title">
        <h3 id="mwb-confirm-title">تأكيد الإجراء</h3>
        <p id="mwb-confirm-message">هل تريد المتابعة؟</p>
        <div class="mwb-dialog-actions">
          <button type="button" id="mwb-confirm-ok" class="mwb-primary-button">تأكيد</button>
          <button type="button" id="mwb-confirm-cancel" class="mwb-secondary-button">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function confirmAction({ title = 'تأكيد الإجراء', message = 'هل تريد المتابعة؟', confirmText = 'تأكيد', danger = false } = {}) {
    const overlay = ensureConfirmDialog();
    overlay.querySelector('#mwb-confirm-title').textContent = title;
    overlay.querySelector('#mwb-confirm-message').textContent = message;
    const ok = overlay.querySelector('#mwb-confirm-ok');
    const cancel = overlay.querySelector('#mwb-confirm-cancel');
    ok.textContent = confirmText;
    ok.className = danger ? 'mwb-danger-button' : 'mwb-primary-button';
    overlay.classList.add('active');
    return new Promise(resolve => {
      const cleanup = result => {
        overlay.classList.remove('active');
        ok.onclick = null;
        cancel.onclick = null;
        overlay.onclick = null;
        resolve(result);
      };
      ok.onclick = () => cleanup(true);
      cancel.onclick = () => cleanup(false);
      overlay.onclick = event => { if (event.target === overlay) cleanup(false); };
      setTimeout(() => ok.focus(), 30);
    });
  }

  function installGlobalUI() {
    window.MoneyWithBaselUpgrade = Object.assign(window.MoneyWithBaselUpgrade || {}, {
      VERSION, safe, premiumToast, confirmAction, getJSON, setJSON, storageKey
    });

    if (window.UI) {
      window.UI.confirmAction = confirmAction;
      window.UI.premiumToast = premiumToast;
    }
  }

  function patchDBLayer() {
    if (!window.DB || window.DB.__mwbUpgradePatched) return;

    const original = {
      addTransaction: DB.addTransaction,
      updateTransaction: DB.updateTransaction,
      deleteTransaction: DB.deleteTransaction,
      transferBetweenAccounts: DB.transferBetweenAccounts,
      importData: DB.importData,
      exportFullData: DB.exportFullData,
      clearAllUserData: DB.clearAllUserData
    };

    function addAudit(entry) {
      const items = getJSON('audit_log', []);
      items.unshift({
        id: `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: new Date().toISOString(),
        userId: safe.uid(),
        ...entry
      });
      setJSON('audit_log', items.slice(0, 250));
    }

    function saveRestorePoint(name, data) {
      const points = getJSON('restore_points', []);
      points.unshift({
        id: `restore_${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        data
      });
      setJSON('restore_points', points.slice(0, 5));
    }

    function validateBackupSchema(data) {
      const errors = [];
      const requiredArrays = ['accounts', 'categories', 'transactions', 'commitments'];
      if (!data || typeof data !== 'object') errors.push('الملف لا يحتوي على كائن بيانات صالح.');
      requiredArrays.forEach(key => {
        if (!Array.isArray(data?.[key])) errors.push(`القسم ${key} غير موجود أو ليس قائمة.`);
      });
      (data?.accounts || []).forEach((a, i) => {
        if (!a.id) errors.push(`الحساب رقم ${i + 1} بدون id.`);
        if (!a.name) errors.push(`الحساب رقم ${i + 1} بدون اسم.`);
      });
      (data?.transactions || []).forEach((t, i) => {
        if (!t.id) errors.push(`الحركة رقم ${i + 1} بدون id.`);
        if (!t.accountId && t.type !== 'transfer') errors.push(`الحركة رقم ${i + 1} بدون حساب.`);
        if (!Number.isFinite(Number(t.amount))) errors.push(`الحركة رقم ${i + 1} فيها مبلغ غير صالح.`);
        if (!['income', 'expense', 'transfer'].includes(t.type)) errors.push(`الحركة رقم ${i + 1} نوعها غير صالح.`);
      });
      return { ok: errors.length === 0, errors };
    }

    DB.addTransaction = async function patchedAddTransaction(uid, data) {
      const id = await original.addTransaction(uid, data);
      addAudit({ action: 'transaction_added', label: data.note || 'حركة جديدة', amount: safe.number(data.amount), type: data.type, entityId: id });
      return id;
    };

    DB.updateTransaction = async function patchedUpdateTransaction(txId, oldData, newData) {
      await original.updateTransaction(txId, oldData, newData);
      addAudit({ action: 'transaction_updated', label: newData.note || oldData.note || 'تعديل حركة', amount: safe.number(newData.amount), type: newData.type, entityId: txId });
    };

    DB.deleteTransaction = async function patchedDeleteTransaction(txId, txData) {
      const backup = { ...txData, id: txId };
      await original.deleteTransaction(txId, txData);
      addAudit({ action: 'transaction_deleted', label: txData.note || 'حذف حركة', amount: safe.number(txData.amount), type: txData.type, entityId: txId });
      const deleted = getJSON('deleted_transactions', []);
      deleted.unshift({ deletedAt: new Date().toISOString(), data: backup });
      setJSON('deleted_transactions', deleted.slice(0, 50));
      if (backup.userId && ['income', 'expense'].includes(backup.type)) {
        premiumToast('تم حذف الحركة. يمكنك التراجع الآن.', {
          type: 'warning',
          actionText: 'تراجع',
          ttl: 9000,
          onAction: async () => {
            const date = safe.date(backup.date) || new Date();
            await original.addTransaction(backup.userId, {
              accountId: backup.accountId,
              categoryId: backup.categoryId || null,
              amount: safe.number(backup.amount),
              type: backup.type,
              date: date.toISOString(),
              note: backup.note || 'استرجاع حركة محذوفة'
            });
            addAudit({ action: 'transaction_restored', label: backup.note || 'استرجاع حركة', amount: safe.number(backup.amount), type: backup.type });
            premiumToast('تم استرجاع الحركة بنجاح.', { type: 'success' });
            setTimeout(() => window.location.reload(), 700);
          }
        });
      }
    };

    DB.transferBetweenAccounts = async function patchedTransfer(fromId, toId, amount, uid) {
      await original.transferBetweenAccounts(fromId, toId, amount, uid);
      addAudit({ action: 'transfer_created', label: 'تحويل بين الحسابات', amount: safe.number(amount), type: 'transfer' });
    };

    DB.importData = async function patchedImportData(uid, data) {
      const validation = validateBackupSchema(data);
      if (!validation.ok) {
        const msg = validation.errors.slice(0, 6).join(' / ');
        throw new Error(`ملف النسخة الاحتياطية غير صالح: ${msg}`);
      }
      const current = await original.exportFullData(uid);
      saveRestorePoint('قبل الاستيراد', current);
      await original.importData(uid, data);
      addAudit({ action: 'backup_imported', label: 'استيراد نسخة احتياطية', amount: 0, type: 'system' });
    };

    DB.exportFullData = async function patchedExportFullData(uid) {
      const data = await original.exportFullData(uid);
      return {
        ...data,
        productVersion: VERSION,
        localBudget: getJSON('budget_settings', { monthlyLimit: 0 }),
        localAuditLog: getJSON('audit_log', []),
        restorePointCount: getJSON('restore_points', []).length
      };
    };

    DB.clearAllUserData = async function patchedClearAll(uid, keepProfile = true) {
      const current = await original.exportFullData(uid);
      saveRestorePoint('قبل التصفير', current);
      await original.clearAllUserData(uid, keepProfile);
      addAudit({ action: 'data_cleared', label: 'تصفير بيانات المستخدم', amount: 0, type: 'system' });
    };

    DB.validateBackupSchema = validateBackupSchema;
    DB.getLocalAuditLog = () => getJSON('audit_log', []);
    DB.getRestorePoints = () => getJSON('restore_points', []);
    DB.__mwbUpgradePatched = true;
  }

  function installNetWorthChartPatch() {
    if (typeof window.renderNetWorthChart !== 'function' || window.renderNetWorthChart.__mwbPatched) return;
    window.renderNetWorthChart = async function renderRealNetWorthChart() {
      const canvas = document.getElementById('net-worth-chart');
      if (!canvas || !window.Chart || !window.app?.user || !window.state) return;
      const months = [];
      const values = [];
      const now = new Date();
      const accounts = state.accounts || [];
      const currentNetWorth = accounts.reduce((sum, account) => sum + safe.number(account.balance), 0);
      let txs = [];
      try {
        txs = await DB.getTransactions(app.user.uid);
      } catch (error) {
        console.warn('Net worth history fallback:', error);
        txs = state.stats?.transactions || [];
      }
      const monthlyNet = new Map();
      txs.forEach(tx => {
        if (!['income', 'expense'].includes(tx.type)) return;
        const d = safe.date(tx.date);
        if (!d) return;
        const key = safe.monthKey(d);
        const delta = tx.type === 'income' ? safe.number(tx.amount) : -safe.number(tx.amount);
        monthlyNet.set(key, (monthlyNet.get(key) || 0) + delta);
      });
      const monthKeys = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleDateString('ar-JO', { month: 'short' }));
        monthKeys.push(safe.monthKey(d));
      }
      monthKeys.forEach((key, index) => {
        const laterKeys = monthKeys.slice(index + 1);
        const laterNet = laterKeys.reduce((sum, laterKey) => sum + safe.number(monthlyNet.get(laterKey)), 0);
        values.push(Math.max(0, currentNetWorth - laterNet));
      });
      if (state.netWorthChart) state.netWorthChart.destroy();
      state.netWorthChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            data: values,
            borderColor: '#0fc6bd',
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            backgroundColor: 'rgba(9,153,153,0.13)',
            tension: 0.42
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { rtl: true, callbacks: { label: ctx => `${safe.money(ctx.parsed.y)} ${safe.currency()}` } } },
          scales: { x: { display: false }, y: { display: false } }
        }
      });
    };
    window.renderNetWorthChart.__mwbPatched = true;
  }

  function getBudgetSettings() {
    return getJSON('budget_settings', { monthlyLimit: 0, alertAt: 85 });
  }

  function setBudgetSettings(settings) {
    setJSON('budget_settings', {
      monthlyLimit: Math.max(0, safe.number(settings.monthlyLimit)),
      alertAt: Math.min(100, Math.max(50, safe.number(settings.alertAt) || 85))
    });
  }

  function calculateForecast({ accounts = [], commitments = [], stats = {} }) {
    const totalBalance = accounts.reduce((sum, a) => sum + safe.number(a.balance), 0);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(0, daysInMonth - now.getDate());
    const dailySpend = safe.number(stats.expense) / Math.max(1, now.getDate());
    const forecastSpend = dailySpend * daysRemaining;
    const upcomingCommitments = commitments.filter(c => c.isActive && c.type === 'expense').reduce((sum, c) => {
      const next = safe.date(c.nextRunDate);
      if (!next) return sum;
      const sameMonth = next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth() && next >= now;
      return sameMonth ? sum + safe.number(c.amount) : sum;
    }, 0);
    const projectedBalance = totalBalance - forecastSpend - upcomingCommitments;
    const runwayDays = dailySpend > 0 ? Math.floor(totalBalance / dailySpend) : 999;
    return { totalBalance, daysRemaining, dailySpend, forecastSpend, upcomingCommitments, projectedBalance, runwayDays };
  }

  function renderDashboardIntelligence() {
    if (!document.getElementById('net-worth') || !window.state) return;
    const main = document.querySelector('main');
    if (!main) return;
    let shell = document.getElementById('mwb-command-center');
    if (!shell) {
      shell = document.createElement('section');
      shell.id = 'mwb-command-center';
      shell.className = 'mwb-command-center';
      const firstBento = main.querySelector('.bento-grid');
      main.insertBefore(shell, firstBento || main.firstElementChild?.nextSibling || main.firstChild);
    }

    const accounts = state.accounts || [];
    const commitments = state.commitments || [];
    const stats = state.stats || { income: 0, expense: 0, net: 0, transactions: [] };
    const budget = getBudgetSettings();
    const forecast = calculateForecast({ accounts, commitments, stats });
    const coverage = forecast.upcomingCommitments > 0 ? Math.round((forecast.totalBalance / forecast.upcomingCommitments) * 100) : 100;
    const budgetLimit = budget.monthlyLimit || Math.max(safe.number(stats.income) - commitments.filter(c => c.type === 'expense').reduce((s, c) => s + safe.number(c.amount), 0), 0);
    const budgetUsed = budgetLimit > 0 ? Math.min(999, Math.round((safe.number(stats.expense) / budgetLimit) * 100)) : 0;
    const status = forecast.projectedBalance >= 0 && budgetUsed < budget.alertAt ? 'safe' : forecast.projectedBalance >= 0 ? 'watch' : 'danger';
    const statusLabel = status === 'safe' ? 'الوضع آمن' : status === 'watch' ? 'راقب الصرف' : 'خطر نفاد الرصيد';
    const statusChip = status === 'safe' ? 'mwb-chip--success' : status === 'watch' ? 'mwb-chip--warning' : 'mwb-chip--danger';
    const currency = safe.currency();

    shell.innerHTML = `
      <article class="mwb-intel-card mwb-intel-card--wide">
        <div class="mwb-kicker">Financial Pulse</div>
        <div class="mwb-card-title">${statusLabel}</div>
        <div class="mwb-card-note">تقدير مبني على الرصيد الحالي، سرعة الصرف، والالتزامات المتبقية هذا الشهر.</div>
        <div class="mwb-status-row">
          <span class="mwb-chip ${statusChip}">نبض الشهر</span>
          <span class="mwb-chip">${forecast.daysRemaining} يوم متبقي</span>
          <span class="mwb-chip">Runway: ${forecast.runwayDays >= 999 ? 'مفتوح' : `${forecast.runwayDays} يوم`}</span>
        </div>
      </article>
      <article class="mwb-intel-card">
        <div class="mwb-kicker">Projected Month End</div>
        <div class="mwb-card-value">${safe.money(forecast.projectedBalance)} ${currency}</div>
        <div class="mwb-card-note">رصيد متوقع بعد الالتزامات وسرعة الصرف الحالية.</div>
      </article>
      <article class="mwb-intel-card">
        <div class="mwb-kicker">Commitment Cover</div>
        <div class="mwb-card-value">${coverage}%</div>
        <div class="mwb-progress ${coverage < 100 ? 'is-danger' : coverage < 140 ? 'is-warning' : ''}"><span style="width:${Math.min(100, coverage)}%"></span></div>
        <div class="mwb-card-note">تغطية الرصيد للالتزامات القادمة هذا الشهر.</div>
      </article>
      <article class="mwb-intel-card">
        <div class="mwb-kicker">Budget Health</div>
        <div class="mwb-card-value">${budgetUsed}%</div>
        <div class="mwb-progress ${budgetUsed > 100 ? 'is-danger' : budgetUsed >= budget.alertAt ? 'is-warning' : ''}"><span style="width:${Math.min(100, budgetUsed)}%"></span></div>
        <div class="mwb-card-note">المصروف من سقف الشهر: ${safe.money(budgetLimit)} ${currency}</div>
      </article>
      <article class="mwb-intel-card">
        <div class="mwb-kicker">Trust Layer</div>
        <div class="mwb-card-title">${DB.getLocalAuditLog ? DB.getLocalAuditLog().length : 0} عملية موثقة</div>
        <div class="mwb-card-note">سجل محلي لآخر الإضافات والتعديلات والحذف مع إمكانية التراجع عند حذف الحركة.</div>
      </article>
    `;

    renderSetupWizardPrompt(accounts, commitments);
    renderFloatingToolbar();
  }

  function renderSetupWizardPrompt(accounts, commitments) {
    const main = document.querySelector('main');
    if (!main || document.getElementById('mwb-setup-panel')) return;
    const dismissed = localStorage.getItem(storageKey('setup_dismissed')) === '1';
    if (dismissed || accounts.length > 0) return;
    const panel = document.createElement('section');
    panel.id = 'mwb-setup-panel';
    panel.className = 'mwb-setup-panel';
    panel.innerHTML = `
      <div class="mwb-panel-header">
        <div>
          <div class="mwb-panel-title">ابدأ صح خلال دقيقة</div>
          <div class="mwb-panel-subtitle">أنشئ أول حساب، أضف الراتب، وحدد سقف الصرف الشهري. بعدها تصبح لوحة التحكم مفيدة فوراً.</div>
        </div>
        <button type="button" class="mwb-secondary-button" id="mwb-dismiss-setup">لاحقاً</button>
      </div>
      <button type="button" class="mwb-primary-button" id="mwb-open-setup">تشغيل الإعداد الذكي</button>
    `;
    const command = document.getElementById('mwb-command-center');
    main.insertBefore(panel, command ? command.nextSibling : main.firstChild);
    document.getElementById('mwb-dismiss-setup').onclick = () => {
      localStorage.setItem(storageKey('setup_dismissed'), '1');
      panel.remove();
    };
    document.getElementById('mwb-open-setup').onclick = openSetupWizard;
  }

  function ensureSetupWizard() {
    let overlay = document.getElementById('mwb-wizard-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'mwb-wizard-overlay';
    overlay.className = 'mwb-wizard-overlay';
    overlay.innerHTML = `
      <div class="mwb-dialog" role="dialog" aria-modal="true" aria-labelledby="mwb-wizard-title">
        <h3 id="mwb-wizard-title">الإعداد المالي الذكي</h3>
        <p>هذه الخطوة تضيف بيانات بداية منظمة بدون كسر أي منطق حالي.</p>
        <div class="mwb-form-grid">
          <label>اسم الحساب الأول<input id="mwb-wizard-account" type="text" value="الكاش الرئيسي"></label>
          <label>الرصيد الحالي<input id="mwb-wizard-balance" type="number" inputmode="decimal" value="0"></label>
          <label>الراتب الشهري اختياري<input id="mwb-wizard-salary" type="number" inputmode="decimal" placeholder="مثال: 800"></label>
          <label>يوم الراتب<input id="mwb-wizard-salary-day" type="number" min="1" max="31" value="1"></label>
          <label>سقف المصروف الشهري<input id="mwb-wizard-budget" type="number" inputmode="decimal" placeholder="مثال: 500"></label>
          <label>تنبيه الميزانية عند %<input id="mwb-wizard-alert" type="number" min="50" max="100" value="85"></label>
        </div>
        <div class="mwb-dialog-actions">
          <button type="button" class="mwb-primary-button" id="mwb-wizard-save">تطبيق الإعداد</button>
          <button type="button" class="mwb-secondary-button" id="mwb-wizard-cancel">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#mwb-wizard-cancel').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#mwb-wizard-save').onclick = submitSetupWizard;
    return overlay;
  }

  function openSetupWizard() {
    ensureSetupWizard().classList.add('active');
  }

  async function submitSetupWizard() {
    if (!window.app?.user) return;
    const accountName = document.getElementById('mwb-wizard-account').value.trim() || 'الكاش الرئيسي';
    const balance = safe.number(document.getElementById('mwb-wizard-balance').value);
    const salary = safe.number(document.getElementById('mwb-wizard-salary').value);
    const salaryDay = Math.min(31, Math.max(1, parseInt(document.getElementById('mwb-wizard-salary-day').value || '1', 10)));
    const budget = safe.number(document.getElementById('mwb-wizard-budget').value);
    const alertAt = safe.number(document.getElementById('mwb-wizard-alert').value) || 85;
    try {
      UI.setLoading?.(true);
      const accountId = await DB.addAccount(app.user.uid, { name: accountName, balance, type: 'cash', currency: safe.currency(), color: '#099999', icon: '💼' });
      if (salary > 0) {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), salaryDay);
        await DB.addCommitment(app.user.uid, {
          accountId,
          categoryId: null,
          name: 'الراتب الشهري',
          amount: salary,
          type: 'income',
          dayOfMonth: salaryDay,
          startDate: start.toISOString(),
          endDate: null
        });
      }
      if (budget > 0) setBudgetSettings({ monthlyLimit: budget, alertAt });
      localStorage.setItem(storageKey('setup_dismissed'), '1');
      premiumToast('تم إعداد النظام المالي بنجاح.', { type: 'success' });
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      console.error(error);
      premiumToast('تعذر تطبيق الإعداد. تحقق من الاتصال والصلاحيات.', { type: 'error' });
    } finally {
      UI.setLoading?.(false);
    }
  }

  function renderFloatingToolbar() {
    if (document.getElementById('mwb-fab-toolbar')) return;
    const bar = document.createElement('div');
    bar.id = 'mwb-fab-toolbar';
    bar.className = 'mwb-fab-toolbar';
    bar.innerHTML = `
      <button type="button" title="إضافة مصروف" data-mwb-action="expense"><span class="material-symbols-outlined">remove</span></button>
      <button type="button" title="إضافة دخل" data-mwb-action="income"><span class="material-symbols-outlined">add</span></button>
      <a href="transactions.html" title="الحركات"><span class="material-symbols-outlined">manage_search</span></a>
    `;
    document.body.appendChild(bar);
    bar.querySelector('[data-mwb-action="expense"]').onclick = () => typeof openAddModal === 'function' ? openAddModal('expense') : window.location.href = 'dashboard.html?openAdd=true';
    bar.querySelector('[data-mwb-action="income"]').onclick = () => typeof openAddModal === 'function' ? openAddModal('income') : window.location.href = 'dashboard.html?openAdd=true';
  }

  function patchDashboard() {
    installNetWorthChartPatch();
    if (typeof window.loadDashboard === 'function' && !window.loadDashboard.__mwbPatched) {
      const originalLoadDashboard = window.loadDashboard;
      window.loadDashboard = async function patchedLoadDashboard(user) {
        const result = await originalLoadDashboard(user);
        renderDashboardIntelligence();
        return result;
      };
      window.loadDashboard.__mwbPatched = true;
    }
  }

  function patchTransactionsPage() {
    if (!location.pathname.endsWith('transactions.html')) return;
    function renderToolbar() {
      const main = document.querySelector('main');
      if (!main || document.getElementById('mwb-ledger-toolbar')) return;
      const toolbar = document.createElement('section');
      toolbar.id = 'mwb-ledger-toolbar';
      toolbar.className = 'mwb-ledger-toolbar';
      toolbar.innerHTML = `
        <div class="mwb-panel-header">
          <div>
            <div class="mwb-panel-title">دفتر الحركات الذكي</div>
            <div class="mwb-panel-subtitle">اختصارات تشغيلية للحركات الأكثر استخداماً مع حفظ آخر فلتر بحث محلياً.</div>
          </div>
          <div class="mwb-status-row">
            <button type="button" class="mwb-secondary-button" data-ledger-filter="all">الكل</button>
            <button type="button" class="mwb-secondary-button" data-ledger-filter="expense">مصروف</button>
            <button type="button" class="mwb-secondary-button" data-ledger-filter="income">دخل</button>
          </div>
        </div>
      `;
      const firstCard = main.querySelector('.card-surface, .aurora-card');
      main.insertBefore(toolbar, firstCard || main.firstChild);
      toolbar.querySelectorAll('[data-ledger-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          const filter = btn.dataset.ledgerFilter;
          if (typeof window.setFilter === 'function') window.setFilter(filter);
          setJSON('last_ledger_filter', filter);
        });
      });
      const saved = getJSON('last_ledger_filter', null);
      if (saved && typeof window.setFilter === 'function') setTimeout(() => window.setFilter(saved), 120);
    }
    if (typeof window.loadMonth === 'function' && !window.loadMonth.__mwbPatched) {
      const originalLoadMonth = window.loadMonth;
      window.loadMonth = async function patchedLoadMonth() {
        const result = await originalLoadMonth();
        renderToolbar();
        return result;
      };
      window.loadMonth.__mwbPatched = true;
    }
    document.addEventListener('DOMContentLoaded', renderToolbar);
    setTimeout(renderToolbar, 0);
  }

  function ensureReconciliationModal() {
    let overlay = document.getElementById('mwb-reconcile-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'mwb-reconcile-overlay';
    overlay.className = 'mwb-reconcile-overlay';
    overlay.innerHTML = `
      <div class="mwb-dialog" role="dialog" aria-modal="true" aria-labelledby="mwb-reconcile-title">
        <h3 id="mwb-reconcile-title">مطابقة رصيد الحساب</h3>
        <p>أدخل الرصيد الحقيقي كما يظهر في البنك أو الكاش. النظام سينشئ حركة تسوية تحفظ الأثر المالي بدل تعديل الرصيد بشكل صامت.</p>
        <div class="mwb-form-grid">
          <label>الحساب<select id="mwb-reconcile-account"></select></label>
          <label>الرصيد الحقيقي<input id="mwb-reconcile-balance" type="number" inputmode="decimal" placeholder="0.00"></label>
        </div>
        <div id="mwb-reconcile-preview" class="mwb-card-note"></div>
        <div class="mwb-dialog-actions">
          <button type="button" class="mwb-primary-button" id="mwb-reconcile-save">إنشاء حركة تسوية</button>
          <button type="button" class="mwb-secondary-button" id="mwb-reconcile-cancel">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#mwb-reconcile-cancel').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#mwb-reconcile-save').onclick = submitReconciliation;
    overlay.querySelector('#mwb-reconcile-balance').addEventListener('input', updateReconciliationPreview);
    overlay.querySelector('#mwb-reconcile-account').addEventListener('change', updateReconciliationPreview);
    return overlay;
  }

  function openReconciliation(accountId = null) {
    const accounts = window.state?.accounts || (window.state?.account ? [window.state.account] : []);
    if (!accounts.length) return premiumToast('أضف حساباً أولاً قبل المطابقة.', { type: 'error' });
    const overlay = ensureReconciliationModal();
    const select = overlay.querySelector('#mwb-reconcile-account');
    select.innerHTML = accounts.map(acc => `<option value="${safe.text(acc.id)}">${safe.text(acc.name)} — ${safe.money(acc.balance)} ${safe.currency()}</option>`).join('');
    if (accountId) select.value = accountId;
    overlay.querySelector('#mwb-reconcile-balance').value = '';
    overlay.classList.add('active');
    updateReconciliationPreview();
  }

  function updateReconciliationPreview() {
    const overlay = ensureReconciliationModal();
    const id = overlay.querySelector('#mwb-reconcile-account').value;
    const accounts = window.state?.accounts || (window.state?.account ? [window.state.account] : []);
    const account = accounts.find(a => a.id === id);
    const actual = safe.number(overlay.querySelector('#mwb-reconcile-balance').value);
    const diff = account ? actual - safe.number(account.balance) : 0;
    overlay.querySelector('#mwb-reconcile-preview').textContent = account && actual
      ? `فرق التسوية: ${safe.money(diff)} ${safe.currency()} — ${diff >= 0 ? 'سيتم تسجيل دخل تسوية' : 'سيتم تسجيل مصروف تسوية'}.`
      : 'سيظهر فرق التسوية بعد إدخال الرصيد الحقيقي.';
  }

  async function submitReconciliation() {
    const overlay = ensureReconciliationModal();
    const id = overlay.querySelector('#mwb-reconcile-account').value;
    const accounts = window.state?.accounts || (window.state?.account ? [window.state.account] : []);
    const account = accounts.find(a => a.id === id);
    const actual = safe.number(overlay.querySelector('#mwb-reconcile-balance').value);
    if (!account || !actual && actual !== 0) return premiumToast('أدخل رصيداً صحيحاً.', { type: 'error' });
    const diff = actual - safe.number(account.balance);
    if (Math.abs(diff) < 0.001) return premiumToast('لا يوجد فرق يحتاج إلى تسوية.', { type: 'success' });
    const ok = await confirmAction({
      title: 'تأكيد التسوية',
      message: `سيتم إنشاء حركة ${diff > 0 ? 'دخل' : 'مصروف'} بقيمة ${safe.money(Math.abs(diff))} ${safe.currency()} لحساب ${account.name}.`,
      confirmText: 'تنفيذ التسوية'
    });
    if (!ok) return;
    try {
      UI.setLoading?.(true);
      await DB.addTransaction(app.user.uid, {
        accountId: account.id,
        categoryId: null,
        amount: Math.abs(diff),
        type: diff > 0 ? 'income' : 'expense',
        date: new Date().toISOString(),
        note: `تسوية رصيد ${account.name}`
      });
      premiumToast('تم إنشاء حركة التسوية.', { type: 'success' });
      setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      console.error(error);
      premiumToast('تعذر تنفيذ التسوية.', { type: 'error' });
    } finally {
      UI.setLoading?.(false);
    }
  }

  function patchAccountsPages() {
    window.openReconciliation = openReconciliation;
    const isAccounts = location.pathname.endsWith('accounts.html');
    const isDetails = location.pathname.endsWith('account-details.html');
    if (!isAccounts && !isDetails) return;

    function renderAccountOps() {
      const main = document.querySelector('main');
      if (!main || document.getElementById('mwb-account-ops')) return;
      const panel = document.createElement('section');
      panel.id = 'mwb-account-ops';
      panel.className = 'mwb-trust-panel';
      panel.innerHTML = `
        <div class="mwb-panel-header">
          <div>
            <div class="mwb-panel-title">عمليات الثقة على الحسابات</div>
            <div class="mwb-panel-subtitle">طابق الرصيد الحقيقي مع النظام عبر حركة تسوية واضحة بدلاً من تعديل صامت.</div>
          </div>
          <button type="button" class="mwb-primary-button" id="mwb-reconcile-open">مطابقة رصيد</button>
        </div>
      `;
      const first = main.querySelector('.card-surface, .aurora-card');
      main.insertBefore(panel, first ? first.nextSibling : main.firstChild);
      panel.querySelector('#mwb-reconcile-open').onclick = () => openReconciliation(window.state?.account?.id || null);
    }

    if (typeof window.loadAccounts === 'function' && !window.loadAccounts.__mwbPatched) {
      const originalLoadAccounts = window.loadAccounts;
      window.loadAccounts = async function patchedLoadAccounts() {
        const result = await originalLoadAccounts();
        renderAccountOps();
        return result;
      };
      window.loadAccounts.__mwbPatched = true;
    }
    if (typeof window.loadTransactions === 'function' && !window.loadTransactions.__mwbPatched) {
      const originalLoadTransactions = window.loadTransactions;
      window.loadTransactions = async function patchedLoadTransactions(accId) {
        const result = await originalLoadTransactions(accId);
        renderAccountOps();
        return result;
      };
      window.loadTransactions.__mwbPatched = true;
    }
    document.addEventListener('DOMContentLoaded', renderAccountOps);
    setTimeout(renderAccountOps, 0);
  }

  function patchSettingsPage() {
    if (!location.pathname.endsWith('settings.html')) return;

    function renderSettingsEnhancements() {
      const main = document.querySelector('main');
      if (!main || document.getElementById('mwb-settings-budget')) return;
      const budget = getBudgetSettings();
      const audit = DB.getLocalAuditLog ? DB.getLocalAuditLog() : [];
      const restorePoints = DB.getRestorePoints ? DB.getRestorePoints() : [];
      const panel = document.createElement('section');
      panel.id = 'mwb-settings-budget';
      panel.className = 'mwb-settings-panel';
      panel.innerHTML = `
        <div class="mwb-panel-header">
          <div>
            <div class="mwb-panel-title">مركز التحكم المالي</div>
            <div class="mwb-panel-subtitle">ميزانية شهرية، سجل ثقة، ونقاط استرجاع محلية قبل العمليات الخطرة.</div>
          </div>
        </div>
        <div class="mwb-grid-3">
          <div class="mwb-mini-stat"><span>سقف المصروف الشهري</span><strong>${safe.money(budget.monthlyLimit)} ${safe.currency()}</strong></div>
          <div class="mwb-mini-stat"><span>تنبيه الميزانية</span><strong>${budget.alertAt}%</strong></div>
          <div class="mwb-mini-stat"><span>عمليات موثقة</span><strong>${audit.length}</strong></div>
        </div>
        <div class="mwb-form-grid">
          <label>سقف المصروف الشهري<input id="mwb-budget-limit" type="number" inputmode="decimal" value="${safe.text(budget.monthlyLimit)}"></label>
          <label>التنبيه عند نسبة %<input id="mwb-budget-alert" type="number" min="50" max="100" value="${safe.text(budget.alertAt)}"></label>
        </div>
        <div class="mwb-dialog-actions">
          <button type="button" class="mwb-primary-button" id="mwb-save-budget">حفظ الميزانية</button>
          <button type="button" class="mwb-secondary-button" id="mwb-show-audit">عرض آخر العمليات</button>
        </div>
        <div class="mwb-card-note">نقاط الاسترجاع المحلية المحفوظة: ${restorePoints.length}. يتم إنشاء نقطة تلقائياً قبل الاستيراد أو التصفير.</div>
      `;
      const preferences = Array.from(main.children).find(el => el.textContent.includes('التفضيلات'));
      main.insertBefore(panel, preferences ? preferences.nextSibling : main.firstChild);
      panel.querySelector('#mwb-save-budget').onclick = () => {
        setBudgetSettings({
          monthlyLimit: panel.querySelector('#mwb-budget-limit').value,
          alertAt: panel.querySelector('#mwb-budget-alert').value
        });
        premiumToast('تم حفظ إعدادات الميزانية.', { type: 'success' });
      };
      panel.querySelector('#mwb-show-audit').onclick = () => {
        const log = (DB.getLocalAuditLog ? DB.getLocalAuditLog() : []).slice(0, 8);
        const lines = log.length ? log.map(item => `${new Date(item.at).toLocaleString('ar-JO')} — ${item.label}`).join('\n') : 'لا توجد عمليات موثقة بعد.';
        alert(lines);
      };
    }

    if (typeof window.loadAll === 'function' && !window.loadAll.__mwbPatched) {
      const originalLoadAll = window.loadAll;
      window.loadAll = async function patchedLoadAll() {
        const result = await originalLoadAll();
        renderSettingsEnhancements();
        return result;
      };
      window.loadAll.__mwbPatched = true;
    }

    window.handleImport = async function upgradedHandleImport(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        UI.setLoading?.(true);
        const text = await file.text();
        const data = JSON.parse(text);
        const validation = DB.validateBackupSchema ? DB.validateBackupSchema(data) : { ok: true, errors: [] };
        if (!validation.ok) {
          premiumToast(validation.errors.slice(0, 3).join(' / '), { type: 'error', ttl: 9000 });
          return;
        }
        const counts = `حسابات: ${data.accounts.length}، فئات: ${data.categories.length}، حركات: ${data.transactions.length}، التزامات: ${data.commitments.length}`;
        const ok = await confirmAction({
          title: 'استيراد نسخة احتياطية',
          message: `سيتم إنشاء نقطة استرجاع محلية ثم استبدال البيانات الحالية. محتوى الملف: ${counts}.`,
          confirmText: 'استيراد الآن',
          danger: true
        });
        if (!ok) return;
        await DB.importData(app.user.uid, data);
        premiumToast('تم الاستيراد بنجاح.', { type: 'success' });
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        console.error(error);
        premiumToast(error.message || 'الملف غير صالح أو حدث خطأ.', { type: 'error', ttl: 9000 });
      } finally {
        UI.setLoading?.(false);
        event.target.value = '';
      }
    };

    if (typeof window.resetData === 'function') {
      window.resetData = async function upgradedResetData() {
        const ok = await confirmAction({
          title: 'تصفير الحساب',
          message: 'سيتم حفظ نقطة استرجاع محلية ثم حذف الحسابات والحركات والفئات والالتزامات. لا تنفذ هذا الإجراء إلا إذا كنت متأكداً.',
          confirmText: 'تصفير الحساب',
          danger: true
        });
        if (!ok) return;
        try {
          UI.setLoading?.(true);
          await DB.clearAllUserData(app.user.uid);
          premiumToast('تم تصفير البيانات مع حفظ نقطة استرجاع محلية.', { type: 'success' });
          setTimeout(() => window.location.reload(), 800);
        } catch (error) {
          console.error(error);
          premiumToast('حدث خطأ أثناء تصفير البيانات.', { type: 'error' });
        } finally {
          UI.setLoading?.(false);
        }
      };
    }

    document.addEventListener('DOMContentLoaded', renderSettingsEnhancements);
    setTimeout(renderSettingsEnhancements, 0);
  }

  function patchAuthAndInstallExperience() {
    if (!location.pathname.endsWith('index.html')) return;
    document.addEventListener('DOMContentLoaded', () => {
      const card = document.querySelector('.auth-card, form, main, body');
      if (!card || document.getElementById('mwb-auth-trust')) return;
      const panel = document.createElement('div');
      panel.id = 'mwb-auth-trust';
      panel.className = 'mwb-trust-panel';
      panel.style.marginTop = '18px';
      panel.innerHTML = `
        <div class="mwb-panel-title">تجربة مالية خاصة وآمنة</div>
        <div class="mwb-panel-subtitle">بعد الدخول ستجد Wizard لأول استخدام، ميزانية شهرية، Forecast للرصيد، ونسخة احتياطية أكثر أماناً.</div>
        <div class="mwb-status-row"><span class="mwb-chip mwb-chip--success">PWA جاهز</span><span class="mwb-chip">Firebase</span><span class="mwb-chip">RTL Arabic</span></div>
      `;
      document.body.appendChild(panel);
      panel.style.width = 'min(92vw, 520px)';
      panel.style.marginInline = 'auto';
      panel.style.marginBottom = '24px';
    });
  }

  function installPostLoadWatchers() {
    const ticks = [250, 900, 1800, 3200];
    ticks.forEach(delay => {
      setTimeout(() => {
        try {
          patchDBLayer();
          installNetWorthChartPatch();
          if (location.pathname.endsWith('dashboard.html') && window.state?.accounts) {
            if (typeof window.renderNetWorthChart === 'function') window.renderNetWorthChart();
            renderDashboardIntelligence();
          }
          if (location.pathname.endsWith('transactions.html')) {
            const toolbar = document.getElementById('mwb-ledger-toolbar');
            if (!toolbar) patchTransactionsPage();
          }
          if ((location.pathname.endsWith('accounts.html') || location.pathname.endsWith('account-details.html')) && !document.getElementById('mwb-account-ops')) {
            patchAccountsPages();
          }
          if (location.pathname.endsWith('settings.html') && !document.getElementById('mwb-settings-budget')) {
            patchSettingsPage();
          }
        } catch (error) {
          console.warn('Money with Basel upgrade watcher skipped:', error);
        }
      }, delay);
    });
  }

  function installKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.key === 'n' && typeof window.openAddModal === 'function') openAddModal('expense');
      if (event.key === 'i' && typeof window.openAddModal === 'function') openAddModal('income');
      if (event.key === '/' && location.pathname.endsWith('transactions.html')) {
        event.preventDefault();
        const input = document.querySelector('input[type="search"], #search-input, input[placeholder*="بحث"]');
        input?.focus();
      }
      if (event.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active, .mwb-confirm-overlay.active, .mwb-wizard-overlay.active, .mwb-reconcile-overlay.active').forEach(el => el.classList.remove('active'));
      }
    });
  }

  function init() {
    installGlobalUI();
    patchDBLayer();
    patchDashboard();
    patchTransactionsPage();
    patchAccountsPages();
    patchSettingsPage();
    patchAuthAndInstallExperience();
    installKeyboardShortcuts();
    installPostLoadWatchers();
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.dataset.mwbVersion = VERSION;
      const version = document.getElementById('app-version-display');
      if (version) version.textContent = `الإصدار ${VERSION}`;
    });
  }

  init();
})();
