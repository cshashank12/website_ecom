/* ============================================================
   ROYAL ABAYA — Business Ledger JS
   ============================================================ */

const auth = firebase.auth();
let currentTab = 'sales';
let unsubscribeListener = null;

// ── Summaries (all-time, updated in real-time) ──────────────
const summaryTotals = { sales: 0, purchases: 0, expenses: 0 };

// ── Auth handling ─────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('authGate').classList.add('hidden');
        document.getElementById('ledgerWrapper').classList.add('visible');
        initLedger();
    } else {
        document.getElementById('authGate').classList.remove('hidden');
        document.getElementById('ledgerWrapper').classList.remove('visible');
    }
});

document.getElementById('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const pwd = document.getElementById('authPassword').value;
    const errEl = document.getElementById('authError');
    const btn = document.getElementById('authSubmit');
    btn.textContent = 'Logging in…';
    btn.disabled = true;
    errEl.style.display = 'none';
    try {
        await auth.signInWithEmailAndPassword(email, pwd);
    } catch (err) {
        errEl.textContent = 'Invalid credentials. Please try again.';
        errEl.style.display = 'block';
        document.getElementById('authEmail').classList.add('error');
        setTimeout(() => document.getElementById('authEmail').classList.remove('error'), 600);
        btn.textContent = 'Login';
        btn.disabled = false;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (unsubscribeListener) unsubscribeListener();
    auth.signOut();
});

// ── Init ──────────────────────────────────────────────────────
function initLedger() {
    setTodayDate();
    setActiveTab('sales');

    // Listen to all three buckets for summary totals
    ['sales', 'purchases', 'expenses'].forEach(type => {
        db.ref(`ledger/${type}`).on('value', snap => {
            let total = 0;
            snap.forEach(child => { total += Number(child.val().amount) || 0; });
            summaryTotals[type] = total;
            updateSummaryUI();
        });
    });
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;
}

function updateSummaryUI() {
    const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
    document.getElementById('totalSales').textContent = fmt(summaryTotals.sales);
    document.getElementById('totalPurchases').textContent = fmt(summaryTotals.purchases);
    document.getElementById('totalExpenses').textContent = fmt(summaryTotals.expenses);
    const profit = summaryTotals.sales - summaryTotals.purchases - summaryTotals.expenses;
    const profitEl = document.getElementById('netProfit');
    profitEl.textContent = fmt(profit);
    profitEl.style.color = profit >= 0 ? 'var(--accent-gold)' : 'var(--danger)';
}

// ── Tabs ──────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
});

function setActiveTab(tab) {
    currentTab = tab;

    // Deactivate all tabs
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active-sale', 'active-purchase', 'active-expense');
    });

    const activeClass = tab === 'sales' ? 'active-sale' : tab === 'purchases' ? 'active-purchase' : 'active-expense';
    document.getElementById(`tab${capitalize(tab)}`).classList.add(activeClass);

    // Update form title & list title
    const labels = { sales: 'Sale', purchases: 'Purchase', expenses: 'Expense' };
    const listLabels = { sales: 'Sales', purchases: 'Purchase', expenses: 'Expense' };
    document.getElementById('formTitle').textContent = `Add ${labels[tab]} Entry`;
    document.getElementById('listTitle').textContent = `${listLabels[tab]} Entries`;

    // Update category options based on tab
    updateCategoryOptions(tab);

    // Reload entries list for this tab
    loadEntries(tab);
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function updateCategoryOptions(tab) {
    const select = document.getElementById('entryCategory');
    const options = {
        sales: ['General', 'Online', 'Walk-in', 'Bulk Order', 'Other'],
        purchases: ['Fabric', 'Accessories', 'Packaging', 'Stock', 'Other'],
        expenses: ['Rent', 'Utilities', 'Salary', 'Shipping', 'Marketing', 'Maintenance', 'Other'],
    };
    select.innerHTML = options[tab].map(o => `<option value="${o}">${o}</option>`).join('');
}

