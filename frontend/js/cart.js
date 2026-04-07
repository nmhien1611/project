// API_URL đã được khai báo trong auth.js (const) — không khai báo lại ở đây
if (typeof ADDR_API === 'undefined') var ADDR_API = 'https://provinces.open-api.vn/api';

let cart = [];
let appliedVoucher = null;
const SHIP_FEE = 30000;

function loadCart() {
    try { cart = JSON.parse(localStorage.getItem('cart') || '[]'); }
    catch { cart = []; }
    if (!Array.isArray(cart)) cart = [];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('authToken'); }
function parsePrice(p) {
    if (typeof p === 'number') return p;
    return parseInt(String(p).replace(/[^\d]/g, '')) || 0;
}
function fmtPrice(p) { return parsePrice(p).toLocaleString('vi-VN') + '₫'; }

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

function setFormErr(msg) {
    const el = document.getElementById('form-err');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
}

// ── Views & Steps ──────────────────────────────────────────────────────────────
function showView(name) {
    ['view-cart', 'view-checkout', 'view-success'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === 'view-' + name ? 'block' : 'none';
    });

    const sidebar    = document.getElementById('cart-sidebar');
    const footerBar  = document.getElementById('cart-footer-bar');
    const colHeader  = document.querySelector('.cart-col-header');

    if (name === 'cart') {
        setStep(1);
        if (sidebar)   sidebar.style.display   = '';
        if (footerBar) footerBar.style.display  = 'flex';
        if (colHeader) colHeader.style.display  = 'flex';
    } else if (name === 'checkout') {
        setStep(2);
        if (sidebar)   sidebar.style.display   = '';
        if (footerBar) footerBar.style.display  = 'none';
        if (colHeader) colHeader.style.display  = 'none';
    } else if (name === 'success') {
        setStep(3, true);
        if (sidebar)   sidebar.style.display   = 'none';
        if (footerBar) footerBar.style.display  = 'none';
        if (colHeader) colHeader.style.display  = 'none';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(active, allDone) {
    [1, 2, 3].forEach(n => {
        const el = document.getElementById('step-bar-' + n);
        if (!el) return;
        el.className = 'step-item';
        if (allDone && n <= 3)      el.classList.add('done');
        else if (n < active)        el.classList.add('done');
        else if (n === active)      el.classList.add('active');
    });
}

// ── Cart count ─────────────────────────────────────────────────────────────────
function updateCartCount() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
    // cart-item-count shows number of distinct product types
    document.querySelectorAll('#cart-item-count').forEach(el => el.textContent = cart.length);
}

// ── Totals ─────────────────────────────────────────────────────────────────────
function calcSubtotal() { return cart.reduce((s, i) => s + parsePrice(i.price) * i.quantity, 0); }

function updateTotals() {
    const sub = calcSubtotal();
    const qty = cart.reduce((s, i) => s + i.quantity, 0);
    let discount = 0, ship = cart.length ? SHIP_FEE : 0;
    if (appliedVoucher) {
        if (appliedVoucher.type === 'percent')    discount = Math.floor(sub * appliedVoucher.value / 100);
        else if (appliedVoucher.type === 'fixed') discount = appliedVoucher.value;
        else if (appliedVoucher.type === 'freeship') ship = 0;
    }
    const final = sub - discount + ship;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('s-sub',   fmtPrice(sub));
    set('s-ship',  ship > 0 ? fmtPrice(ship) : 'Miễn phí');
    set('s-total', fmtPrice(final));
    set('s-qty',   qty);
    set('s-total-bar', fmtPrice(final));   // bottom bar

    const sDiscRow = document.getElementById('s-discount-row');
    if (sDiscRow) sDiscRow.style.display = discount > 0 ? 'flex' : 'none';
    if (discount > 0) set('s-discount', '-' + fmtPrice(discount));

    // Disable checkout buttons if empty
    ['btn-to-checkout', 'btn-checkout-bar'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !cart.length;
    });
}

