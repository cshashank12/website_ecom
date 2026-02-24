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

// ── WhatsApp Receipt ──────────────────────────────────────────
document.getElementById('whatsappBtn').addEventListener('click', sendWhatsApp);

function sendWhatsApp() {
    const custName = document.getElementById('custName').value.trim() || 'Customer';
    const custPhone = document.getElementById('custPhone').value.trim();

    if (!custPhone) {
        showToast('Please enter the customer phone number first.', 'error');
        document.getElementById('custPhone').focus();
        return;
    }

    // Normalise phone → international (default +91 India if no country code)
    let phone = custPhone.replace(/[\s\-()]/g, '');
    if (phone.startsWith('+')) {
        phone = phone.slice(1); // remove leading +
    } else if (phone.startsWith('0')) {
        phone = '91' + phone.slice(1);
    } else if (!phone.startsWith('91') || phone.length < 12) {
        phone = '91' + phone;
    }

    // Build item lines
    const rows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    const itemLines = [];
    rows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = parseInt(row.querySelector('.item-qty').value) || 1;
        const mrp = parseFloat(row.querySelector('.item-mrp').value) || 0;
        const lineTotal = qty * mrp;
        subtotal += lineTotal;
        if (name) {
            itemLines.push(`  • ${name} × ${qty} = ₹${lineTotal.toLocaleString('en-IN')}`);
        }
    });

    if (itemLines.length === 0) {
        showToast('Please add at least one item.', 'error');
        return;
    }

    // Discount & total
    const flatVal = parseFloat(document.getElementById('discountFlat').value) || 0;
    const pctVal = parseFloat(document.getElementById('discountPct').value) || 0;
    let discount = flatVal > 0
        ? Math.min(flatVal, subtotal)
        : Math.min((pctVal / 100) * subtotal, subtotal);
    const grandTotal = subtotal - discount;

    // Receipt number & date
    const receiptNo = document.getElementById('prevReceiptNo').textContent;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Payment icon
    const payIcons = { 'UPI': '📱', 'Cash': '💵', 'Credit Card': '💳' };
    const payIcon = payIcons[selectedPayment] || '💳';

    // Compose message
    const sep = '─────────────────────';
    let msg = `🌟 *ROYAL ABAYA* 🌟\n_Elegance in Every Thread_\n\n`;
    msg += `📄 *${receiptNo}*\n📅 ${dateStr}\n\n`;
    msg += `👤 *Customer:* ${custName}\n`;
    if (custPhone) msg += `📞 ${custPhone}\n`;
    msg += `\n${sep}\n*Items*\n${sep}\n`;
    msg += itemLines.join('\n') + '\n';
    msg += `${sep}\n`;
    msg += `Subtotal:   ₹${subtotal.toLocaleString('en-IN')}\n`;
    if (discount > 0) {
        msg += `Discount:   -₹${discount.toLocaleString('en-IN')}\n`;
    }
    msg += `*Total:     ₹${grandTotal.toLocaleString('en-IN')}*\n`;
    msg += `${sep}\n`;
    msg += `${payIcon} Paid via *${selectedPayment}*\n\n`;
    msg += `_Thank you for shopping with Royal Abaya! 🛍️_\n`;
    msg += `_For exchange/return, contact us within 7 days._`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

    const btn = document.getElementById('whatsappBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg style="width:15px;height:15px;vertical-align:middle;margin-right:6px;" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>Opening…`;
    setTimeout(() => {
        window.open(url, '_blank');
        btn.disabled = false;
        btn.innerHTML = `<svg style="width:15px;height:15px;vertical-align:middle;margin-right:6px;" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>WhatsApp`;
    }, 300);
}



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
