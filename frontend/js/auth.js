// API_URL được khai báo trong script.js — không khai báo lại ở đây
if (typeof API_URL === 'undefined') window.API_URL = 'http://localhost:3001/api';

// ── Helpers ─────────────────────────────────────────────────────────────────
function getToken()  { return localStorage.getItem('authToken'); }
function getUser()   { try { return JSON.parse(localStorage.getItem('userInfo')) || null; } catch { return null; } }
function isAdmin()   { return getUser()?.role === 'admin'; }
function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

// ── Toast ────────────────────────────────────────────────────────────────────
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

// ── Cart count ───────────────────────────────────────────────────────────────
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// ── Header user actions (phân role) ─────────────────────────────────────────
function updateUserActions() {
    const el    = document.getElementById('user-actions');
    const elH   = document.getElementById('header-user-actions');
    const user  = getUser();

    if (el) {
        if (user) {
            const adminBtn = user.role === 'admin'
                ? `<a href="admin.html" class="top-auth">⚙️ Admin</a><span class="top-sep">|</span>` : '';
            el.innerHTML = `
                ${adminBtn}
                <a href="profile.html" class="top-auth">👤 ${user.username}</a>
                <span class="top-sep">|</span>
                <a href="wishlist.html" class="top-auth">❤️ Yêu thích</a>
                <span class="top-sep">|</span>
                <a href="orders.html" class="top-auth">📦 Đơn hàng</a>
                <span class="top-sep">|</span>
                <a href="#" onclick="logout();return false;" class="top-auth">Đăng xuất</a>`;
        } else {
            el.innerHTML = `
                <a href="register.html" class="top-auth">Đăng Ký</a>
                <span class="top-sep">|</span>
                <a href="login.html" class="top-auth">Đăng Nhập</a>`;
        }
    }

    // Nút nổi bật trong header chính
    if (elH) {
        if (user) {
            const adminBtn = user.role === 'admin'
                ? `<a href="admin.html" class="header-auth-btn header-admin-btn">⚙️ Admin</a>` : '';
            elH.innerHTML = `
                ${adminBtn}
                <a href="profile.html" class="header-auth-btn header-user-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    ${user.username}
                </a>
                <a href="#" onclick="logout();return false;" class="header-auth-btn header-logout-btn">Đăng xuất</a>`;
        } else {
            elH.innerHTML = `
                <a href="register.html" class="header-auth-btn header-register-btn">Đăng Ký</a>
                <a href="login.html" class="header-auth-btn header-login-btn">Đăng Nhập</a>`;
        }
    }

    updateCartCount();
}

// ── Logout ───────────────────────────────────────────────────────────────────
function logout() {
    ['authToken','currentUser','userId','userInfo'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
}

// ── Require login (redirect nếu chưa đăng nhập) ─────────────────────────────
function requireLogin(redirectTo) {
    if (!getToken()) {
        const path = redirectTo || location.pathname.split('/').pop() || 'index.html';
        window.location.href = `login.html?redirect=${encodeURIComponent(path)}`;
        return false;
    }
    return true;
}

// ── Require admin (chặn user thường vào trang admin) ─────────────────────────
function requireAdmin() {
    if (!getToken()) {
        window.location.href = 'login.html?redirect=admin.html';
        return false;
    }
    if (!isAdmin()) {
        showToast('Bạn không có quyền truy cập trang này!', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return false;
    }
    return true;
}

// ── Inline message helper ────────────────────────────────────────────────────
function setMsg(id, text, isError = true) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? '#ee4d2d' : '#26aa99';
    el.style.display = text ? 'block' : 'none';
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateUserActions();

    // Guard trang admin
    if (location.pathname.includes('admin.html')) {
        requireAdmin();
    }
    // Guard trang cần login
    // cart.html không cần login để xem, chỉ cần login khi checkout (xử lý trong cart.js)
    const protectedPages = ['orders.html', 'wishlist.html', 'profile.html'];
    if (protectedPages.some(p => location.pathname.includes(p))) {
        requireLogin();
    }
});