// ── Load entries ──────────────────────────────────────────────
function loadEntries(tab) {
    // Detach previous listener
    if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }

    const ref = db.ref(`ledger/${tab}`).orderByChild('date');
    const listEl = document.getElementById('entriesList');
    const countEl = document.getElementById('entriesCount');

    const handler = snap => {
        const entries = [];
        snap.forEach(child => entries.push({ key: child.key, ...child.val() }));
        entries.reverse(); // newest first

        listEl.innerHTML = '';
        countEl.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;

        if (entries.length === 0) {
            listEl.innerHTML = '<li class="entries-empty">No entries yet. Add your first entry above.</li>';
            return;
        }

        entries.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'entry-item';
            const dotClass = tab === 'sales' ? 'dot-sale' : tab === 'purchases' ? 'dot-purchase' : 'dot-expense';
            const amtClass = tab === 'sales' ? 'amount-sale' : tab === 'purchases' ? 'amount-purchase' : 'amount-expense';
            const autoBadge = entry.autoFromReceipt
                ? `<span style="font-size:0.62rem;background:rgba(212,175,55,0.12);color:var(--accent-gold);border:1px solid rgba(212,175,55,0.25);border-radius:20px;padding:2px 7px;margin-left:6px;vertical-align:middle">🧾 Auto</span>`
                : '';
            const refLine = entry.receiptRef ? ` · ${escHtml(entry.receiptRef)}` : '';
            li.innerHTML = `
                <div class="entry-dot ${dotClass}"></div>
                <div class="entry-info">
                    <div class="entry-desc">${escHtml(entry.desc)}${autoBadge}</div>
                    <div class="entry-meta">${formatDate(entry.date)} · ${escHtml(entry.category)}${refLine}${entry.notes ? ' · ' + escHtml(entry.notes) : ''}</div>
                </div>
                <div class="entry-amount ${amtClass}">₹${Number(entry.amount).toLocaleString('en-IN')}</div>
                <button class="entry-del" title="Delete entry" data-key="${entry.key}" data-tab="${tab}">🗑</button>
            `;
            listEl.appendChild(li);
        });

        // Attach delete handlers
        listEl.querySelectorAll('.entry-del').forEach(btn => {
            btn.addEventListener('click', () => deleteEntry(btn.dataset.tab, btn.dataset.key));
        });
    };

    ref.on('value', handler);
    unsubscribeListener = () => ref.off('value', handler);
}

// ── Add entry ─────────────────────────────────────────────────
document.getElementById('addEntryBtn').addEventListener('click', addEntry);

async function addEntry() {
    const date = document.getElementById('entryDate').value;
    const amount = parseFloat(document.getElementById('entryAmount').value);
    const desc = document.getElementById('entryDesc').value.trim();
    const category = document.getElementById('entryCategory').value;
    const notes = document.getElementById('entryNotes').value.trim();

    if (!date || !desc || isNaN(amount) || amount <= 0) {
        showToast('Please fill in date, description, and a valid amount.', 'error');
        return;
    }

    const btn = document.getElementById('addEntryBtn');
    btn.textContent = 'Saving…';
    btn.disabled = true;

    try {
        await db.ref(`ledger/${currentTab}`).push({
            date, amount, desc, category, notes,
            createdAt: Date.now()
        });
        // Reset form (keep date)
        document.getElementById('entryAmount').value = '';
        document.getElementById('entryDesc').value = '';
        document.getElementById('entryNotes').value = '';
        showToast('Entry added successfully!', 'success');
    } catch (err) {
        showToast('Failed to save. Please try again.', 'error');
        console.error(err);
    } finally {
        btn.textContent = 'Add Entry';
        btn.disabled = false;
    }
}

// ── Delete entry ──────────────────────────────────────────────
async function deleteEntry(tab, key) {
    if (!confirm('Delete this entry?')) return;
    try {
        await db.ref(`ledger/${tab}/${key}`).remove();
        showToast('Entry deleted.', 'success');
    } catch (err) {
        showToast('Failed to delete.', 'error');
    }
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toastText').textContent = msg;
    toast.className = `toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}