// ── Vouchers ───────────────────────────────────────────────────────────────────
async function loadVouchers() {
    const list = document.getElementById('voucher-list');
    if (!list) return;
    const token = getToken();
    if (!token) {
        list.innerHTML = '<p class="v-note">Đăng nhập để xem và dùng mã voucher</p>';
        return;
    }
    try {
        const res  = await fetch(`${API_URL}/vouchers`, { headers: { Authorization: 'Bearer ' + token } });
        const data = await res.json();
        if (!res.ok || !data.length) { list.innerHTML = ''; return; }
        list.innerHTML = data.map(v => `
            <div class="voucher-card ${appliedVoucher?.code === v.code ? 'active' : ''}" onclick="applyVoucher('${v.code}')">
                <div class="v-icon">${v.type === 'freeship' ? '🚚' : '🎟️'}</div>
                <div class="v-info">
                    <div class="v-code">${v.code}</div>
                    <div class="v-desc">${v.description || ''}</div>
                    ${v.min_order > 0 ? `<div class="v-min">Đơn tối thiểu ${v.min_order.toLocaleString()}₫</div>` : ''}
                </div>
                <button class="v-btn">${appliedVoucher?.code === v.code ? '✔ Đang dùng' : 'Dùng'}</button>
            </div>`).join('');
    } catch { list.innerHTML = ''; }
}

