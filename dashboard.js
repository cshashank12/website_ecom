/* ============================================================
   ROYAL ABAYA — Dashboard JS
   ============================================================ */

const auth = firebase.auth();
let activePeriod = 30;
let lineChartInst = null;
let donutChartInst = null;

// Chart.js global defaults — dark theme
Chart.defaults.color = '#6B6560';
Chart.defaults.borderColor = 'rgba(201,169,110,0.1)';
Chart.defaults.font.family = "'Inter', sans-serif";

// ── Auth ──────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('authGate').classList.add('hidden');
        document.getElementById('dashWrapper').classList.add('visible');
        initDashboard();
    } else {
        document.getElementById('authGate').classList.remove('hidden');
        document.getElementById('dashWrapper').classList.remove('visible');
    }
});

document.getElementById('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('authError');
    const btn = document.getElementById('authSubmit');
    btn.textContent = 'Logging in…'; btn.disabled = true; errEl.style.display = 'none';
    try {
        await auth.signInWithEmailAndPassword(
            document.getElementById('authEmail').value.trim(),
            document.getElementById('authPassword').value
        );
    } catch {
        errEl.textContent = 'Invalid credentials.'; errEl.style.display = 'block';
        document.getElementById('authEmail').classList.add('error');
        setTimeout(() => document.getElementById('authEmail').classList.remove('error'), 600);
        btn.textContent = 'Login'; btn.disabled = false;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

// ── Period selector ────────────────────────────────────────────
document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePeriod = parseInt(btn.dataset.period);
        loadLedgerData();
    });
});

// ── Init ──────────────────────────────────────────────────────
function initDashboard() {
    loadLedgerData();
    loadRecentReceipts();
    loadStockStatus();
}

// ── Ledger Data (KPIs + Charts) ───────────────────────────────
async function loadLedgerData() {
    removeSkeleton();
    const cutoff = activePeriod > 0
        ? new Date(Date.now() - activePeriod * 86400000).toISOString().split('T')[0]
        : '0000-01-01';

    const [salesSnap, purchasesSnap, expensesSnap] = await Promise.all([
        db.ref('ledger/sales').once('value'),
        db.ref('ledger/purchases').once('value'),
        db.ref('ledger/expenses').once('value'),
    ]);

    const salesEntries = filterByDate(snapToArr(salesSnap), cutoff);
    const purchaseEntries = filterByDate(snapToArr(purchasesSnap), cutoff);
    const expenseEntries = filterByDate(snapToArr(expensesSnap), cutoff);

    const totalSales = sum(salesEntries);
    const totalPurchases = sum(purchaseEntries);
    const totalExpenses = sum(expenseEntries);
    const netProfit = totalSales - totalPurchases - totalExpenses;
    const margin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

    // KPI Cards
    document.getElementById('kpiSales').textContent = fmt(totalSales);
    document.getElementById('kpiPurchases').textContent = fmt(totalPurchases);
    document.getElementById('kpiExpenses').textContent = fmt(totalExpenses);
    document.getElementById('kpiProfit').textContent = fmt(netProfit);
    document.getElementById('kpiProfit').style.color = netProfit >= 0 ? 'var(--accent-gold)' : 'var(--danger)';
    document.getElementById('kpiSalesTxn').textContent = `${salesEntries.length} transactions`;
    document.getElementById('kpiPurchasesTxn').textContent = `${purchaseEntries.length} transactions`;
    document.getElementById('kpiExpensesTxn').textContent = `${expenseEntries.length} transactions`;
    document.getElementById('kpiMargin').textContent = `${margin}% margin`;
    document.getElementById('kpiMargin').style.color = margin >= 0 ? 'var(--sale-color)' : 'var(--danger)';

    // Charts
    buildLineChart(salesEntries, expenseEntries, purchaseEntries);
    buildDonutChart(expenseEntries);
}

function removeSkeleton() {
    ['kpiSales', 'kpiPurchases', 'kpiExpenses', 'kpiProfit'].forEach(id => {
        document.getElementById(id).classList.remove('skeleton');
    });
}

// ── Line Chart ────────────────────────────────────────────────
function buildLineChart(sales, expenses, purchases) {
    // Group by date
    const salesByDay = groupByDate(sales);
    const expensesByDay = groupByDate(expenses);
    const purchasesByDay = groupByDate(purchases);

    // Collect all dates and sort
    const allDates = [...new Set([
        ...Object.keys(salesByDay),
        ...Object.keys(expensesByDay),
        ...Object.keys(purchasesByDay)
    ])].sort();

    if (allDates.length === 0) {
        document.getElementById('lineChart').closest('.chart-card').querySelector('.chart-card-title').textContent
            = 'Sales vs Expenses — No data for this period';
        return;
    }

    const labels = allDates.map(d => formatShortDate(d));
    const salesData = allDates.map(d => salesByDay[d] || 0);
    const expData = allDates.map(d => (expensesByDay[d] || 0) + (purchasesByDay[d] || 0));

    if (lineChartInst) lineChartInst.destroy();
    const ctx = document.getElementById('lineChart').getContext('2d');
    lineChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Sales',
                    data: salesData,
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74,222,128,0.08)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: salesData.length < 20 ? 4 : 0,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Costs (Purchases + Expenses)',
                    data: expData,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249,115,22,0.06)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: expData.length < 20 ? 4 : 0,
                    pointHoverRadius: 6,
                },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: { size: 11 } } } },
            scales: {
                x: { grid: { color: 'rgba(201,169,110,0.06)' }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
                y: {
                    grid: { color: 'rgba(201,169,110,0.06)' },
                    ticks: { font: { size: 10 }, callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) }
                }
            }
        }
    });
}

