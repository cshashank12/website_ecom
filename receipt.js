/* ============================================================
   ROYAL ABAYA — Receipt Generator JS
   ============================================================ */

const auth = firebase.auth();
let selectedPayment = 'UPI';
let receiptCounter = 1;

// ── Auth ──────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('authGate').classList.add('hidden');
        document.getElementById('receiptWrapper').classList.add('visible');
        initReceipt();
    } else {
        document.getElementById('authGate').classList.remove('hidden');
        document.getElementById('receiptWrapper').classList.remove('visible');
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
    } catch {
        errEl.textContent = 'Invalid credentials. Please try again.';
        errEl.style.display = 'block';
        document.getElementById('authEmail').classList.add('error');
        setTimeout(() => document.getElementById('authEmail').classList.remove('error'), 600);
        btn.textContent = 'Login';
        btn.disabled = false;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

// ── Init ──────────────────────────────────────────────────────
function initReceipt() {
    setReceiptMeta();
    addItemRow(); // start with one row
    bindLiveUpdate();
    fetchReceiptCounter();
}

function setReceiptMeta() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('prevDate').textContent = dateStr;
}

// Fetch next receipt number from Firebase
function fetchReceiptCounter() {
    db.ref('receiptCounter').once('value', snap => {
        receiptCounter = (snap.val() || 0) + 1;
        document.getElementById('prevReceiptNo').textContent = `Receipt #RA-${String(receiptCounter).padStart(4, '0')}`;
    });
}

// ── Item Rows ─────────────────────────────────────────────────
let itemCount = 0;

function addItemRow(name = '', qty = 1, mrp = '') {
    itemCount++;
    const container = document.getElementById('itemsContainer');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = `itemRow${itemCount}`;
    row.innerHTML = `
        <input type="text"   class="form-input item-name" placeholder="Item name" value="${escHtml(name)}">
        <input type="number" class="form-input item-qty"  placeholder="1" value="${qty}" min="1">
        <input type="number" class="form-input item-mrp"  placeholder="0" value="${mrp}" min="0" step="1">
        <button class="remove-item-btn" title="Remove">✕</button>
    `;
    row.querySelector('.remove-item-btn').addEventListener('click', () => {
        if (document.querySelectorAll('.item-row').length > 1) {
            row.remove();
            updatePreview();
        } else {
            showToast('At least one item is required.', 'error');
        }
    });
    // Live update on input
    row.querySelectorAll('input').forEach(inp => inp.addEventListener('input', updatePreview));
    container.appendChild(row);
    updatePreview();
}

document.getElementById('addItemBtn').addEventListener('click', () => addItemRow());

// ── Payment toggle ─────────────────────────────────────────────
document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPayment = btn.dataset.pay;
        updatePreview();
    });
});

// ── Live Updates ──────────────────────────────────────────────
function bindLiveUpdate() {
    ['custName', 'custPhone', 'discountFlat', 'discountPct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
    });
}

