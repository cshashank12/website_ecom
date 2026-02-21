/* ============================================
   ROYAL ABAYA — Main Application JS
   (Firebase Realtime Database + Royal Enhancements)
   ============================================ */

(function () {
  'use strict';

  // --- CONFIG ---
  const CONFIG = {
    WHATSAPP_NUMBER: '+91XXXXXXXXXX', // Replace with your business number
    TOTAL_FRAMES: 120,
    FRAME_RATE: 24,
    CURRENCY: '₹',
  };

  // --- STATE ---
  let products = [];
  let cart = JSON.parse(localStorage.getItem('abayas_cart') || '[]');
  let currentModalProduct = null;
  let selectedSize = null;
  let activeFilter = 'all';
  let searchQuery = '';

  // ============================================
  // PRELOADER & HERO FRAME ANIMATION
  // ============================================

  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
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
    if (!canvas) return Promise.resolve();
    return new Promise((resolve) => {
      for (let i = 1; i <= CONFIG.TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = getFramePath(i);
        img.onload = () => {
          framesLoaded++;
          if (progressBar) {
            const pct = (framesLoaded / CONFIG.TOTAL_FRAMES) * 100;
            progressBar.style.width = pct + '%';
          }
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
    if (!canvas || !ctx) return;
    const heroLeft = document.querySelector('.hero-left');
    if (!heroLeft) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = heroLeft.offsetWidth;
    const displayHeight = heroLeft.offsetHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawFrame(currentFrame);
  }

  function drawFrame(index) {
    if (!canvas || !ctx || !frames[index] || !frames[index].complete) return;
    const img = frames[index];

    const displayWidth = parseFloat(canvas.style.width) || canvas.width;
    const displayHeight = parseFloat(canvas.style.height) || canvas.height;

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
    if (!canvas || animationRunning) return;
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
  // PRODUCTS — Firebase Realtime Listener
  // ============================================

  function listenToProducts() {
    // Show skeleton loader while waiting
    showSkeletonLoader();

    productsRef.on('value', (snapshot) => {
      const data = snapshot.val();
      products = data ? Object.values(data) : [];
      renderProducts();
      updateFilterChips();
      updateProductCount();
    });
  }

  // ============================================
  // SKELETON LOADER (Standard UX #4)
  // ============================================

  function showSkeletonLoader() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const limit = parseInt(grid.dataset.limit) || 6;
    const count = limit > 0 ? Math.min(limit, 6) : 6;
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-body">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line btn-skel"></div>
          </div>
        </div>`;
    }
    grid.innerHTML = html;
  }

  // ============================================
  // SEARCH & FILTER (Standard UX #1)
  // ============================================

  function getFilteredProducts() {
    let filtered = products;

    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => (p.category || 'Abaya').toLowerCase() === activeFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }

  function updateFilterChips() {
    const chipsContainer = document.getElementById('filterChips');
    if (!chipsContainer) return;

    const categories = ['all', ...new Set(products.map(p => p.category || 'Abaya'))];
    chipsContainer.innerHTML = categories.map(cat =>
      `<button class="filter-chip ${cat === activeFilter ? 'active' : ''}" data-category="${cat}">${cat === 'all' ? 'All' : cat}</button>`
    ).join('');

    chipsContainer.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.category;
        chipsContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderProducts();
      });
    });
  }

  // ============================================
  // PRODUCT COUNT (Standard UX #7)
  // ============================================

  function updateProductCount() {
    const el = document.getElementById('productCount');
    if (!el) return;
    const total = products.length;
    el.textContent = total > 0 ? `${total} Exclusive ${total === 1 ? 'Piece' : 'Pieces'}` : '';
  }

  // ============================================
  // RENDER PRODUCTS
  // ============================================

  function renderProducts() {
    const grid = document.getElementById('productsGrid');

    const displayProducts = grid.dataset.limit
      ? getFilteredProducts().slice(0, parseInt(grid.dataset.limit) || 999)
      : getFilteredProducts();

    if (displayProducts.length === 0 && products.length === 0) {
      grid.innerHTML = `
        <div class="empty-catalog">
          <div class="empty-catalog-icon">✦</div>
          <h3>Coming Soon</h3>
          <p>Our exclusive collection is being curated. Stay tuned for something extraordinary.</p>
        </div>`;
      return;
    }

    if (displayProducts.length === 0) {
      grid.innerHTML = `
        <div class="empty-catalog">
          <div class="empty-catalog-icon">✦</div>
          <h3>No Results</h3>
          <p>No products match your search. Try a different term or category.</p>
        </div>`;
      return;
    }

    let html = displayProducts.map((p, index) => {
      // R6: Badge logic — first 3 products = "New Arrival", products with "bestseller" tag = "Bestseller"
      let badgeHtml = '';
      if (p.badge === 'bestseller') {
        badgeHtml = '<span class="product-badge bestseller">♛ Bestseller</span>';
      } else if (p.badge === 'new') {
        badgeHtml = '<span class="product-badge new-arrival">✦ New</span>';
      } else if (index < 2 && !grid.dataset.limit) {
        // Only on full products page, mark first 2 as new
        badgeHtml = '<span class="product-badge new-arrival">✦ New</span>';
      }

      return `
      <div class="product-card" data-id="${p.id}" onclick="window.APP.openModal('${p.id}')">
        <div class="product-card-image">
          ${badgeHtml}
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
                  onclick="event.stopPropagation(); window.APP.addToCart('${p.id}', event)">
            ${cart.some(c => c.id === p.id) ? '✓ Added' : 'Add to Cart'}
          </button>
        </div>
      </div>`;
    }).join('');

    const limit = parseInt(grid.dataset.limit) || 0;
    if (limit > 0 && products.length > limit) {
      html += `
        <div class="view-all-container" style="grid-column: 1 / -1; text-align: center; margin-top: 2rem;">
          <a href="products.html" class="btn btn-primary">View All Collection</a>
        </div>`;
    }

    grid.innerHTML = html;
  }

  // ============================================
  // PRODUCT MODAL
  // ============================================

  function openModal(productId) {
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

    const sizesContainer = document.getElementById('modalSizes');
    const sizes = product.sizes || ['S', 'M', 'L', 'XL'];
    sizesContainer.innerHTML = sizes.map(s =>
      `<button class="size-option" onclick="window.APP.selectSize('${s}', this)">${s}</button>`
    ).join('');

    // Reset zoom
    const modalImg = document.querySelector('.modal-image');
    if (modalImg) modalImg.classList.remove('zoomed');

    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
    currentModalProduct = null;
    // Reset zoom
    const modalImg = document.querySelector('.modal-image');
    if (modalImg) modalImg.classList.remove('zoomed');
  }

  function selectSize(size, btn) {
    selectedSize = size;
    document.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  // ============================================
  // IMAGE ZOOM (Standard UX #3)
  // ============================================

  function initImageZoom() {
    const modalImageContainer = document.querySelector('.modal-image');
    if (!modalImageContainer) return;

    modalImageContainer.addEventListener('click', function (e) {
      const img = this.querySelector('img');
      if (!img) return;

      if (this.classList.contains('zoomed')) {
        this.classList.remove('zoomed');
        img.style.transformOrigin = 'center center';
      } else {
        const rect = this.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${x}% ${y}%`;
        this.classList.add('zoomed');
      }
    });

    modalImageContainer.addEventListener('mousemove', function (e) {
      if (!this.classList.contains('zoomed')) return;
      const img = this.querySelector('img');
      const rect = this.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
    });
  }

  // ============================================
  // CART
  // ============================================

  function addToCart(productId, event) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(c => c.id === productId);
    if (existingIndex >= 0) {
      cart.splice(existingIndex, 1);
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: selectedSize || 'M',
      });
      // R7: Gold confetti celebration
      if (event) {
        spawnConfetti(event);
      }
    }

    saveCart();
    renderProducts();
    renderCart();
    updateCartBadge();
    if (existingIndex < 0) showToast('Added to your selection ✦');
  }

  function removeFromCart(productId) {
    cart = cart.filter(c => c.id !== productId);
    saveCart();
    renderProducts();
    renderCart();
    updateCartBadge();
  }

  function saveCart() {
    localStorage.setItem('abayas_cart', JSON.stringify(cart));
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
      message += `   Price: ${CONFIG.CURRENCY}${Number(item.price).toLocaleString('en-IN')}\n\n`;
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
    message += `Size: ${selectedSize || 'Not selected'}\n\n`;
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
    window.addEventListener('scroll', () => {
      const navbar = document.getElementById('navbar');
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    const toggle = document.getElementById('menuToggle');
    const links = document.getElementById('navLinks');
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });

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
  // R2: ANIMATED STAT COUNTERS
  // ============================================

  function initStatCounters() {
    const stats = document.querySelectorAll('.stat-number');
    if (stats.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
  }

  function animateCounter(el) {
    const text = el.textContent.trim();
    const numText = text.replace(/[^\d]/g, '');
    const target = parseInt(numText, 10);
    // Skip non-numeric stats like 'pan', '24hr'
    if (isNaN(target) || target === 0) return;

    const suffix = text.replace(/[\d,]/g, ''); // e.g., "%", "+"
    const duration = 2000;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);

      el.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  // ============================================
  // R3: SCROLL PROGRESS BAR
  // ============================================

  function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
    });
  }

  // ============================================
  // R7: GOLD CONFETTI CELEBRATION
  // ============================================

  function spawnConfetti(event) {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    const btn = event.target.closest('.add-cart-btn') || event.target;
    const rect = btn.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top;

    const colors = ['gold', 'light', 'dark', 'star'];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = `confetti-piece ${colors[Math.floor(Math.random() * colors.length)]}`;

      if (piece.classList.contains('star')) {
        piece.textContent = '✦';
      }

      const angle = (Math.random() * Math.PI * 2);
      const velocity = Math.random() * 80 + 40;
      const endX = originX + Math.cos(angle) * velocity;
      const endY = originY - Math.random() * 100 - 30;

      piece.style.left = originX + 'px';
      piece.style.top = originY + 'px';
      piece.style.setProperty('--tx', `${endX - originX}px`);
      piece.style.setProperty('--ty', `${endY - originY}px`);

      // Override animation with custom end position
      piece.style.animation = 'none';
      piece.offsetHeight; // trigger reflow
      piece.style.cssText += `
        left: ${originX}px;
        top: ${originY}px;
        opacity: 1;
        animation: none;
      `;

      container.appendChild(piece);

      // Animate via JS for varied trajectories
      const startTime = performance.now();
      const dur = 800 + Math.random() * 600;
      const dx = (Math.random() - 0.5) * 160;
      const dy = -(Math.random() * 120 + 40);
      const rot = Math.random() * 720;

      function animatePiece(now) {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / dur, 1);
        const ease = 1 - Math.pow(1 - p, 2);

        piece.style.transform = `translate(${dx * ease}px, ${dy * ease + (p * p * 80)}px) rotate(${rot * p}deg) scale(${1 - p * 0.7})`;
        piece.style.opacity = 1 - p;

        if (p < 1) {
          requestAnimationFrame(animatePiece);
        } else {
          piece.remove();
        }
      }
      requestAnimationFrame(animatePiece);
    }
  }

  // ============================================
  // R8: PARALLAX ORNAMENTS
  // ============================================

  function initParallax() {
    const ornaments = document.querySelectorAll('.parallax-ornament');
    if (ornaments.length === 0 || window.innerWidth < 768) return;

    const speeds = [0.02, 0.04, 0.03, 0.05, 0.025, 0.035];

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      ornaments.forEach((orn, i) => {
        const speed = speeds[i] || 0.03;
        const direction = i % 2 === 0 ? 1 : -1;
        orn.style.transform = `translateY(${scrollY * speed * direction * 50}px)`;
      });
    });
  }

  // ============================================
  // R9: TESTIMONIALS CAROUSEL
  // ============================================

  function initTestimonials() {
    const track = document.getElementById('testimonialsTrack');
    const dotsContainer = document.getElementById('testimonialsDots');
    if (!track || !dotsContainer) return;

    const cards = track.querySelectorAll('.testimonial-card');
    const total = cards.length;
    let current = 0;
    let autoPlayInterval;

    // Create dots
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = `testimonial-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }

    function goTo(index) {
      current = index;
      track.style.transform = `translateX(-${current * 100}%)`;
      dotsContainer.querySelectorAll('.testimonial-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === current);
      });
    }

    function next() {
      goTo((current + 1) % total);
    }

    // Auto-play every 5 seconds
    function startAutoPlay() {
      autoPlayInterval = setInterval(next, 5000);
    }

    // Pause on hover
    track.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
    track.addEventListener('mouseleave', startAutoPlay);

    startAutoPlay();
  }

  // ============================================
  // BACK-TO-TOP (Standard UX #6)
  // ============================================

  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ============================================
  // KEYBOARD ACCESSIBILITY (Standard UX #8)
  // ============================================

  function initKeyboardA11y() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close modal if open
        const modal = document.getElementById('productModal');
        if (modal && modal.classList.contains('active')) {
          closeModal();
          return;
        }
        // Close cart if open
        const cart = document.getElementById('cartDrawer');
        if (cart && cart.classList.contains('active')) {
          toggleCart(false);
          return;
        }
        // Close mobile menu if open
        const links = document.getElementById('navLinks');
        if (links && links.classList.contains('open')) {
          links.classList.remove('open');
        }
      }
    });
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  function initEvents() {
    document.getElementById('cartToggle').addEventListener('click', () => toggleCart(true));
    document.getElementById('cartClose').addEventListener('click', () => toggleCart(false));
    document.getElementById('cartBackdrop').addEventListener('click', () => toggleCart(false));

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('productModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('productModal')) closeModal();
    });
    document.getElementById('modalAddCart').addEventListener('click', (e) => {
      if (currentModalProduct) {
        addToCart(currentModalProduct.id, e);
        closeModal();
      }
    });
    document.getElementById('modalWhatsApp').addEventListener('click', whatsappSingleProduct);

    document.getElementById('whatsappCheckout').addEventListener('click', whatsappCheckout);

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderProducts();
      });
    }

    window.addEventListener('resize', resizeCanvas);
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

    // Listen for products from Firebase (real-time)
    listenToProducts();
    updateCartBadge();

    // Scroll reveal
    initReveal();

    // Royal enhancements
    initStatCounters();    // R2: Animated stat counters
    initScrollProgress();  // R3: Scroll progress bar
    // R5: Shimmer brand is CSS-only
    // R6: Badges are in renderProducts()
    // R7: Confetti is triggered in addToCart()
    initParallax();        // R8: Parallax ornaments
    initTestimonials();    // R9: Testimonials carousel
    // R10: VIP button is pure HTML/CSS
    initImageZoom();       // Standard UX #3
    initBackToTop();       // Standard UX #6
    initKeyboardA11y();    // Standard UX #8
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
