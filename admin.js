/* ============================================
   ROYAL ABAYA — Admin Panel JS
   (Firebase Realtime Database)
   ============================================ */

(function () {
    'use strict';

    const ADMIN_PASSWORD = 'abaya2024';
    const CURRENCY = '₹';

    let products = [];
    let editingId = null;
    let imageBase64 = '';

    // ============================================
    // AUTH GATE
    // ============================================

    function initAuth() {
        const gate = document.getElementById('authGate');
        const form = document.getElementById('authForm');
        const emailInput = document.getElementById('authEmail');
        const passInput = document.getElementById('authPassword');
        const errorMsg = document.getElementById('authError');
        const logoutBtn = document.getElementById('logoutBtn');

        // Auth State Listener
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is signed in.
                gate.classList.add('hidden');
                document.getElementById('adminWrapper').classList.add('visible');
                listenToProducts();
            } else {
                // No user is signed in.
                gate.classList.remove('hidden');
                document.getElementById('adminWrapper').classList.remove('visible');
            }
        });

        // Login Handler
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passInput.value;

            errorMsg.style.display = 'none';
            errorMsg.textContent = '';

            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in via listener
                    console.log('Logged in:', userCredential.user.email);
                    form.reset();
                })
                .catch((error) => {
                    console.error('Login error:', error);
                    errorMsg.textContent = error.message;
                    errorMsg.style.display = 'block';
                    passInput.classList.add('error');
                    setTimeout(() => passInput.classList.remove('error'), 500);
                });
        });

        // Logout Handler
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                firebase.auth().signOut().then(() => {
                    console.log('Signed out');
                }).catch((error) => {
                    console.error('Sign out error', error);
                });
            });
        }
    }

    // ============================================
    // FIREBASE — Realtime Listener
    // ============================================

    function listenToProducts() {
        productsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            products = data ? Object.values(data) : [];
            renderTable();
            updateStats();
        });
    }

    function saveAllProducts(productsList) {
        // Convert array to object keyed by product id for Firebase
        const productsObj = {};
        productsList.forEach(p => {
            productsObj[p.id] = p;
        });
        return productsRef.set(productsObj);
    }

    // ============================================
    // STATS
    // ============================================

    function updateStats() {
        document.getElementById('statCount').textContent = products.length;

        const categories = new Set(products.map(p => p.category));
        document.getElementById('statCategories').textContent = categories.size;

        if (products.length > 0) {
            const avg = products.reduce((s, p) => s + Number(p.price), 0) / products.length;
            document.getElementById('statAvgPrice').textContent = CURRENCY + Math.round(avg).toLocaleString('en-IN');
        } else {
            document.getElementById('statAvgPrice').textContent = CURRENCY + '0';
        }

        // Low stock count (stock defined AND <= 5)
        const lowCount = products.filter(p => p.stock !== undefined && p.stock !== null && p.stock !== '' && Number(p.stock) <= 5).length;
        document.getElementById('statLowStock').textContent = lowCount;
    }

    // ============================================
    // PRODUCT TABLE
    // ============================================

    function renderTable() {
        const tbody = document.getElementById('productsBody');
        const countEl = document.getElementById('tableCount');

        countEl.textContent = products.length + ' products';

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No products added yet</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            // Stock badge
            let stockBadge;
            if (p.stock === undefined || p.stock === null || p.stock === '') {
                stockBadge = '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';
            } else if (Number(p.stock) <= 0) {
                stockBadge = '<span style="background:rgba(231,76,60,0.15);color:#e74c3c;border:1px solid rgba(231,76,60,0.3);font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:20px">Out of Stock</span>';
            } else if (Number(p.stock) <= 5) {
                stockBadge = `<span style="background:rgba(249,115,22,0.15);color:#f97316;border:1px solid rgba(249,115,22,0.3);font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:20px">Low: ${p.stock}</span>`;
            } else {
                stockBadge = `<span style="background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:20px">${p.stock}</span>`;
            }

            // Margin / Min MRP column
            const cost = (p.costPrice !== undefined && p.costPrice !== null && p.costPrice !== '') ? Number(p.costPrice) : null;
            const price = Number(p.price);
            let marginCell;
            if (cost === null) {
                marginCell = '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';
            } else if (price < cost) {
                // Selling below cost — loss!
                const loss = cost - price;
                marginCell = `
                    <div style="line-height:1.4">
                        <span style="background:rgba(231,76,60,0.15);color:#e74c3c;border:1px solid rgba(231,76,60,0.3);font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:20px">⚠ LOSS -₹${loss.toLocaleString('en-IN')}</span>
                        <div style="font-size:0.67rem;color:var(--text-muted);margin-top:3px">Min MRP: <strong style="color:#f97316">₹${cost.toLocaleString('en-IN')}</strong></div>
                    </div>`;
            } else if (price === cost) {
                marginCell = `
                    <div style="line-height:1.4">
                        <span style="background:rgba(249,115,22,0.12);color:#f97316;border:1px solid rgba(249,115,22,0.3);font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:20px">Breakeven 0%</span>
                        <div style="font-size:0.67rem;color:var(--text-muted);margin-top:3px">Min MRP: <strong style="color:#f97316">₹${cost.toLocaleString('en-IN')}</strong></div>
                    </div>`;
            } else {
                const margin = Math.round(((price - cost) / cost) * 100);
                const profit = price - cost;
                const color = margin >= 20 ? '#4ade80' : '#f97316';
                const bg = margin >= 20 ? 'rgba(74,222,128,0.1)' : 'rgba(249,115,22,0.12)';
                const border = margin >= 20 ? 'rgba(74,222,128,0.25)' : 'rgba(249,115,22,0.3)';
                marginCell = `
                    <div style="line-height:1.4">
                        <span style="background:${bg};color:${color};border:1px solid ${border};font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:20px">+${margin}% · ₹${profit.toLocaleString('en-IN')}</span>
                        <div style="font-size:0.67rem;color:var(--text-muted);margin-top:3px">Min MRP: <strong style="color:var(--text-secondary)">₹${cost.toLocaleString('en-IN')}</strong></div>
                    </div>`;
            }

            const costCell = cost !== null
                ? `<span style="color:var(--text-secondary);font-size:0.85rem">₹${cost.toLocaleString('en-IN')}</span>`
                : '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';

            return `
      <tr>
        <td><img src="${p.image}" alt="${p.name}" class="product-thumb"></td>
        <td>
          <div class="product-table-name">${p.name}</div>
          <div class="product-table-id">${p.id}</div>
        </td>
        <td>${p.category || '—'}</td>
        <td>${costCell}</td>
        <td class="product-table-price">₹${price.toLocaleString('en-IN')}</td>
        <td>${marginCell}</td>
        <td>${stockBadge}</td>
        <td>
          <div class="product-table-actions">
            <button class="btn btn-ghost btn-small" onclick="ADMIN.editProduct('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-small" onclick="ADMIN.deleteProduct('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>`;
        }).join('');
    }

    // ============================================
    // FORM HANDLERS
    // ============================================

    function initForm() {
        const form = document.getElementById('productForm');
        const imageInput = document.getElementById('prodImage');
        const preview = document.getElementById('imagePreview');

        // Image upload
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                imageBase64 = ev.target.result;
                preview.src = imageBase64;
                preview.classList.add('visible');
            };
            reader.readAsDataURL(file);
        });

        // Form submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('prodName').value.trim();
            const price = document.getElementById('prodPrice').value.trim();
            const category = document.getElementById('prodCategory').value;
            const sizes = document.getElementById('prodSizes').value.split(',').map(s => s.trim()).filter(Boolean);
            const description = document.getElementById('prodDescription').value.trim();
            const stockRaw = document.getElementById('prodStock').value.trim();
            const stock = stockRaw !== '' ? Number(stockRaw) : null;
            const costRaw = document.getElementById('prodCost').value.trim();
            const costPrice = costRaw !== '' ? Number(costRaw) : null;

            if (!name || !price) return;

            if (editingId) {
                // Update existing product
                const idx = products.findIndex(p => p.id === editingId);
                if (idx >= 0) {
                    products[idx] = {
                        ...products[idx],
                        name,
                        price: Number(price),
                        category,
                        sizes,
                        description,
                        stock,
                        costPrice,
                    };
                    if (imageBase64) products[idx].image = imageBase64;
                }
                editingId = null;
                document.getElementById('formTitle').textContent = 'Add New Product';
                document.getElementById('submitBtn').textContent = 'Add Product';
                document.getElementById('cancelEdit').style.display = 'none';
                showToast('Product updated!', 'success');
            } else {
                // New product
                const id = 'RA-' + Date.now().toString(36).toUpperCase();
                const image = imageBase64 || 'images/ezgif-frame-001.jpg';

                products.push({ id, name, price: Number(price), category, sizes, description, image, stock, costPrice });
                showToast('Product added!', 'success');
            }

            // Save to Firebase
            await saveAllProducts(products);

            // Reset form
            form.reset();
            document.getElementById('prodSizes').value = 'S, M, L, XL';
            imageBase64 = '';
            preview.classList.remove('visible');
        });

        // Cancel edit
        document.getElementById('cancelEdit').addEventListener('click', () => {
            editingId = null;
            form.reset();
            document.getElementById('prodSizes').value = 'S, M, L, XL';
            document.getElementById('prodStock').value = '';
            document.getElementById('prodCost').value = '';
            imageBase64 = '';
            preview.classList.remove('visible');
            document.getElementById('formTitle').textContent = 'Add New Product';
            document.getElementById('submitBtn').textContent = 'Add Product';
            document.getElementById('cancelEdit').style.display = 'none';
        });

        // Clear all
        document.getElementById('clearAllBtn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete ALL products? This cannot be undone.')) {
                products = [];
                await productsRef.set(null);
                showToast('All products cleared', 'error');
            }
        });

        // Load samples
        document.getElementById('loadSamplesBtn').addEventListener('click', loadSamples);
    }

    // ============================================
    // EDIT / DELETE
    // ============================================

    function editProduct(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;

        editingId = id;
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodPrice').value = product.price;
        document.getElementById('prodCategory').value = product.category || 'Classic';
        document.getElementById('prodSizes').value = (product.sizes || []).join(', ');
        document.getElementById('prodDescription').value = product.description || '';
        document.getElementById('prodStock').value = (product.stock !== null && product.stock !== undefined) ? product.stock : '';
        document.getElementById('prodCost').value = (product.costPrice !== null && product.costPrice !== undefined) ? product.costPrice : ''

        if (product.image) {
            const preview = document.getElementById('imagePreview');
            preview.src = product.image;
            preview.classList.add('visible');
            imageBase64 = product.image;
        }

        document.getElementById('formTitle').textContent = 'Edit Product';
        document.getElementById('submitBtn').textContent = 'Update Product';
        document.getElementById('cancelEdit').style.display = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function deleteProduct(id) {
        if (!confirm('Delete this product?')) return;
        products = products.filter(p => p.id !== id);
        await saveAllProducts(products);
        showToast('Product deleted', 'error');
    }

    // ============================================
    // SAMPLE DATA
    // ============================================

    async function loadSamples() {
        if (products.length > 0 && !confirm('This will ADD sample products. Continue?')) return;

        const samples = [
            { id: 'RA-SAPPHIRE', name: 'Royal Sapphire', price: 4500, category: 'Premium', sizes: ['S', 'M', 'L', 'XL'], description: 'A stunning deep blue abaya with intricate gold thread embroidery, perfect for special occasions.', image: 'images/ezgif-frame-010.jpg' },
            { id: 'RA-MIDNIGHT', name: 'Midnight Elegance', price: 3800, category: 'Embroidered', sizes: ['S', 'M', 'L', 'XL'], description: 'Classic black abaya with delicate lace trim detailing along the sleeves and hemline.', image: 'images/ezgif-frame-025.jpg' },
            { id: 'RA-PEARL', name: 'Pearl Grace', price: 5200, category: 'Bridal', sizes: ['S', 'M', 'L'], description: 'An ivory-accented abaya with pearl beadwork, designed for engagement ceremonies and bridal events.', image: 'images/ezgif-frame-040.jpg' },
            { id: 'RA-EMERALD', name: 'Emerald Dream', price: 3200, category: 'Classic', sizes: ['M', 'L', 'XL'], description: 'A flowing emerald green abaya crafted from premium crepe fabric with a modern cut.', image: 'images/ezgif-frame-055.jpg' },
            { id: 'RA-GOLD', name: 'Golden Heritage', price: 6800, category: 'Premium', sizes: ['S', 'M', 'L'], description: 'Luxurious gold-embellished abaya with hand-sewn crystal accents and a matching sheila.', image: 'images/ezgif-frame-070.jpg' },
            { id: 'RA-ROSE', name: 'Rose Petal', price: 2900, category: 'Casual', sizes: ['S', 'M', 'L', 'XL'], description: 'A soft dusty rose abaya in breathable cotton-silk blend, perfect for everyday elegance.', image: 'images/ezgif-frame-085.jpg' },
        ];

        products = [...products, ...samples];
        await saveAllProducts(products);
        showToast('Sample data loaded!', 'success');
    }

    // ============================================
    // TOAST
    // ============================================

    let toastTimeout = null;
    function showToast(text, type = 'success') {
        const toast = document.getElementById('adminToast');
        document.getElementById('adminToastText').textContent = text;
        toast.className = 'admin-toast visible ' + type;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2500);
    }

    // ============================================
    // INIT
    // ============================================

    window.ADMIN = {
        editProduct,
        deleteProduct,
    };

    document.addEventListener('DOMContentLoaded', () => {
        initAuth();
        initForm();
    });

})();
