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
        const input = document.getElementById('authPassword');
        const btn = document.getElementById('authSubmit');

        function attempt() {
            if (input.value === ADMIN_PASSWORD) {
                gate.classList.add('hidden');
                document.getElementById('adminWrapper').classList.add('visible');
                listenToProducts();
            } else {
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 500);
                input.value = '';
            }
        }

        btn.addEventListener('click', attempt);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') attempt();
        });
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
    }

    // ============================================
    // PRODUCT TABLE
    // ============================================

    function renderTable() {
        const tbody = document.getElementById('productsBody');
        const countEl = document.getElementById('tableCount');

        countEl.textContent = products.length + ' products';

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No products added yet</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => `
      <tr>
        <td><img src="${p.image}" alt="${p.name}" class="product-thumb"></td>
        <td>
          <div class="product-table-name">${p.name}</div>
          <div class="product-table-id">${p.id}</div>
        </td>
        <td>${p.category || '—'}</td>
        <td class="product-table-price">${CURRENCY}${Number(p.price).toLocaleString('en-IN')}</td>
        <td>${(p.sizes || []).join(', ')}</td>
        <td>
          <div class="product-table-actions">
            <button class="btn btn-ghost btn-small" onclick="ADMIN.editProduct('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-small" onclick="ADMIN.deleteProduct('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>`).join('');
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

                products.push({ id, name, price: Number(price), category, sizes, description, image });
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
