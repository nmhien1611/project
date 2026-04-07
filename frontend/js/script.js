const API_URL = 'http://localhost:3001/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('authToken'); }

function parsePrice(p) {
    if (typeof p === 'number') return p;
    return parseInt(String(p).replace(/[^\d]/g, '')) || 0;
}
function fmtPrice(p) { return parsePrice(p).toLocaleString('vi-VN') + '₫'; }

async function apiFetch(path) {
    const token = getToken();
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const res = await fetch(API_URL + path, { headers });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

function showToast(msg, type = 'success') {
    const old = document.getElementById('__toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = '__toast';
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);
        background:${type === 'error' ? '#ee4d2d' : type === 'warn' ? '#f39c12' : '#26aa99'};
        color:#fff;padding:11px 26px;border-radius:10px;font-size:14px;font-weight:500;
        z-index:99999;box-shadow:0 4px 18px rgba(0,0,0,.22);transition:all .25s ease;opacity:0`;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}

// ── Cart ─────────────────────────────────────────────────────────────────────
function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existing = cart.find(i => String(i.id) === String(product.id));
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    showToast('Đã thêm vào giỏ hàng!');
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// ── Wishlist ─────────────────────────────────────────────────────────────────
let wishlistIds = new Set();

async function loadWishlistIds() {
    const token = getToken();
    if (!token) return;
    try {
        const items = await apiFetch('/users/wishlist');
        wishlistIds = new Set(items.map(p => String(p.id)));
    } catch { wishlistIds = new Set(); }
}

async function toggleWishlist(btn, productId) {
    const token = getToken();
    if (!token) { showToast('Bạn cần đăng nhập để thêm yêu thích!', 'warn'); return; }
    const id = String(productId);
    const inWl = wishlistIds.has(id);
    try {
        if (inWl) {
            await fetch(`${API_URL}/users/wishlist/${productId}`, {
                method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
            });
            wishlistIds.delete(id);
            btn.textContent = '🤍'; btn.classList.remove('active');
            showToast('Đã bỏ yêu thích');
        } else {
            await fetch(`${API_URL}/users/wishlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ productId })
            });
            wishlistIds.add(id);
            btn.textContent = '❤️'; btn.classList.add('active');
            showToast('Đã thêm vào yêu thích!');
        }
    } catch { showToast('Không thể cập nhật yêu thích!', 'error'); }
}

