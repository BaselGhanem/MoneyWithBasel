// ============================================================
// js/automation.js — Money with Basel | Automation & Recurring
// ============================================================

const AutomationEngine = {
    
    // حالة التشغيل لمنع التكرار المزدوج في نفس اللحظة
    isRunning: false,

    /**
     * تشغيل محرك الأتمتة (يتم استدعاؤه عادة عند فتح التطبيق / تسجيل الدخول)
     * @param {string} uid - معرف المستخدم
     */
    async run(uid) {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🔄 جاري تشغيل محرك الأتمتة والتحقق من الالتزامات...');

        try {
            // 1. التأكد من توفر دوال قاعدة البيانات
            if (!window.DB || typeof window.DB.getCommitments !== 'function') {
                console.warn('⚠️ دوال قاعدة البيانات (DB) غير محملة أو مفقودة.');
                this.isRunning = false;
                return;
            }

            // 2. جلب كافة الالتزامات الثابتة الخاصة بالمستخدم
            const commitments = await window.DB.getCommitments(uid);
            if (!commitments || commitments.length === 0) {
                console.log('✅ لا توجد التزامات ثابتة مجدولة.');
                this.isRunning = false;
                return;
            }

            // 3. تصفية الالتزامات المستحقة فقط (التي حان موعدها أو تأخرت)
            const pendingCommitments = this.getDueCommitments(commitments);
            
            // 4. تنفيذ الالتزامات
            if (pendingCommitments.length > 0) {
                console.log(`⏳ تم العثور على ${pendingCommitments.length} التزامات مستحقة. جاري التنفيذ...`);
                await this.processBatch(uid, pendingCommitments);
                
                // إظهار إشعار للمستخدم بنجاح العملية (عبر UI.js)
                if (window.UI) {
                    const msg = pendingCommitments.length === 1 
                        ? 'تم تنفيذ التزام مالي ثابت تلقائياً 🤖' 
                        : `تم تنفيذ ${pendingCommitments.length} التزامات ثابتة تلقائياً 🤖`;
                    window.UI.showToast(msg, 'success');
                }
            } else {
                console.log('✅ كافة الالتزامات محدثة ولا يوجد شيء مستحق حالياً.');
            }

        } catch (error) {
            console.error('❌ حدث خطأ في محرك الأتمتة:', error);
        } finally {
            this.isRunning = false;
        }
    },

    /**
     * دالة لتصفية الالتزامات ومعرفة أي منها حان وقت تنفيذه
     * @param {Array} commitments - مصفوفة الالتزامات
     * @returns {Array} الالتزامات المستحقة للتنفيذ
     */
    getDueCommitments(commitments) {
        const now = new Date();
        
        return commitments.filter(c => {
            // تجاهل الالتزامات الموقوفة
            if (!c.isActive) return false;
            
            let nextRun = null;

            // إذا كان الالتزام يحتوي على تاريخ تنفيذ قادم محفوظ مسبقاً
            if (c.nextRunDate) {
                // تحويل التاريخ سواء كان كائن Date أو نص ISO أو Firestore Timestamp
                nextRun = c.nextRunDate.toDate ? c.nextRunDate.toDate() : new Date(c.nextRunDate);
            } else {
                // إذا كان التزاماً جديداً ولم يُحسب له تاريخ قادم، نحسبه الآن
                nextRun = this.calculateNextRunDate(c.dayOfMonth, c.startDate ? new Date(c.startDate) : new Date());
            }

            // إذا كان تاريخ التنفيذ القادم أقدم من أو يساوي وقتنا الحالي، فهو مستحق
            return nextRun <= now;
        });
    },

    /**
     * معالجة دفعة الالتزامات وإدخالها كحركات مالية (Transactions)
     */
    async processBatch(uid, pendingCommitments) {
        for (const commitment of pendingCommitments) {
            try {
                // 1. تسجيل الحركة في السجل باستخدام دالة DB.processCommitment المجهزة مسبقاً
                await window.DB.processCommitment(commitment);
                
                // 2. تحديث الرصيد للحساب المرتبط (خصم أو إضافة)
                const amountChange = commitment.type === 'expense' ? -Math.abs(commitment.amount) : Math.abs(commitment.amount);
                await window.DB.updateAccountBalance(commitment.accountId, amountChange);

                // 3. حساب موعد الاستحقاق القادم (الشهر القادم)
                const nextRun = this.calculateNextRunDate(commitment.dayOfMonth, new Date());
                
                // 4. تحديث حالة الالتزام في قاعدة البيانات (تاريخ آخر تشغيل والتاريخ القادم)
                await window.DB.updateCommitment(commitment.id, {
                    lastRunDate: new Date().toISOString(),
                    nextRunDate: nextRun.toISOString()
                });

                console.log(`✅ تم تنفيذ الالتزام: ${commitment.name} | الموعد القادم: ${nextRun.toLocaleDateString('ar-EG')}`);

            } catch (err) {
                console.error(`❌ فشل في تنفيذ الالتزام "${commitment.name}" (${commitment.id}):`, err);
            }
        }
    },

    /**
     * حساب تاريخ التنفيذ القادم بذكاء شديد (التعامل مع الأشهر القصيرة مثل فبراير)
     * @param {number} dayOfMonth - اليوم الذي يجب التنفيذ فيه (مثال: 25 من كل شهر)
     * @param {Date} fromDate - التاريخ الذي نبدأ الحساب منه
     * @returns {Date} التاريخ القادم للتنفيذ
     */
    calculateNextRunDate(dayOfMonth, fromDate = new Date()) {
        let date = new Date(fromDate);
        let targetMonth = date.getMonth();
        let targetYear = date.getFullYear();

        // إذا كان اليوم المستهدف قد مضى في الشهر الحالي أو نحن فيه الآن (لضمان عدم التنفيذ المزدوج)
        if (date.getDate() >= dayOfMonth) {
            targetMonth++; // ننتقل للشهر القادم
            if (targetMonth > 11) {
                targetMonth = 0; // إذا تجاوزنا ديسمبر، نعود ليناير
                targetYear++;    // ونزيد السنة
            }
        }

        // ذكاء التقويم: ماذا لو كان dayOfMonth هو 31 والمستهدف شهر فبراير؟
        // الدالة التالية تجلب عدد أيام الشهر المستهدف (مثلاً فبراير سيُرجع 28 أو 29)
        let maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        
        // إذا كان اليوم المطلوب أكبر من أيام الشهر، نستخدم آخر يوم في الشهر
        let actualDay = Math.min(dayOfMonth, maxDaysInTargetMonth);

        // تحديد موعد التنفيذ الساعة 8:00 صباحاً من ذلك اليوم
        return new Date(targetYear, targetMonth, actualDay, 8, 0, 0);
    }
};

// جعل المحرك متاحاً عالمياً للاستدعاء
window.AutomationEngine = AutomationEngine;

// استدعاء تجريبي للاختبار (في التطبيق الحقيقي سيتم وضع هذا في app.js بعد تسجيل الدخول)
/*
document.addEventListener('DOMContentLoaded', () => {
    // محاكاة تأخير بسيط للتأكد من تحمل دوال قاعدة البيانات
    setTimeout(() => {
        // نفترض أن uid موجود في الكائن العام app.user.uid
        const mockUid = 'user_123'; 
        AutomationEngine.run(mockUid);
    }, 2000);
});
*/
