const API_URL = 'http://localhost:3001/api';

function getToken() { return localStorage.getItem('authToken'); }
function authHeaders() { return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() }; }

async function apiFetch(path, opts = {}) {
    const res  = await fetch(API_URL + path, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

function adminToast(msg, type = 'success') {
    const old = document.getElementById('__adminToast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = '__adminToast';
    t.textContent = msg;
    t.style.cssText = `position:fixed;top:24px;right:24px;
        background:${type === 'error' ? '#ee4d2d' : '#26aa99'};
        color:#fff;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:500;
        z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.2)`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const s = await apiFetch('/orders/stats');

        // Stat cards
        const statCards = document.getElementById('stat-cards');
        if (statCards) {
            statCards.innerHTML = `
                <div class="stat-card"><div class="stat-num">${(s.totalRevenue||0).toLocaleString('vi-VN')}₫</div><div class="stat-label">Tổng doanh thu</div></div>
                <div class="stat-card stat-card-link" onclick="switchAdminTab('orders');filterOrders('all',document.querySelector('.order-filter-btn'))" title="Xem tất cả đơn hàng"><div class="stat-num">${s.totalOrders||0}</div><div class="stat-label">Tổng đơn hàng</div></div>
                <div class="stat-card stat-card-link" onclick="switchAdminTab('orders');filterOrders('delivered',document.querySelectorAll('.order-filter-btn')[4])" title="Xem đơn đã giao"><div class="stat-num">${s.delivered||0}</div><div class="stat-label">Đơn đã giao</div></div>
                <div class="stat-card stat-card-link" onclick="switchAdminTab('orders');filterOrders('pending',document.querySelectorAll('.order-filter-btn')[1])" title="Xem đơn chờ xác nhận"><div class="stat-num">${s.pending||0}</div><div class="stat-label">Chờ xác nhận</div></div>`;
        }

        // Category bar chart
        const chartEl = document.getElementById('bar-chart');
        if (chartEl) {
            const top = (s.topProducts || []).slice(0, 8);
            const maxVal = Math.max(...top.map(p => p.revenue), 1);
            chartEl.innerHTML = top.length
                ? top.map(p => `
                    <div class="bar-item">
                        <div class="bar-val">${(p.revenue/1000000).toFixed(1)}M</div>
                        <div class="bar" style="height:${Math.round((p.revenue/maxVal)*110)}px"></div>
                        <div class="bar-label">${p.name.length > 10 ? p.name.slice(0,10)+'…' : p.name}</div>
                    </div>`).join('')
                : '<p style="color:#aaa;margin:auto">Chưa có dữ liệu doanh thu</p>';
        }

        // Top products table
        const tbody = document.querySelector('#top-products-table tbody');
        if (tbody) {
            tbody.innerHTML = (s.topProducts||[]).length
                ? s.topProducts.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${p.name}</td>
                        <td>${p.qty}</td>
                        <td style="color:#ee4d2d;font-weight:bold">${(p.revenue||0).toLocaleString('vi-VN')}₫</td>
                    </tr>`).join('')
                : '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">Chưa có đơn hàng được giao</td></tr>';
        }
    } catch (err) {
        console.error('Stats error:', err);
    }
}

// ── Orders ────────────────────────────────────────────────────────────────────
const STATUS_LABELS = { pending:'Chờ xác nhận', confirmed:'Đã xác nhận', shipping:'Đang giao', delivered:'Đã giao', cancelled:'Đã huỷ' };
let currentOrderFilter = 'all';

async function loadOrders(filter = 'all') {
    currentOrderFilter = filter;
    const container = document.getElementById('admin-orders-list');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;padding:30px;color:#888">Đang tải...</p>';

    try {
        let orders = await apiFetch('/orders');
        if (filter !== 'all') orders = orders.filter(o => o.status === filter);

        if (!orders.length) {
            container.innerHTML = '<p style="text-align:center;padding:30px;color:#aaa">Không có đơn hàng nào</p>';
            return;
        }

        container.innerHTML = orders.map(o => `
            <div class="admin-order-card">
                <div class="admin-order-header">
                    <div>
                        <div class="admin-order-id">Mã: ${o.id}</div>
                        <div class="admin-order-date">${new Date(o.created_at).toLocaleString('vi-VN')}</div>
                    </div>
                    <span class="order-status-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
                    <div class="admin-order-total">${Number(o.total).toLocaleString('vi-VN')}₫</div>
                </div>
                <div class="admin-order-info">
                    👤 ${o.name} &nbsp;|&nbsp; 📞 ${o.phone} &nbsp;|&nbsp; 📍 ${o.address}
                    ${o.username ? ` &nbsp;|&nbsp; 🔑 ${o.username}` : ''}
                </div>
                <div class="admin-order-items">
                    ${(o.items || []).map(item => `
                        <div class="admin-order-item">
                            ${item.image ? `<img src="${item.image}" onerror="this.style.display='none'">` : ''}
                            <span>${item.name} x${item.quantity} — ${Number(item.price).toLocaleString('vi-VN')}₫</span>
                        </div>`).join('')}
                </div>
                <div class="status-row">
                    <span style="font-size:13px;font-weight:600;color:#555">Cập nhật:</span>
                    <select id="status-${o.id}" class="status-select">
                        ${Object.entries(STATUS_LABELS).map(([v, l]) =>
                            `<option value="${v}" ${o.status === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                    <button class="status-update-btn" onclick="updateStatus('${o.id}')">Lưu</button>
                </div>
            </div>`).join('');
    } catch (err) {
        container.innerHTML = `<p style="text-align:center;padding:30px;color:#ee4d2d">${err.message}</p>`;
    }
}

async function updateStatus(orderId) {
    const status = document.getElementById('status-' + orderId)?.value;
    if (!status) return;
    try {
        await apiFetch(`/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
        adminToast('Cập nhật trạng thái thành công!');
        loadOrders(currentOrderFilter);
    } catch (err) { adminToast(err.message, 'error'); }
}

function filterOrders(filter, btn) {
    document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadOrders(filter);
}

// ── Products ──────────────────────────────────────────────────────────────────
async function loadProducts() {
    const el = document.getElementById('product-list');
    if (!el) return;
    el.innerHTML = '<p style="text-align:center;padding:30px;color:#888">Đang tải...</p>';
    try {
        const products = await apiFetch('/products');

        // Tách hết hàng / còn hàng
        const outOfStock = products.filter(p => (p.stock ?? 0) <= 0);

        const renderCard = (p) => `
            <div class="admin-product-card" id="prod-card-${p.id}">
                <img src="${p.image || ''}" onerror="this.style.display='none'"
                     style="width:72px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0">
                <div style="flex:1;padding:0 14px;min-width:0">
                    <div style="font-weight:600;font-size:14px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                    <div style="color:#ee4d2d;font-weight:bold;margin-bottom:4px">${(p.priceNumber||parseInt(String(p.price).replace(/[^\d]/g,''))||0).toLocaleString('vi-VN')}₫</div>
                    <div style="color:#888;font-size:12px">${p.category || ''} · ${p.brand || ''}
                        · <span id="stock-label-${p.id}" style="font-weight:600;color:${(p.stock??0)<=0?'#dc3545':'#28a745'}">
                            Kho: ${p.stock ?? 0}
                          </span>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
                    <button onclick="editProduct(${p.id})" class="btn-edit-prod">✏️ Sửa</button>
                    <button onclick="deleteProduct(${p.id})" class="btn-del-prod">🗑️ Xoá</button>
                </div>
            </div>`;

        // Section hết hàng
        const outHtml = outOfStock.length ? `
            <div style="background:#fff5f5;border:1px solid #ffd0d0;border-radius:10px;padding:16px;margin-bottom:20px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                    <h3 style="margin:0;font-size:15px;color:#dc3545">🔴 Hết hàng (${outOfStock.length} sản phẩm)</h3>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    ${outOfStock.map(p => `
                    <div style="background:#fff;border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
                        <img src="${p.image||''}" onerror="this.style.display='none'"
                             style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0">
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                            <div style="color:#888;font-size:12px">${p.category||''} · ${(p.priceNumber||parseInt(String(p.price).replace(/[^\d]/g,''))||0).toLocaleString('vi-VN')}₫</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                            <input type="number" id="quick-stock-${p.id}" value="10" min="1" max="9999"
                                style="width:64px;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;text-align:center">
                            <button onclick="quickUpdateStock(${p.id})"
                                style="padding:5px 12px;background:#28a745;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">
                                + Nhập kho
                            </button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>` : `
            <div style="background:#f0fff4;border:1px solid #b2dfdb;border-radius:10px;padding:14px 18px;margin-bottom:20px;color:#28a745;font-weight:600;font-size:14px">
                ✅ Tất cả sản phẩm đều còn hàng
            </div>`;

        el.innerHTML = outHtml +
            `<h3 style="font-size:15px;margin:0 0 12px;color:#333">📦 Tất cả sản phẩm (${products.length})</h3>` +
            `<div style="display:flex;flex-direction:column;gap:10px">${products.map(renderCard).join('')}</div>`;

    } catch (err) {
        el.innerHTML = `<p style="text-align:center;color:#ee4d2d;padding:20px">${err.message}</p>`;
    }
}

async function quickUpdateStock(id) {
    const input = document.getElementById('quick-stock-' + id);
    const qty = parseInt(input?.value) || 0;
    if (qty <= 0) { adminToast('Số lượng phải lớn hơn 0', 'error'); return; }
    try {
        // Lấy thông tin sản phẩm hiện tại rồi cộng thêm
        const p = await apiFetch(`/products/${id}`);
        const newStock = (p.stock || 0) + qty;
        await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ ...p, stock: newStock }) });
        adminToast(`Đã nhập thêm ${qty} sản phẩm vào kho!`);
        loadProducts();
    } catch (err) { adminToast(err.message, 'error'); }
}

async function deleteProduct(id) {
    if (!confirm('Xoá sản phẩm này?')) return;
    try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
        adminToast('Đã xoá sản phẩm!');
        loadProducts();
    } catch (err) { adminToast(err.message, 'error'); }
}

async function editProduct(id) {
    try {
        const p = await apiFetch(`/products/${id}`);
        document.getElementById('prod-id').value          = p.id;
        document.getElementById('prod-name').value        = p.name;
        document.getElementById('prod-price').value       = p.price;
        document.getElementById('prod-category').value    = p.category  || '';
        document.getElementById('prod-brand').value       = p.brand     || '';
        document.getElementById('prod-stock').value       = p.stock     ?? '';
        document.getElementById('prod-image').value       = p.image     || '';
        document.getElementById('prod-discount').value    = p.discount  || 0;
        document.getElementById('prod-description').value = p.description || '';
        document.getElementById('add-product-form')?.scrollIntoView({ behavior: 'smooth' });
        document.querySelector('.form-submit-btn').textContent = '💾 Cập nhật sản phẩm';
    } catch (err) { adminToast(err.message, 'error'); }
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888">Đang tải...</td></tr>';
    try {
        const users = await apiFetch('/users');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td><span class="role-badge role-${u.role}">${u.role}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
            </tr>`).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ee4d2d;padding:20px">${err.message}</td></tr>`;
    }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelector(`.admin-tab[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById('tab-' + tab)?.classList.add('active');
    if (tab === 'stats')    loadStats();
    if (tab === 'orders')   loadOrders(currentOrderFilter);
    if (tab === 'products') loadProducts();
    if (tab === 'users')    loadUsers();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) { window.location.href = 'login.html'; return; }

    // Verify admin role
    try {
        const me = await apiFetch('/users/me');
        if (me.role !== 'admin') { alert('Bạn không có quyền truy cập!'); window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'login.html'; return; }

    // Product form submit
    const prodForm = document.getElementById('add-product-form');
    if (prodForm) {
        prodForm.addEventListener('submit', async e => {
            e.preventDefault();
            const id   = document.getElementById('prod-id').value;
            const body = {
                name:        document.getElementById('prod-name').value.trim(),
                price:       parseFloat(document.getElementById('prod-price').value),
                category:    document.getElementById('prod-category').value.trim(),
                brand:       document.getElementById('prod-brand').value.trim(),
                stock:       parseInt(document.getElementById('prod-stock').value) || 0,
                image:       document.getElementById('prod-image').value.trim(),
                discount:    parseInt(document.getElementById('prod-discount').value) || 0,
                description: document.getElementById('prod-description').value.trim(),
            };
            if (!body.name || !body.price) { adminToast('Tên và giá là bắt buộc!', 'error'); return; }
            try {
                if (id) {
                    await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
                    adminToast('Cập nhật sản phẩm thành công!');
                } else {
                    await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) });
                    adminToast('Thêm sản phẩm thành công!');
                }
                prodForm.reset();
                document.getElementById('prod-id').value = '';
                document.querySelector('.form-submit-btn').textContent = '➕ Thêm sản phẩm';
                loadProducts();
            } catch (err) { adminToast(err.message, 'error'); }
        });

        document.getElementById('prod-id')?.addEventListener('change', () => {
            const id = document.getElementById('prod-id').value;
            document.querySelector('.form-submit-btn').textContent = id ? '💾 Cập nhật sản phẩm' : '➕ Thêm sản phẩm';
        });
    }

    // Load default tab
    loadStats();
});