// ── Donut Chart ────────────────────────────────────────────────
function buildDonutChart(expenses) {
    // Group by category
    const byCategory = {};
    expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });

    const labels = Object.keys(byCategory);
    const values = Object.values(byCategory);

    if (donutChartInst) donutChartInst.destroy();
    if (labels.length === 0) return;

    const colors = ['#a78bfa', '#f97316', '#4ade80', '#60a5fa', '#f43f5e', '#fbbf24', '#34d399', '#c084fc'];
    const ctx = document.getElementById('donutChart').getContext('2d');
    donutChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#161616',
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` } }
            }
        }
    });
}

// ── Recent Receipts ───────────────────────────────────────────
function loadRecentReceipts() {
    db.ref('receipts').orderByChild('createdAt').limitToLast(6).on('value', snap => {
        const el = document.getElementById('recentReceipts');
        const items = [];
        snap.forEach(child => items.push(child.val()));
        items.reverse();

        if (items.length === 0) {
            el.innerHTML = '<div class="list-empty">No receipts saved yet.</div>';
            return;
        }
        el.innerHTML = items.map(r => `
            <div class="receipt-item">
                <div class="receipt-badge">${(r.receiptNo || 'RA').replace('RA-', '')}</div>
                <div class="receipt-info">
                    <div class="receipt-name">${esc(r.customerName || 'Customer')}</div>
                    <div class="receipt-meta">${formatShortDate(r.date)} · ${esc(r.paymentMode || '')}</div>
                </div>
                <div class="receipt-amt">₹${Number(r.total || 0).toLocaleString('en-IN')}</div>
            </div>
        `).join('');
    });
}

// ── Stock Status ───────────────────────────────────────────────
function loadStockStatus() {
    db.ref('products').on('value', snap => {
        const el = document.getElementById('stockList');
        const products = [];
        if (snap.val()) {
            Object.values(snap.val()).forEach(p => products.push(p));
        }

        if (products.length === 0) {
            el.innerHTML = '<div class="list-empty">No products found.</div>';
            return;
        }

        // Sort by stock ascending (lowest first)
        products.sort((a, b) => (a.stock ?? 99) - (b.stock ?? 99));

        el.innerHTML = products.slice(0, 6).map(p => {
            const stock = p.stock;
            let badgeClass, badgeText;
            if (stock === undefined || stock === null || stock === '') {
                badgeClass = ''; badgeText = 'No stock data';
            } else if (stock <= 0) {
                badgeClass = 'badge-out'; badgeText = 'Out of Stock';
            } else if (stock <= 5) {
                badgeClass = 'badge-low'; badgeText = `Low: ${stock} left`;
            } else {
                badgeClass = 'badge-ok'; badgeText = `${stock} in stock`;
            }
            return `
                <div class="stock-item">
                    <img class="stock-thumb" src="${p.image || ''}" alt="${esc(p.name)}">
                    <div class="stock-info">
                        <div class="stock-name">${esc(p.name)}</div>
                        <div class="stock-cat">${esc(p.category || '')}</div>
                    </div>
                    ${badgeClass ? `<span class="stock-badge ${badgeClass}">${badgeText}</span>` : `<span style="font-size:0.68rem;color:var(--text-muted)">${badgeText}</span>`}
                </div>
            `;
        }).join('');
    });
}

// ── Helpers ───────────────────────────────────────────────────
function snapToArr(snap) {
    const arr = [];
    snap.forEach(child => arr.push(child.val()));
    return arr;
}

function filterByDate(arr, cutoff) {
    return arr.filter(e => (e.date || '') >= cutoff);
}

function sum(arr) {
    return arr.reduce((s, e) => s + Number(e.amount || 0), 0);
}

function groupByDate(arr) {
    const map = {};
    arr.forEach(e => {
        if (e.date) map[e.date] = (map[e.date] || 0) + Number(e.amount || 0);
    });
    return map;
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fmt(n) {
    const abs = Math.abs(Math.round(n));
    const str = abs >= 100000
        ? '₹' + (abs / 100000).toFixed(1) + 'L'
        : abs >= 1000
            ? '₹' + (abs / 1000).toFixed(1) + 'k'
            : '₹' + abs.toLocaleString('en-IN');
    return n < 0 ? '-' + str : str;
}

function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
