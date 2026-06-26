// ============================================================
// js/charts.js — Money with Basel | Data Visualization
// ============================================================

const AppCharts = {
    // تخزين كائنات المخططات لتحديثها أو تدميرها عند الحاجة
    instances: {
        trendChart: null,
        categoryChart: null
    },

    // ألوان الهوية البصرية المطابقة لملف الإعدادات (Tailwind)
    colors: {
        income: '#4caf50',       // أخضر
        expense: '#ff4444',      // أحمر
        primary: '#ff2d78',      // وردي
        secondary: '#00ffcc',    // فيروزي
        tertiary: '#ffe04a',     // أصفر
        text: '#a098b0',         // لون النصوص الداكنة
        gridLines: '#1a1a28'     // لون خطوط الشبكة
    },

    // التهيئة الأولية للمخططات
    init() {
        // التأكد من أن مكتبة Chart.js محملة في الصفحة
        if (typeof Chart === 'undefined') {
            console.warn('مكتبة Chart.js غير محملة. يرجى إضافتها في ملف HTML.');
            return;
        }

        // إعدادات عامة لكل المخططات
        Chart.defaults.font.family = "'Almarai', sans-serif";
        Chart.defaults.color = this.colors.text;
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        
        // إعدادات الـ Tooltip (النافذة المنبثقة عند لمس المخطط)
        Chart.defaults.plugins.tooltip.backgroundColor = '#0f0f1a';
        Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
        Chart.defaults.plugins.tooltip.bodyColor = '#e8e0f0';
        Chart.defaults.plugins.tooltip.borderColor = '#1e1e30';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.displayColors = true;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        // دعم اتجاه النص من اليمين لليسار في التولتيب
        Chart.defaults.plugins.tooltip.rtl = true;
    },

    /**
     * رسم مخطط خطي/عمودي (Bar/Line Chart) لملخص الإيرادات والمصاريف
     * @param {string} canvasId - معرف عنصر الـ canvas في HTML
     * @param {object} data - البيانات (labels, incomeData, expenseData)
     */
    renderTrendChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // تدمير المخطط القديم إذا كان موجوداً لتجنب التداخل
        if (this.instances.trendChart) {
            this.instances.trendChart.destroy();
        }

        this.instances.trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels || ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [
                    {
                        label: 'الإيرادات',
                        data: data.incomeData || [0, 0, 0, 0, 0, 0],
                        backgroundColor: this.colors.income + 'CC', // إضافة شفافية
                        borderColor: this.colors.income,
                        borderWidth: 1,
                        borderRadius: 6, // حواف دائرية للأعمدة
                        barPercentage: 0.6
                    },
                    {
                        label: 'المصاريف',
                        data: data.expenseData || [0, 0, 0, 0, 0, 0],
                        backgroundColor: this.colors.expense + 'CC',
                        borderColor: this.colors.expense,
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: this.colors.gridLines,
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' د.ا'; // إضافة العملة
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false // إخفاء الخطوط العمودية لنظافة التصميم
                        }
                    }
                }
            }
        });
    },

    /**
     * رسم مخطط دائري (Doughnut Chart) لتوزيع المصاريف حسب الفئات
     * @param {string} canvasId - معرف عنصر الـ canvas
     * @param {object} data - البيانات (labels, series)
     */
    renderCategoryChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.instances.categoryChart) {
            this.instances.categoryChart.destroy();
        }

        // ألوان مخصصة لفئات المصاريف
        const categoryColors = [
            this.colors.primary, 
            this.colors.tertiary, 
            this.colors.secondary, 
            '#9c27b0', // بنفسجي
            '#ff9800', // برتقالي
            '#03a9f4'  // أزرق فاتح
        ];

        this.instances.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || ['بدون فئة'],
                datasets: [{
                    data: data.series || [100],
                    backgroundColor: categoryColors.slice(0, (data.labels || ['1']).length),
                    borderWidth: 2,
                    borderColor: '#0f0f1a', // نفس لون خلفية الـ Surface
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '75%', // حجم الفراغ الداخلي للدائرة
                plugins: {
                    legend: {
                        display: false // سنقوم بإنشاء Legend مخصص في HTML ليكون أجمل
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) {
                                    // تنسيق الرقم كعملة
                                    label += new Intl.NumberFormat('ar-JO', { style: 'currency', currency: 'JOD' }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    },

    // دالة لتحديث المخططات ببيانات جديدة (تُستدعى بعد جلب البيانات من قاعدة البيانات)
    updateCharts(trendData, categoryData) {
        if(trendData) {
            this.renderTrendChart('trend-chart', trendData);
        }
        if(categoryData) {
            this.renderCategoryChart('category-chart', categoryData);
        }
    }
};

// تهيئة إعدادات Chart.js عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    AppCharts.init();
    
    // بيانات وهمية للتجربة (Mock Data) - سيتم استبدالها ببيانات حقيقية من db.js لاحقاً
    // للتحقق من عمل المخططات، تأكد من وجود <canvas id="trend-chart"></canvas> في صفحة dashboard.html
    /*
    setTimeout(() => {
        AppCharts.updateCharts(
            {
                labels: ['1 مايو', '5 مايو', '10 مايو', '15 مايو', '20 مايو'],
                incomeData: [0, 850, 0, 100, 0],
                expenseData: [45, 120, 30, 200, 15]
            },
            {
                labels: ['مطاعم', 'مواصلات', 'فواتير', 'تسوق'],
                series: [150, 60, 80, 200]
            }
        );
    }, 500);
    */
});