// ── Product card ─────────────────────────────────────────────────────────────
function productCard(p) {
    const price = parsePrice(p.priceNumber || p.price);
    const salePrice = p.discount ? Math.floor(price * (1 - p.discount / 100)) : price;
    const isFav = wishlistIds.has(String(p.id));
    const productJson = JSON.stringify(p).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    return `
    <div class="product-card" data-id="${p.id}">
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
        ${p.discount ? `<div class="product-discount">-${p.discount}%</div>` : ''}
        <div class="product-img-wrap" onclick='showModal(${productJson})' style="cursor:pointer">
            <img src="${p.image || 'images/placeholder.jpg'}" alt="${p.name}" loading="lazy"
                 onerror="this.src='images/placeholder.jpg'">
        </div>
        <div class="product-info">
            <div class="product-name">${p.name}</div>
            <div class="product-price-row">
                <span class="product-price">${fmtPrice(salePrice)}</span>
                ${p.discount ? `<span class="product-old-price">${fmtPrice(price)}</span>` : ''}
            </div>
            ${p.rating ? `<div class="product-stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} <small>(${p.rating})</small></div>` : ''}
            ${p.stock === 0 ? '<div class="out-of-stock">Hết hàng</div>' : ''}
        </div>
        <div class="product-actions">
            <button class="btn-add-cart" onclick='addToCart(${productJson})' ${p.stock === 0 ? 'disabled' : ''}>
                🛒 Thêm giỏ
            </button>
            <button class="btn-wishlist ${isFav ? 'active' : ''}" onclick="toggleWishlist(this, ${p.id})">
                ${isFav ? '❤️' : '🤍'}
            </button>
        </div>
    </div>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(p) {
    const modal = document.getElementById('product-info-modal');
    if (!modal) return;
    const price = parsePrice(p.price);
    const oldPrice = p.old_price ? parsePrice(p.old_price) : null;
    const productJson = JSON.stringify(p).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    document.getElementById('modal-product-info').innerHTML = `
        <div class="modal-body">
            <img src="${p.image || ''}" alt="${p.name}" onerror="this.style.display='none'">
            <div class="modal-details">
                <h3>${p.name}</h3>
                <div class="modal-price">${fmtPrice(price)}
                    ${oldPrice ? `<span class="modal-old-price">${fmtPrice(oldPrice)}</span>` : ''}
                    ${p.discount ? `<span class="modal-discount">-${p.discount}%</span>` : ''}
                </div>
                ${p.brand    ? `<p><strong>Thương hiệu:</strong> ${p.brand}</p>` : ''}
                ${p.category ? `<p><strong>Danh mục:</strong> ${p.category}</p>` : ''}
                ${p.stock != null ? `<p><strong>Còn hàng:</strong> ${p.stock > 0 ? p.stock + ' sản phẩm' : '<span style="color:#ee4d2d">Hết hàng</span>'}</p>` : ''}
                ${p.description ? `<p class="modal-desc">${p.description}</p>` : ''}
                <button class="btn-modal-cart" onclick='addToCart(${productJson})' ${p.stock === 0 ? 'disabled' : ''}>
                    🛒 Thêm vào giỏ hàng
                </button>
            </div>
        </div>`;
    modal.style.display = 'flex';
}

// ── Load & render products ────────────────────────────────────────────────────
async function loadProducts(params = {}) {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Đang tải sản phẩm...</p></div>';

    const qs = new URLSearchParams();
    if (params.q)        qs.set('q', params.q);
    if (params.category) qs.set('category', params.category);
    if (params.brand)    qs.set('brand', params.brand);
    if (params.sort)     qs.set('sort', params.sort);

    try {
        const products = await apiFetch('/products?' + qs.toString());

        // Client-side price filter
        const minP = parseFloat(document.getElementById('price-min')?.value) || 0;
        const maxP = parseFloat(document.getElementById('price-max')?.value) || Infinity;
        const filtered = products.filter(p => {
            const pr = parsePrice(p.price);
            return pr >= minP && pr <= maxP;
        });

        if (!filtered.length) {
            grid.innerHTML = '<div class="empty-state"><p>Không tìm thấy sản phẩm nào phù hợp.</p></div>';
            return;
        }
        grid.innerHTML = filtered.map(p => productCard(p)).join('');
    } catch {
        grid.innerHTML = '<div class="empty-state"><p>Không thể tải sản phẩm. Vui lòng thử lại.</p></div>';
    }
}

function runFilters() {
    loadProducts({
        q:        document.getElementById('search-input')?.value.trim() || '',
        category: document.getElementById('category-filter')?.value || '',
        brand:    document.getElementById('brand-filter')?.value || '',
        sort:     document.getElementById('sort-by')?.value || '',
    });
}

// ── Autocomplete ──────────────────────────────────────────────────────────────
let acTimer = null;
async function showAutocomplete(q) {
    const box = document.getElementById('autocomplete');
    if (!box) return;
    clearTimeout(acTimer);
    if (!q || q.length < 2) { box.style.display = 'none'; return; }
    acTimer = setTimeout(async () => {
        try {
            const res = await apiFetch('/products?q=' + encodeURIComponent(q));
            if (!res.length) { box.style.display = 'none'; return; }
            box.innerHTML =
                `<div class="autocomplete-header">Gợi ý (${res.length})</div>` +
                res.slice(0, 6).map(p => {
                    const bp = parsePrice(p.priceNumber || p.price);
                    const sp = p.discount ? Math.floor(bp * (1 - p.discount / 100)) : bp;
                    return `
                <div class="autocomplete-item" onclick="window.location.href='product.html?id=${p.id}'">
                    <img src="${p.image || ''}" onerror="this.style.display='none'">
                    <div class="autocomplete-item-info">
                        <div class="autocomplete-item-name">${p.name}</div>
                        <div class="autocomplete-item-price">${fmtPrice(sp)}</div>
                        <div class="autocomplete-item-cat">${p.category || ''} · ${p.brand || ''}</div>
                    </div>
                </div>`;
                }).join('');
            box.style.display = 'block';
        } catch { box.style.display = 'none'; }
    }, 220);
}

// ── Recommended carousel ──────────────────────────────────────────────────────
async function renderCarousel() {
    const el = document.getElementById('recommended-carousel');
    if (!el) return;
    try {
        const products = await apiFetch('/products');
        el.innerHTML = products.slice(0, 12).map(p => {
            const productJson = JSON.stringify(p).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const basePrice = parsePrice(p.priceNumber || p.price);
            const salePrice = p.discount ? Math.floor(basePrice * (1 - p.discount / 100)) : basePrice;
            return `
            <div class="carousel-item" data-id="${p.id}" onclick='showModal(${productJson})' style="cursor:pointer">
                <img src="${p.image || ''}" alt="${p.name}" onerror="this.style.display='none'">
                <div class="carousel-item-name">${p.name}</div>
                <div class="carousel-item-price">${fmtPrice(salePrice)}</div>
            </div>`;
        }).join('');
    } catch {}
}

// ── Flash sale ────────────────────────────────────────────────────────────────
async function renderFlashSale() {
    const el = document.getElementById('flash-products');
    if (!el) return;
    try {
        const products = await apiFetch('/products');
        const sale = products.filter(p => p.discount > 0).slice(0, 6);
        el.innerHTML = sale.length ? sale.map(p => productCard(p)).join('') : '<p style="color:#888">Không có Flash Sale hiện tại</p>';
    } catch {}
}

// ── Flash countdown ───────────────────────────────────────────────────────────
function startCountdown() {
    const el = document.getElementById('flash-countdown');
    if (!el) return;
    const end = new Date(); end.setHours(23, 59, 59, 0);
    const tick = () => {
        const d = end - new Date();
        if (d <= 0) { el.textContent = 'Đã kết thúc!'; return; }
        const h = String(Math.floor(d / 3600000)).padStart(2, '0');
        const m = String(Math.floor(d % 3600000 / 60000)).padStart(2, '0');
        const s = String(Math.floor(d % 60000 / 1000)).padStart(2, '0');
        el.textContent = `Kết thúc sau: ${h}:${m}:${s}`;
    };
    tick(); setInterval(tick, 1000);
}

// ── Populate brand filter ─────────────────────────────────────────────────────
async function populateBrands() {
    const sel = document.getElementById('brand-filter');
    if (!sel) return;
    try {
        const products = await apiFetch('/products');
        const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
        brands.forEach(b => {
            const o = document.createElement('option');
            o.value = b; o.textContent = b; sel.appendChild(o);
        });
    } catch {}
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    updateCartBadge();
    await loadWishlistIds();

    // Load products + extras in parallel
    loadProducts();
    renderCarousel();
    renderFlashSale();
    startCountdown();
    populateBrands();

    // Modal close
    const modal = document.getElementById('product-info-modal');
    document.getElementById('modal-close')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    // Search
    const searchInput = document.getElementById('search-input');
    const searchBtn   = document.getElementById('search-btn');
    searchBtn?.addEventListener('click', runFilters);
    searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') runFilters(); });
    searchInput?.addEventListener('input', e => showAutocomplete(e.target.value));

    // Filters
    ['category-filter','brand-filter','sort-by'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', runFilters);
    });

    // Reset
    document.getElementById('reset-filters')?.addEventListener('click', () => {
        ['search-input','price-min','price-max'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        ['category-filter','brand-filter','sort-by'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const ac = document.getElementById('autocomplete');
        if (ac) ac.style.display = 'none';
        loadProducts();
    });

    // Close autocomplete on outside click
    document.addEventListener('click', e => {
        const ac = document.getElementById('autocomplete');
        if (ac && !e.target.closest('.shopee-search, .search-bar')) ac.style.display = 'none';
    });

    // Carousel buttons
    const carousel = document.getElementById('recommended-carousel');
    const STEP = 220;
    document.getElementById('prev-recommended')?.addEventListener('click', () => carousel?.scrollBy({ left: -STEP, behavior: 'smooth' }));
    document.getElementById('next-recommended')?.addEventListener('click', () => carousel?.scrollBy({ left:  STEP, behavior: 'smooth' }));

    // Scroll to top
    const scrollBtn = document.getElementById('scroll-to-top');
    if (scrollBtn) {
        window.addEventListener('scroll', () => scrollBtn.classList.toggle('visible', window.scrollY > 300));
        scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
});
