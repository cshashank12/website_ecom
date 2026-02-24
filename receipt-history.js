/* ============================================================
   ROYAL ABAYA — Receipt History JS
   ============================================================ */

const auth = firebase.auth();
let allReceipts = [];
let currentPrintReceipt = null;

// ── Auth ──────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('authGate').classList.add('hidden');
        document.getElementById('rhWrapper').classList.add('visible');
        loadReceipts();
    } else {
        document.getElementById('authGate').classList.remove('hidden');
        document.getElementById('rhWrapper').classList.remove('visible');
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
        document.getElementById('authPassword').classList.add('error');
        setTimeout(() => document.getElementById('authPassword').classList.remove('error'), 600);
        btn.textContent = 'Login'; btn.disabled = false;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

// ── Filters ───────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', renderList);
document.getElementById('payFilter').addEventListener('change', renderList);
document.getElementById('dateFilter').addEventListener('change', renderList);

// ── Load Receipts ─────────────────────────────────────────────
function loadReceipts() {
    db.ref('receipts').orderByChild('createdAt').on('value', snap => {
        allReceipts = [];
        snap.forEach(child => allReceipts.push({ key: child.key, ...child.val() }));
        allReceipts.reverse(); // newest first
        renderList();
    });
}

// ── Render List ───────────────────────────────────────────────
function renderList() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const payMode = document.getElementById('payFilter').value;
    const dateVal = document.getElementById('dateFilter').value;

    let filtered = allReceipts.filter(r => {
        const matchSearch = !search
            || (r.customerName || '').toLowerCase().includes(search)
            || (r.customerPhone || '').includes(search)
            || (r.receiptNo || '').toLowerCase().includes(search);
        const matchPay = !payMode || r.paymentMode === payMode;
        const matchDate = !dateVal || r.date === dateVal;
        return matchSearch && matchPay && matchDate;
    });

    // Summary stats (of filtered)
    const totalRevenue = filtered.reduce((s, r) => s + Number(r.total || 0), 0);
    const avg = filtered.length > 0 ? totalRevenue / filtered.length : 0;
    document.getElementById('sumCount').textContent = filtered.length;
    document.getElementById('sumTotal').textContent = '₹' + totalRevenue.toLocaleString('en-IN');
    document.getElementById('sumAvg').textContent = '₹' + Math.round(avg).toLocaleString('en-IN');
    document.getElementById('sumUPI').textContent = filtered.filter(r => r.paymentMode === 'UPI').length;
    document.getElementById('sumCash').textContent = filtered.filter(r => r.paymentMode === 'Cash').length;
    document.getElementById('sumCard').textContent = filtered.filter(r => r.paymentMode === 'Credit Card').length;

    const countEl = document.getElementById('receiptsCount');
    const listEl = document.getElementById('receiptsList');
    countEl.textContent = `${filtered.length} receipt${filtered.length !== 1 ? 's' : ''} found`;

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🧾</div>
                <div class="empty-text">No receipts found for your search.</div>
            </div>`;
        return;
    }

    listEl.innerHTML = filtered.map((r, i) => {
        const payIcon = { 'UPI': '📱', 'Cash': '💵', 'Credit Card': '💳' }[r.paymentMode] || '💳';
        return `
        <div class="receipt-card" id="rcard-${i}">
            <div class="receipt-card-header" onclick="toggleCard(${i})">
                <span class="rno-badge">${esc(r.receiptNo || '#')}</span>
                <div class="rcust">
                    <div class="rcust-name">${esc(r.customerName || 'Customer')}</div>
                    <div class="rcust-meta">${formatDate(r.date)} · ${esc(r.customerPhone || '')}</div>
                </div>
                <span class="rpay-badge">${payIcon} ${esc(r.paymentMode || '')}</span>
                <span class="rtotal">₹${Number(r.total || 0).toLocaleString('en-IN')}</span>
                <span class="rchevron">▼</span>
            </div>
            <div class="receipt-detail">
                <table class="detail-table">
                    <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">MRP</th><th style="text-align:right">Total</th></tr></thead>
                    <tbody>
                        ${(r.items || []).map(it => `
                        <tr>
                            <td>${esc(it.name)}</td>
                            <td>${it.qty}</td>
                            <td style="text-align:right">₹${Number(it.mrp || 0).toLocaleString('en-IN')}</td>
                            <td style="text-align:right">₹${Number(it.total || 0).toLocaleString('en-IN')}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                <div class="detail-total-row"><span>Subtotal</span><span>₹${Number(r.subtotal || 0).toLocaleString('en-IN')}</span></div>
                ${r.discount > 0 ? `<div class="detail-total-row" style="color:var(--danger)"><span>Discount</span><span>-₹${Number(r.discount || 0).toLocaleString('en-IN')}</span></div>` : ''}
                <div class="detail-total-row grand"><span>Total</span><span>₹${Number(r.total || 0).toLocaleString('en-IN')}</span></div>
                <div class="detail-actions">
                    <button class="btn btn-gold btn-small" onclick="openPrint('${i}', ${JSON.stringify(JSON.stringify(r))})">🖨 Reprint</button>
                    <button class="btn btn-whatsapp btn-small" onclick="sendWhatsApp(${JSON.stringify(JSON.stringify(r))})">📲 WhatsApp</button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Store filtered for onclick access
    window.__filteredReceipts = filtered;
}

function toggleCard(i) {
    document.getElementById(`rcard-${i}`).classList.toggle('open');
}

// ── Print Preview ─────────────────────────────────────────────
function openPrint(i, rJson) {
    const r = JSON.parse(rJson);
    currentPrintReceipt = r;
    const payIcon = { 'UPI': '📱', 'Cash': '💵', 'Credit Card': '💳' }[r.paymentMode] || '💳';
    document.getElementById('printContent').innerHTML = `
        <div class="r-top">
            <div class="r-shop">ROYAL ABAYA</div>
            <div class="r-tagline">Elegance in Every Thread</div>
            <div class="r-no">${esc(r.receiptNo || '')} &nbsp;|&nbsp; ${formatDate(r.date)}</div>
        </div>
        <div class="r-cust">
            <div class="r-cust-name">${esc(r.customerName || 'Customer')}</div>
            ${r.customerPhone ? `<div class="r-cust-phone">📞 ${esc(r.customerPhone)}</div>` : ''}
        </div>
        <table class="r-table">
            <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">MRP</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>
                ${(r.items || []).map(it => `<tr>
                    <td>${esc(it.name)}</td><td>${it.qty}</td>
                    <td style="text-align:right">₹${Number(it.mrp || 0).toLocaleString('en-IN')}</td>
                    <td style="text-align:right">₹${Number(it.total || 0).toLocaleString('en-IN')}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div class="r-totals">
            <div class="r-row"><span>Subtotal</span><span>₹${Number(r.subtotal || 0).toLocaleString('en-IN')}</span></div>
            ${r.discount > 0 ? `<div class="r-row discount"><span>Discount</span><span>-₹${Number(r.discount || 0).toLocaleString('en-IN')}</span></div>` : ''}
            <div class="r-row grand"><span>Total</span><span>₹${Number(r.total || 0).toLocaleString('en-IN')}</span></div>
        </div>
        <div class="r-pay">${payIcon} Paid via ${esc(r.paymentMode || '')}</div>
        <div class="r-footer">Thank you for shopping with Royal Abaya!<br>For exchange/return, contact us within 7 days.</div>
    `;
    document.getElementById('printOverlay').classList.add('show');
}

document.getElementById('printClose').addEventListener('click', () => {
    document.getElementById('printOverlay').classList.remove('show');
});
document.getElementById('printOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('printOverlay'))
        document.getElementById('printOverlay').classList.remove('show');
});
document.getElementById('overlayWaBtn').addEventListener('click', () => {
    if (currentPrintReceipt) sendWhatsApp(JSON.stringify(currentPrintReceipt));
});

// ── WhatsApp (reuse logic from receipt.js) ────────────────────
function sendWhatsApp(rJson) {
    const r = JSON.parse(rJson);
    if (!r.customerPhone) {
        showToast('No phone number on this receipt.', 'error'); return;
    }
    let phone = r.customerPhone.replace(/[\s\-()]/g, '');
    if (phone.startsWith('+')) phone = phone.slice(1);
    else if (phone.startsWith('0')) phone = '91' + phone.slice(1);
    else if (!phone.startsWith('91') || phone.length < 12) phone = '91' + phone;

    const sep = '─────────────────────';
    const payIcons = { 'UPI': '📱', 'Cash': '💵', 'Credit Card': '💳' };
    const itemLines = (r.items || []).map(it =>
        `  • ${it.name} × ${it.qty} = ₹${Number(it.total || 0).toLocaleString('en-IN')}`
    );
    let msg = `🌟 *ROYAL ABAYA* 🌟\n_Elegance in Every Thread_\n\n`;
    msg += `📄 *${r.receiptNo || ''}*\n📅 ${formatDate(r.date)}\n\n`;
    msg += `👤 *Customer:* ${r.customerName || 'Customer'}\n`;
    if (r.customerPhone) msg += `📞 ${r.customerPhone}\n`;
    msg += `\n${sep}\n*Items*\n${sep}\n`;
    msg += itemLines.join('\n') + '\n';
    msg += `${sep}\n`;
    msg += `Subtotal:   ₹${Number(r.subtotal || 0).toLocaleString('en-IN')}\n`;
    if (r.discount > 0) msg += `Discount:   -₹${Number(r.discount || 0).toLocaleString('en-IN')}\n`;
    msg += `*Total:     ₹${Number(r.total || 0).toLocaleString('en-IN')}*\n`;
    msg += `${sep}\n`;
    msg += `${payIcons[r.paymentMode] || '💳'} Paid via *${r.paymentMode || ''}*\n\n`;
    msg += `_Thank you for shopping with Royal Abaya! 🛍️_\n`;
    msg += `_For exchange/return, contact us within 7 days._`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(d) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
let _toastTimer;
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toastText').textContent = msg;
    t.className = `toast ${type}`;
    void t.offsetWidth; t.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('visible'), 3200);
}

// Expose for onclick in HTML
window.toggleCard = toggleCard;
window.openPrint = openPrint;
window.sendWhatsApp = sendWhatsApp;