async function applyVoucher(code) {
    const msg   = document.getElementById('voucher-msg');
    const token = getToken();
    if (!token) { if (msg) msg.innerHTML = '<span class="v-err">❌ Bạn cần đăng nhập để dùng voucher!</span>'; return; }
    const subtotal = calcSubtotal();
    try {
        const res  = await fetch(`${API_URL}/vouchers/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ code: code.trim().toUpperCase(), subtotal })
        });
        const data = await res.json();
        if (res.ok) {
            appliedVoucher = { code: data.code, type: data.type, value: data.value, description: data.description };
            if (msg) msg.innerHTML = `<span class="v-ok">✅ Áp dụng <b>${data.code}</b> — ${data.description}</span>`;
            const inp = document.getElementById('voucher-input');
            if (inp) inp.value = '';
            loadVouchers(); updateTotals();
        } else {
            if (msg) msg.innerHTML = `<span class="v-err">❌ ${data.error}</span>`;
        }
    } catch { if (msg) msg.innerHTML = '<span class="v-err">❌ Không kết nối được server</span>'; }
}

// ── Render cart ────────────────────────────────────────────────────────────────
function getCheckedIds() {
    return [...document.querySelectorAll('.item-cb:checked')].map(cb => cb.dataset.id);
}

function updateCheckAll() {
    const all  = document.querySelectorAll('.item-cb');
    const chk  = document.querySelectorAll('.item-cb:checked');
    const ca   = document.getElementById('check-all');
    if (!ca) return;
    ca.indeterminate = chk.length > 0 && chk.length < all.length;
    ca.checked = all.length > 0 && chk.length === all.length;
}

function displayCart() {
    loadCart();   // luôn đọc fresh từ localStorage
    const container = document.getElementById('cart-items');
    if (!container) return;
    updateCartCount();

    if (!cart.length) {
        container.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <h3>Giỏ hàng của bạn còn trống</h3>
                <p>Hãy chọn thêm sản phẩm để mua sắm nhé!</p>
                <a href="index.html" class="btn-shop-now">Mua Sắm Ngay</a>
            </div>`;
        loadVouchers(); updateTotals(); return;
    }

    container.innerHTML = cart.map(item => {
        const price = parsePrice(item.price);
        const imgHtml = item.image
            ? `<img src="${item.image}" alt="" class="ci-img" onerror="this.style.display='none'">`
            : `<div class="ci-img" style="background:#f5f5f5"></div>`;
        return `
        <div class="cart-item" data-id="${item.id}">
            <div class="ci-cb">
                <input type="checkbox" class="item-cb" data-id="${item.id}" checked onchange="updateCheckAll()">
            </div>
            <a href="product.html?id=${item.id}" class="ci-img-link">${imgHtml}</a>
            <div class="ci-name-col">
                <a href="product.html?id=${item.id}" class="ci-name">${item.name}</a>
            </div>
            <div class="ci-price-col">${fmtPrice(price)}</div>
            <div class="ci-qty-col">
                <div class="qty-ctrl">
                    <button onclick="changeQty('${item.id}', -1)">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <div class="ci-total-col">${fmtPrice(price * item.quantity)}</div>
            <div class="ci-del-col">
                <button class="ci-del" onclick="removeItem('${item.id}')">Xóa</button>
            </div>
        </div>`;
    }).join('');

    updateCheckAll();
    loadVouchers(); updateTotals();
}

function changeQty(id, delta) {
    const item = cart.find(i => String(i.id) === String(id));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter(i => String(i.id) !== String(id));
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
}

function removeItem(id) {
    cart = cart.filter(i => String(i.id) !== String(id));
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
}

function clearCart() {
    if (!cart.length) return;
    if (!confirm('Xoá toàn bộ giỏ hàng?')) return;
    cart = []; localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
}

function deleteSelected() {
    const ids = getCheckedIds();
    if (!ids.length) { showToast('Chưa chọn sản phẩm nào!', 'warn'); return; }
    cart = cart.filter(i => !ids.includes(String(i.id)));
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
}

// ── Vietnam Address API ────────────────────────────────────────────────────────
async function loadProvinces() {
    const sel = document.getElementById('sel-province');
    if (!sel) return;
    sel.innerHTML = '<option value="">⏳ Đang tải...</option>';
    try {
        const res  = await fetch(`${ADDR_API}/p/`);
        const data = await res.json();
        sel.innerHTML = '<option value="">-- Chọn tỉnh/thành phố --</option>'
            + data.map(p => `<option value="${p.code}">${p.name}</option>`).join('');
    } catch {
        sel.innerHTML = '<option value="">Không tải được dữ liệu</option>';
    }
}

async function loadDistricts(provinceCode) {
    const sel     = document.getElementById('sel-district');
    const selWard = document.getElementById('sel-ward');
    if (!sel) return;
    sel.disabled = true; sel.innerHTML = '<option value="">-- Chọn quận/huyện --</option>';
    if (selWard) { selWard.disabled = true; selWard.innerHTML = '<option value="">-- Chọn phường/xã --</option>'; }
    if (!provinceCode) { updateAddrHint(); return; }
    sel.innerHTML = '<option value="">⏳ Đang tải...</option>';
    try {
        const res  = await fetch(`${ADDR_API}/p/${provinceCode}?depth=2`);
        const data = await res.json();
        sel.innerHTML = '<option value="">-- Chọn quận/huyện --</option>'
            + (data.districts || []).map(d => `<option value="${d.code}">${d.name}</option>`).join('');
        sel.disabled = false;
    } catch {
        sel.innerHTML = '<option value="">Không tải được dữ liệu</option>';
    }
    updateAddrHint();
}

async function loadWards(districtCode) {
    const sel = document.getElementById('sel-ward');
    if (!sel) return;
    sel.disabled = true; sel.innerHTML = '<option value="">-- Chọn phường/xã --</option>';
    if (!districtCode) { updateAddrHint(); return; }
    sel.innerHTML = '<option value="">⏳ Đang tải...</option>';
    try {
        const res  = await fetch(`${ADDR_API}/d/${districtCode}?depth=2`);
        const data = await res.json();
        sel.innerHTML = '<option value="">-- Chọn phường/xã --</option>'
            + (data.wards || []).map(w => `<option value="${w.code}">${w.name}</option>`).join('');
        sel.disabled = false;
    } catch {
        sel.innerHTML = '<option value="">Không tải được dữ liệu</option>';
    }
    updateAddrHint();
}

function getSelectedText(selId) {
    const sel = document.getElementById(selId);
    return sel?.options[sel.selectedIndex]?.text || '';
}

function buildFullAddress() {
    const street   = document.getElementById('o-street')?.value.trim() || '';
    const ward     = getSelectedText('sel-ward');
    const district = getSelectedText('sel-district');
    const province = getSelectedText('sel-province');
    return [street, ward, district, province].filter(p => p && !p.startsWith('--') && !p.startsWith('⏳')).join(', ');
}

function updateAddrHint() {
    const hint = document.getElementById('addr-full-hint');
    const previewBox  = document.getElementById('addr-preview-box');
    const previewText = document.getElementById('addr-preview-text');
    const addr = buildFullAddress();
    if (hint) {
        hint.textContent = addr || '';
        hint.style.display = addr ? 'block' : 'none';
    }
    if (previewBox && previewText) {
        if (addr) {
            previewBox.style.display = 'block';
            previewText.textContent = addr;
        } else {
            previewBox.style.display = 'none';
        }
    }
}

function prefillUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('userInfo'));
        if (!user) return;
        const nameEl  = document.getElementById('o-name');
        const phoneEl = document.getElementById('o-phone');
        if (nameEl  && !nameEl.value  && (user.displayname || user.username))
            nameEl.value = user.displayname || user.username;
        if (phoneEl && !phoneEl.value && user.phone)
            phoneEl.value = user.phone;
    } catch {}
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initCart() {
    loadCart();
    displayCart();

    // Clear all
    document.getElementById('btn-clear')?.addEventListener('click', clearCart);

    // Delete selected
    document.getElementById('btn-delete-sel')?.addEventListener('click', deleteSelected);

    // Check all
    document.getElementById('check-all')?.addEventListener('change', e => {
        document.querySelectorAll('.item-cb').forEach(cb => cb.checked = e.target.checked);
    });

    // Voucher
    document.getElementById('voucher-apply')?.addEventListener('click', () =>
        applyVoucher(document.getElementById('voucher-input')?.value || ''));
    document.getElementById('voucher-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') applyVoucher(e.target.value);
    });

    // Proceed to checkout
    document.getElementById('btn-to-checkout')?.addEventListener('click', () => {
        if (!cart.length) { showToast('Giỏ hàng đang trống!', 'warn'); return; }
        if (!getToken()) {
            showToast('Bạn cần đăng nhập để đặt hàng!', 'warn');
            setTimeout(() => window.location.href = 'login.html?redirect=cart.html', 1200);
            return;
        }
        showView('checkout');
        prefillUserInfo();
        loadProvinces();
    });

    // Back to cart
    document.getElementById('btn-back-cart')?.addEventListener('click', () => {
        showView('cart');
        const previewBox = document.getElementById('addr-preview-box');
        if (previewBox) previewBox.style.display = 'none';
    });

    // Address cascade
    document.getElementById('sel-province')?.addEventListener('change', e => loadDistricts(e.target.value));
    document.getElementById('sel-district')?.addEventListener('change', e => loadWards(e.target.value));
    document.getElementById('sel-ward')?.addEventListener('change', updateAddrHint);
    document.getElementById('o-street')?.addEventListener('input', updateAddrHint);

    // Confirm order
    document.getElementById('btn-confirm')?.addEventListener('click', async () => {
        const btn      = document.getElementById('btn-confirm');
        const name     = document.getElementById('o-name')?.value.trim();
        const phone    = document.getElementById('o-phone')?.value.trim();
        const province = document.getElementById('sel-province')?.value;
        const district = document.getElementById('sel-district')?.value;
        const ward     = document.getElementById('sel-ward')?.value;
        const street   = document.getElementById('o-street')?.value.trim();
        const note     = document.getElementById('o-note')?.value.trim() || '';
        const payment  = document.querySelector('input[name="payment"]:checked')?.value || 'cod';

        if (!name)     { setFormErr('Vui lòng nhập họ và tên!'); return; }
        if (!phone)    { setFormErr('Vui lòng nhập số điện thoại!'); return; }
        if (!/^0\d{9}$/.test(phone)) { setFormErr('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)!'); return; }
        if (!province) { setFormErr('Vui lòng chọn tỉnh/thành phố!'); return; }
        if (!district) { setFormErr('Vui lòng chọn quận/huyện!'); return; }
        if (!ward)     { setFormErr('Vui lòng chọn phường/xã!'); return; }
        if (!street)   { setFormErr('Vui lòng nhập số nhà, tên đường!'); return; }
        setFormErr('');

        btn.disabled = true; btn.textContent = '⏳ Đang xử lý...';

        const subtotal = calcSubtotal();
        let discount = 0, ship = SHIP_FEE;
        if (appliedVoucher) {
            if (appliedVoucher.type === 'percent')    discount = Math.floor(subtotal * appliedVoucher.value / 100);
            else if (appliedVoucher.type === 'fixed') discount = appliedVoucher.value;
            else if (appliedVoucher.type === 'freeship') ship = 0;
        }
        const total       = subtotal - discount + ship;
        const fullAddress = buildFullAddress();

        const payload = {
            name, phone,
            address: fullAddress,
            note,
            payment_method: payment,
            items: cart.map(i => ({
                id: i.id, name: i.name,
                price: parsePrice(i.price),
                image: i.image || '',
                quantity: i.quantity
            })),
            subtotal, discount, ship, total,
            voucher: appliedVoucher?.code || null
        };

        try {
            const res  = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) {
                setFormErr(data.error || 'Đặt hàng thất bại!');
                btn.disabled = false; btn.textContent = '✅ Đặt hàng ngay';
                return;
            }

            // Clear cart
            cart = []; localStorage.setItem('cart', JSON.stringify(cart));
            appliedVoucher = null;
            updateCartCount();

            // Populate success view
            const infoBox = document.getElementById('success-info');
            if (infoBox) {
                infoBox.innerHTML = `
                    <div class="orow"><span class="key">🏷️ Mã đơn hàng</span><span style="color:#ee4d2d;font-weight:700">#${data.orderId}</span></div>
                    <div class="orow"><span class="key">👤 Người nhận</span><span>${name}</span></div>
                    <div class="orow"><span class="key">📞 Điện thoại</span><span>${phone}</span></div>
                    <div class="orow"><span class="key">📍 Địa chỉ</span><span style="text-align:right;max-width:200px">${fullAddress}</span></div>
                    ${note ? `<div class="orow"><span class="key">📝 Ghi chú</span><span>${note}</span></div>` : ''}
                    <div class="orow"><span class="key">💳 Thanh toán</span><span>${payment === 'cod' ? 'Tiền mặt (COD)' : 'Chuyển khoản'}</span></div>
                    ${discount > 0 ? `<div class="orow" style="color:#26aa99"><span class="key">🎟️ Giảm giá</span><span>-${fmtPrice(discount)}</span></div>` : ''}
                    <div class="orow"><span class="key">🚚 Phí ship</span><span>${ship > 0 ? fmtPrice(ship) : 'Miễn phí'}</span></div>
                    <div class="orow"><span class="key">💰 Tổng thanh toán</span><span>${fmtPrice(total)}</span></div>`;
            }

            // QR section
            const qrSec = document.getElementById('qr-section');
            if (qrSec) qrSec.style.display = payment === 'transfer' ? 'block' : 'none';

            showView('success');
            showToast('Đặt hàng thành công! 🎉');
        } catch (err) {
            setFormErr('Không kết nối được server!');
            btn.disabled = false; btn.textContent = '✅ Đặt hàng ngay';
        }
    });
}

// Chạy ngay (scripts ở cuối body, DOM đã sẵn sàng)
initCart();

// Xử lý bfcache (browser back/forward navigation)
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        loadCart();
        displayCart();
    }
});
