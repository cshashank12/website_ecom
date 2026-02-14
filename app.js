/* ============================================
   DAR AL ABAYA — Main Application JS
   ============================================ */

(function () {
  'use strict';

  // --- CONFIG ---
  const CONFIG = {
    WHATSAPP_NUMBER: '+91XXXXXXXXXX', // Replace with your business number
    TOTAL_FRAMES: 120,
    FRAME_RATE: 24,
    CURRENCY: '₹',
    STORAGE_KEY: 'abayas_products',
    CART_KEY: 'abayas_cart',
  };

  // --- STATE ---
  let cart = JSON.parse(sessionStorage.getItem(CONFIG.CART_KEY) || '[]');
  let currentModalProduct = null;
  let selectedSize = null;

  // ============================================
  // PRELOADER & HERO FRAME ANIMATION
  // ============================================

  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d');
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('preloaderProgress');

  const frames = [];
  let framesLoaded = 0;
  let currentFrame = 0;
  let animationRunning = false;

  function getFramePath(index) {
    const num = String(index).padStart(3, '0');
    return `images/ezgif-frame-${num}.jpg`;
  }

  function preloadFrames() {
    return new Promise((resolve) => {
      for (let i = 1; i <= CONFIG.TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = getFramePath(i);
        img.onload = () => {
          framesLoaded++;
          const pct = (framesLoaded / CONFIG.TOTAL_FRAMES) * 100;
          progressBar.style.width = pct + '%';
          if (framesLoaded === CONFIG.TOTAL_FRAMES) resolve();
        };
        img.onerror = () => {
          framesLoaded++;
          if (framesLoaded === CONFIG.TOTAL_FRAMES) resolve();
        };
        frames[i - 1] = img;
      }
    });
  }

  function resizeCanvas() {
    const heroLeft = document.querySelector('.hero-left');
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = heroLeft.offsetWidth;
    const displayHeight = heroLeft.offsetHeight;

    // Set the canvas internal resolution to match device pixels
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // Scale CSS size to display size
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // Scale the drawing context so draw commands use CSS pixel coordinates
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawFrame(currentFrame);
  }

  function drawFrame(index) {
    if (!frames[index] || !frames[index].complete) return;
    const img = frames[index];

    // Use CSS display dimensions (not the internal canvas resolution)
    const displayWidth = parseFloat(canvas.style.width) || canvas.width;
    const displayHeight = parseFloat(canvas.style.height) || canvas.height;

    // Cover the display area
    const canvasRatio = displayWidth / displayHeight;
    const imgRatio = img.width / img.height;

    let drawW, drawH, offsetX, offsetY;
    if (imgRatio > canvasRatio) {
      drawH = displayHeight;
      drawW = img.width * (displayHeight / img.height);
      offsetX = (displayWidth - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = displayWidth;
      drawH = img.height * (displayWidth / img.width);
      offsetX = 0;
      offsetY = (displayHeight - drawH) / 2;
    }

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }

  function startAnimation() {
    if (animationRunning) return;
    animationRunning = true;

    const interval = 1000 / CONFIG.FRAME_RATE;
    let lastTime = 0;

    function animate(time) {
      if (!animationRunning) return;
      if (time - lastTime >= interval) {
        currentFrame = (currentFrame + 1) % CONFIG.TOTAL_FRAMES;
        drawFrame(currentFrame);
        lastTime = time;
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // ============================================
  // PRODUCTS
  // ============================================

  function getProducts() {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
  }

  function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const products = getProducts();

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-catalog">
          <div class="empty-catalog-icon">✦</div>
          <h3>Coming Soon</h3>
          <p>Our exclusive collection is being curated. Stay tuned for something extraordinary.</p>
        </div>`;
      return;
    }

    grid.innerHTML = products.map(p => `
      <div class="product-card" data-id="${p.id}" onclick="window.APP.openModal('${p.id}')">
        <div class="product-card-image">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
          <div class="product-card-overlay">
            <span class="quick-view-btn">Quick View</span>
          </div>
        </div>
        <div class="product-card-body">
          <span class="product-card-category">${p.category || 'Abaya'}</span>
          <h3 class="product-card-name">${p.name}</h3>
          <p class="product-card-price">${CONFIG.CURRENCY}${Number(p.price).toLocaleString('en-IN')}</p>
          <button class="add-cart-btn ${cart.some(c => c.id === p.id) ? 'added' : ''}"
                  onclick="event.stopPropagation(); window.APP.addToCart('${p.id}')">
            ${cart.some(c => c.id === p.id) ? '✓ Added' : 'Add to Cart'}
          </button>
        </div>
      </div>`).join('');
  }

  // ============================================
  // PRODUCT MODAL
  // ============================================

  function openModal(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    currentModalProduct = product;
    selectedSize = null;

    document.getElementById('modalImage').src = product.image;
    document.getElementById('modalImage').alt = product.name;
    document.getElementById('modalCategory').textContent = product.category || 'Abaya';
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalPrice').textContent = CONFIG.CURRENCY + Number(product.price).toLocaleString('en-IN');
    document.getElementById('modalProductId').textContent = 'Product ID: ' + product.id;
    document.getElementById('modalDescription').textContent = product.description || 'A beautifully crafted abaya designed for elegance and comfort.';

    // Sizes
    const sizesContainer = document.getElementById('modalSizes');
    const sizes = product.sizes || ['S', 'M', 'L', 'XL'];
    sizesContainer.innerHTML = sizes.map(s =>
      `<button class="size-option" onclick="window.APP.selectSize('${s}', this)">${s}</button>`
    ).join('');

    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
    currentModalProduct = null;
  }

  function selectSize(size, btn) {
    selectedSize = size;
    document.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  // ============================================
  // CART
  // ============================================

  function addToCart(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(c => c.id === productId);
    if (existingIndex >= 0) {
      // Remove if already in cart (toggle)
      cart.splice(existingIndex, 1);
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: selectedSize || 'M',
      });
    }

    saveCart();
    renderProducts();
    renderCart();
    updateCartBadge();
    if (existingIndex < 0) showToast('Added to your selection');
  }

  function removeFromCart(productId) {
    cart = cart.filter(c => c.id !== productId);
    saveCart();
    renderProducts();
    renderCart();
    updateCartBadge();
  }

  function saveCart() {
    sessionStorage.setItem(CONFIG.CART_KEY, JSON.stringify(cart));
  }

  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    badge.textContent = cart.length;
    badge.classList.toggle('visible', cart.length > 0);
  }

  function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">✦</div>
          <p>Your selection is empty</p>
        </div>`;
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';

    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h4 class="cart-item-name">${item.name}</h4>
          <span class="cart-item-size">Size: ${item.size}</span>
          <p class="cart-item-price">${CONFIG.CURRENCY}${Number(item.price).toLocaleString('en-IN')}</p>
          <button class="cart-item-remove" onclick="window.APP.removeFromCart('${item.id}')">Remove</button>
        </div>
      </div>`).join('');

    const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
    document.getElementById('cartTotal').textContent = CONFIG.CURRENCY + total.toLocaleString('en-IN');
  }

  function toggleCart(open) {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    if (open) {
      renderCart();
      drawer.classList.add('active');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('active');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // ============================================
  // WHATSAPP CHECKOUT
  // ============================================

  function whatsappCheckout() {
    if (cart.length === 0) return;

    let message = '🕌 *Royal Abaya — Order Request*\n\n';
    message += 'I would like to order the following items:\n\n';

    cart.forEach((item, i) => {
      message += `${i + 1}. *${item.name}*\n`;
      message += `   Product ID: ${item.id}\n`;
      message += `   Size: ${item.size}\n`;
      message += `   Price: ${CONFIG.CURRENCY}${Number(item.price).toLocaleString('en-IN')}\n`;
      message += `   Image: ${window.location.origin}/${item.image}\n\n`;
    });

    const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
    message += `\n💰 *Total: ${CONFIG.CURRENCY}${total.toLocaleString('en-IN')}*\n`;
    message += '\nPlease confirm availability and share payment details. Thank you! 🤍';

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(url, '_blank');
  }

  function whatsappSingleProduct() {
    if (!currentModalProduct) return;
    const p = currentModalProduct;
    let message = `🕌 *Royal Abaya — Product Inquiry*\n\n`;
    message += `I'm interested in:\n\n`;
    message += `*${p.name}*\n`;
    message += `Product ID: ${p.id}\n`;
    message += `Price: ${CONFIG.CURRENCY}${Number(p.price).toLocaleString('en-IN')}\n`;
    message += `Size: ${selectedSize || 'Not selected'}\n`;
    message += `Image: ${window.location.origin}/${p.image}\n\n`;
    message += `Please share more details. Thank you! 🤍`;

    const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  // ============================================
  // TOAST
  // ============================================

  let toastTimeout = null;
  function showToast(text) {
    const toast = document.getElementById('toast');
    document.getElementById('toastText').textContent = text;
    toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2500);
  }

  // ============================================
  // NAVBAR
  // ============================================

  function initNavbar() {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const navbar = document.getElementById('navbar');
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile menu
    const toggle = document.getElementById('menuToggle');
    const links = document.getElementById('navLinks');
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });

    // Close mobile menu on link click
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // ============================================
  // SCROLL REVEAL
  // ============================================

  function initReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    reveals.forEach(el => observer.observe(el));
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  function initEvents() {
    // Cart
    document.getElementById('cartToggle').addEventListener('click', () => toggleCart(true));
    document.getElementById('cartClose').addEventListener('click', () => toggleCart(false));
    document.getElementById('cartBackdrop').addEventListener('click', () => toggleCart(false));

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('productModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('productModal')) closeModal();
    });
    document.getElementById('modalAddCart').addEventListener('click', () => {
      if (currentModalProduct) {
        addToCart(currentModalProduct.id);
        closeModal();
      }
    });
    document.getElementById('modalWhatsApp').addEventListener('click', whatsappSingleProduct);

    // WhatsApp checkout
    document.getElementById('whatsappCheckout').addEventListener('click', whatsappCheckout);

    // Resize canvas
    window.addEventListener('resize', resizeCanvas);

    // Listen for product updates from admin
    window.addEventListener('storage', (e) => {
      if (e.key === CONFIG.STORAGE_KEY) {
        renderProducts();
      }
    });
  }

  // ============================================
  // INIT
  // ============================================

  async function init() {
    initNavbar();
    initEvents();

    // Preload hero frames
    await preloadFrames();

    // Hide preloader
    preloader.classList.add('hidden');

    // Start canvas
    resizeCanvas();
    drawFrame(0);
    startAnimation();

    // Render products
    renderProducts();
    updateCartBadge();

    // Scroll reveal
    initReveal();
  }

  // Expose API for onclick handlers
  window.APP = {
    openModal,
    addToCart,
    removeFromCart,
    selectSize,
  };

  // Go
  document.addEventListener('DOMContentLoaded', init);

})();