function updatePreview() {
    // Customer
    const custName = document.getElementById('custName').value.trim() || 'Customer';
    const custPhone = document.getElementById('custPhone').value.trim();
    document.getElementById('prevCustName').textContent = custName;
    document.getElementById('prevCustPhone').textContent = custPhone;

    // Items
    const rows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    let tbody = '';
    rows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim() || '—';
        const qty = Math.max(1, parseInt(row.querySelector('.item-qty').value) || 1);
        const mrp = parseFloat(row.querySelector('.item-mrp').value) || 0;
        const lineTotal = qty * mrp;
        subtotal += lineTotal;
        tbody += `<tr>
            <td>${escHtml(name)}</td>
            <td style="text-align:center">${qty}</td>
            <td style="text-align:right">₹${mrp.toLocaleString('en-IN')}</td>
            <td style="text-align:right">₹${lineTotal.toLocaleString('en-IN')}</td>
        </tr>`;
    });
    document.getElementById('prevItemsBody').innerHTML = tbody || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:12px 0;">No items</td></tr>';
    document.getElementById('prevSubtotal').textContent = '₹' + subtotal.toLocaleString('en-IN');

    // Discount — flat takes priority if both filled
    let discount = 0;
    const flatVal = parseFloat(document.getElementById('discountFlat').value) || 0;
    const pctVal = parseFloat(document.getElementById('discountPct').value) || 0;

    if (flatVal > 0) {
        discount = Math.min(flatVal, subtotal);
    } else if (pctVal > 0) {
        discount = Math.min((pctVal / 100) * subtotal, subtotal);
    }

    const discountRow = document.getElementById('prevDiscountRow');
    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('prevDiscount').textContent = '-₹' + discount.toLocaleString('en-IN');
    } else {
        discountRow.style.display = 'none';
    }

    const total = subtotal - discount;
    document.getElementById('prevTotal').textContent = '₹' + total.toLocaleString('en-IN');

    // Payment
    const icons = { 'UPI': '📱', 'Cash': '💵', 'Credit Card': '💳' };
    document.getElementById('prevPayment').querySelector('span:first-child').textContent = icons[selectedPayment] || '💳';
    document.getElementById('prevPaymentText').textContent = `Paid via ${selectedPayment}`;
}

// ── Print ──────────────────────────────────────────────────────
document.getElementById('printBtn').addEventListener('click', () => {
    updatePreview();
    setTimeout(() => window.print(), 100);
});

// ── Save Receipt to Firebase ─────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', async () => {
    const rows = document.querySelectorAll('.item-row');
    const items = [];
    let subtotal = 0;
    rows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = parseInt(row.querySelector('.item-qty').value) || 1;
        const mrp = parseFloat(row.querySelector('.item-mrp').value) || 0;
        const total = qty * mrp;
        subtotal += total;
        if (name) items.push({ name, qty, mrp, total });
    });

    if (items.length === 0) { showToast('Please add at least one item.', 'error'); return; }

    const flatVal = parseFloat(document.getElementById('discountFlat').value) || 0;
    const pctVal = parseFloat(document.getElementById('discountPct').value) || 0;
    let discount = flatVal > 0 ? Math.min(flatVal, subtotal) : Math.min((pctVal / 100) * subtotal, subtotal);
    const grandTotal = subtotal - discount;

    const receipt = {
        receiptNo: `RA-${String(receiptCounter).padStart(4, '0')}`,
        customerName: document.getElementById('custName').value.trim() || 'Customer',
        customerPhone: document.getElementById('custPhone').value.trim(),
        items,
        subtotal,
        discount,
        total: grandTotal,
        paymentMode: selectedPayment,
        createdAt: Date.now(),
        date: new Date().toISOString().split('T')[0],
    };

    const btn = document.getElementById('saveBtn');
    btn.textContent = 'Saving…';
    btn.disabled = true;

    try {
        await db.ref('receipts').push(receipt);
        // Increment counter
        await db.ref('receiptCounter').set(receiptCounter);
        receiptCounter++;
        document.getElementById('prevReceiptNo').textContent = `Receipt #RA-${String(receiptCounter).padStart(4, '0')}`;
        showToast('Receipt saved successfully!', 'success');
    } catch (err) {
        showToast('Failed to save. Check your connection.', 'error');
        console.error(err);
    } finally {
        btn.textContent = '💾 Save Receipt';
        btn.disabled = false;
    }
});

// ── Clear form ─────────────────────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('Clear the current receipt?')) return;
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('discountFlat').value = '';
    document.getElementById('discountPct').value = '';
    document.getElementById('itemsContainer').innerHTML = '';
    itemCount = 0;
    addItemRow();
    // Reset payment to UPI
    document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-pay="UPI"]').classList.add('active');
    selectedPayment = 'UPI';
    updatePreview();
});

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toastText').textContent = msg;
    toast.className = `toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}
