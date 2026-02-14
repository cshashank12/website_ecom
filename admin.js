/* ============================================
   DAR AL ABAYA — Admin Panel JS
   ============================================ */

(function () {
    'use strict';

    const ADMIN_PASSWORD = 'abaya2024';
    const STORAGE_KEY = 'abayas_products';
    const CURRENCY = '₹';

    let products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let editingId = null;
    let currentImageData = null;

    // ============================================
    // AUTHENTICATION
    // ============================================

    const authGate = document.getElementById('authGate');
    const adminWrapper = document.getElementById('adminWrapper');
    const authInput = document.getElementById('authPassword');
    const authBtn = document.getElementById('authSubmit');

    function authenticate() {
        const pw = authInput.value.trim();
        if (pw === ADMIN_PASSWORD) {
            authGate.classList.add('hidden');
            adminWrapper.classList.add('visible');
            renderProducts();
            updateStats();
        } else {
            authInput.classList.add('error');
            authInput.value = '';
            authInput.placeholder = 'Wrong password';
            setTimeout(() => {
                authInput.classList.remove('error');
                authInput.placeholder = 'Enter Password';
            }, 1500);
        }
    }

    authBtn.addEventListener('click', authenticate);
    authInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') authenticate();
    });

    // ============================================
    // PRODUCT CRUD
    // ============================================

    function generateId() {
        return 'ABY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    }

    function saveProducts() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }

    function addProduct(data) {
        const product = {
            id: generateId(),
            name: data.name,
            price: data.price,
            category: data.category,
            description: data.description,
            sizes: data.sizes,
            image: data.image,
            createdAt: new Date().toISOString(),
        };
        products.push(product);
        saveProducts();
        renderProducts();
        updateStats();
        showToast('Product added successfully', 'success');
    }

    function updateProduct(id, data) {
        const index = products.findIndex(p => p.id === id);
        if (index < 0) return;
        products[index] = { ...products[index], ...data };
        saveProducts();
        renderProducts();
        updateStats();
        showToast('Product updated', 'success');
    }

    function deleteProduct(id) {
        if (!confirm('Delete this product?')) return;
        products = products.filter(p => p.id !== id);
        saveProducts();
        renderProducts();
        updateStats();
        showToast('Product removed', 'error');
    }

    function clearAll() {
        if (!confirm('Delete ALL products? This cannot be undone.')) return;
        products = [];
        saveProducts();
        renderProducts();
        updateStats();
        showToast('All products cleared', 'error');
    }

    // ============================================
    // FORM HANDLING
    // ============================================

    const form = document.getElementById('productForm');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const imageInput = document.getElementById('prodImage');
    const imagePreview = document.getElementById('imagePreview');

    // Image upload
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check size (max 2MB for localStorage)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image too large. Max 2MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            currentImageData = ev.target.result;
            imagePreview.src = currentImageData;
            imagePreview.classList.add('visible');
        };
        reader.readAsDataURL(file);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('prodName').value.trim();
        const price = document.getElementById('prodPrice').value;
        const category = document.getElementById('prodCategory').value;
        const description = document.getElementById('prodDescription').value.trim();
        const sizesRaw = document.getElementById('prodSizes').value;
        const sizes = sizesRaw.split(',').map(s => s.trim()).filter(Boolean);

        if (!name || !price) {
            showToast('Name and Price are required', 'error');
            return;
        }

        if (!editingId && !currentImageData) {
            showToast('Please upload a product image', 'error');
            return;
        }

        const data = {
            name,
            price: parseFloat(price),
            category,
            description,
            sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
        };

        if (currentImageData) data.image = currentImageData;

        if (editingId) {
            updateProduct(editingId, data);
            cancelEdit();
        } else {
            addProduct(data);
        }

        resetForm();
    });

    function resetForm() {
        form.reset();
        currentImageData = null;
        imagePreview.classList.remove('visible');
        document.getElementById('prodSizes').value = 'S, M, L, XL';
    }

    function editProduct(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;

        editingId = id;
        document.getElementById('editId').value = id;
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodPrice').value = product.price;
        document.getElementById('prodCategory').value = product.category || 'Classic';
        document.getElementById('prodDescription').value = product.description || '';
        document.getElementById('prodSizes').value = (product.sizes || ['S', 'M', 'L', 'XL']).join(', ');

        if (product.image) {
            imagePreview.src = product.image;
            imagePreview.classList.add('visible');
        }

        formTitle.textContent = 'Edit Product';
        submitBtn.textContent = 'Update Product';
        cancelEditBtn.style.display = 'inline-flex';

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelEdit() {
        editingId = null;
        formTitle.textContent = 'Add New Product';
        submitBtn.textContent = 'Add Product';
        cancelEditBtn.style.display = 'none';
        resetForm();
    }

    cancelEditBtn.addEventListener('click', cancelEdit);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);

    // ============================================
    // RENDER TABLE
    // ============================================

    function renderProducts() {
        const tbody = document.getElementById('productsBody');
        const countEl = document.getElementById('tableCount');

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No products added yet. Add your first product above.</td></tr>';
            countEl.textContent = '0 products';
            return;
        }

        countEl.textContent = products.length + ' product' + (products.length > 1 ? 's' : '');

        tbody.innerHTML = products.map(p => `
      <tr>
        <td><img src="${p.image}" alt="${p.name}" class="product-thumb"></td>
        <td>
          <div class="product-table-name">${p.name}</div>
          <div class="product-table-id">${p.id}</div>
        </td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${p.category || '—'}</td>
        <td class="product-table-price">${CURRENCY}${Number(p.price).toLocaleString('en-IN')}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${(p.sizes || []).join(', ')}</td>
        <td>
          <div class="product-table-actions">
            <button class="btn btn-ghost btn-small" onclick="ADMIN.edit('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-small" onclick="ADMIN.delete('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>`).join('');
    }

    // ============================================
    // STATS
    // ============================================

    function updateStats() {
        document.getElementById('statCount').textContent = products.length;

        const categories = new Set(products.map(p => p.category).filter(Boolean));
        document.getElementById('statCategories').textContent = categories.size;

        const avg = products.length > 0
            ? Math.round(products.reduce((a, p) => a + Number(p.price), 0) / products.length)
            : 0;
        document.getElementById('statAvgPrice').textContent = CURRENCY + avg.toLocaleString('en-IN');
    }

    // ============================================
    // SAMPLE DATA
    // ============================================

    document.getElementById('loadSamplesBtn').addEventListener('click', () => {
        if (products.length > 0 && !confirm('This will add sample products alongside existing ones. Continue?')) return;

        const sampleFrames = [10, 25, 40, 55, 70, 85];
        const sampleProducts = [
            {
                name: 'Royal Sapphire Abaya',
                price: 4500,
                category: 'Premium',
                description: 'A stunning royal blue abaya with intricate gold embroidery, crafted from premium crepe fabric. Perfect for special occasions and elegant gatherings.',
                sizes: ['S', 'M', 'L', 'XL'],
            },
            {
                name: 'Golden Duchess Kaftan',
                price: 6200,
                category: 'Bridal',
                description: 'An opulent kaftan featuring lavish gold thread work and delicate beading. A masterpiece for brides and celebrations.',
                sizes: ['M', 'L', 'XL'],
            },
            {
                name: 'Midnight Elegance Abaya',
                price: 3800,
                category: 'Embroidered',
                description: 'Sleek black abaya with subtle gold trim and modern cut. Embodies sophistication for everyday luxury.',
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            },
            {
                name: 'Pearl Crescent Jalabiya',
                price: 5100,
                category: 'Party Wear',
                description: 'Ivory and pearl-toned jalabiya with crescent motif embroidery. A celebration of heritage and contemporary design.',
                sizes: ['S', 'M', 'L'],
            },
            {
                name: 'Desert Rose Collection',
                price: 3200,
                category: 'Casual',
                description: 'A lightweight, flowing abaya in dusty rose with minimal gold accents. Perfect for everyday wear with a touch of elegance.',
                sizes: ['S', 'M', 'L', 'XL'],
            },
            {
                name: 'Imperial Navy Masterpiece',
                price: 7500,
                category: 'Premium',
                description: 'Our signature piece — a deep navy abaya with extensive hand-embroidered gold patterns inspired by royal court designs.',
                sizes: ['M', 'L', 'XL'],
            },
        ];

        sampleProducts.forEach((sp, i) => {
            const frameNum = String(sampleFrames[i]).padStart(3, '0');
            addProductSilent({
                ...sp,
                image: `images/ezgif-frame-${frameNum}.jpg`,
            });
        });

        saveProducts();
        renderProducts();
        updateStats();
        showToast(`${sampleProducts.length} sample products loaded`, 'success');
    });

    function addProductSilent(data) {
        products.push({
            id: generateId(),
            name: data.name,
            price: data.price,
            category: data.category,
            description: data.description,
            sizes: data.sizes || ['S', 'M', 'L', 'XL'],
            image: data.image,
            createdAt: new Date().toISOString(),
        });
    }

    // ============================================
    // TOAST
    // ============================================

    let toastTimer = null;
    function showToast(text, type = 'success') {
        const toast = document.getElementById('adminToast');
        document.getElementById('adminToastText').textContent = text;
        toast.className = 'admin-toast visible ' + type;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2500);
    }

    // ============================================
    // EXPOSE API
    // ============================================

    window.ADMIN = {
        edit: editProduct,
        delete: deleteProduct,
    };

})();
