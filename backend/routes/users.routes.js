const express = require('express');
const { query } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me
router.get('/me', verifyToken, async (req, res) => {
    try {
        const rows = await query(
            'SELECT id, username, email, role, displayname, phone, gender, birthday, avatar_url, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PUT /api/users/me
router.put('/me', verifyToken, async (req, res) => {
    try {
        const { displayname, phone, gender, birthday, avatar_url, username } = req.body;

        // Kiểm tra username mới có bị trùng không
        if (username && username !== req.user.username) {
            const conflict = await query(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, req.user.id]
            );
            if (conflict.length > 0) {
                return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
            }
        }

        // Validate phone
        if (phone && !/^0\d{9}$/.test(phone)) {
            return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
        }

        await query(
            `UPDATE users SET
                displayname = ?, phone = ?, gender = ?, birthday = ?,
                avatar_url = ?, username = COALESCE(?, username)
             WHERE id = ?`,
            [displayname || null, phone || null, gender || null, birthday || null,
             avatar_url || null, username || null, req.user.id]
        );

        const updated = await query(
            'SELECT id, username, email, role, displayname, phone, gender, birthday, avatar_url FROM users WHERE id = ?',
            [req.user.id]
        );
        res.json({ message: 'Cập nhật thành công', user: updated[0] });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/users/wishlist  — trả về danh sách sản phẩm đầy đủ
router.get('/wishlist', verifyToken, async (req, res) => {
    try {
        const rows = await query(
            `SELECT p.id, p.name, p.price, p.price_number, p.old_price, p.image, p.category, p.brand,
                    p.discount, p.stock, p.description
             FROM wishlist w JOIN products p ON w.product_id = p.id
             WHERE w.user_id = ?`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/users/wishlist
router.post('/wishlist', verifyToken, async (req, res) => {
    try {
        const { productId } = req.body;
        await query(
            'INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)',
            [req.user.id, productId]
        );
        res.json({ message: 'Đã thêm vào yêu thích' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// DELETE /api/users/wishlist/:productId
router.delete('/wishlist/:productId', verifyToken, async (req, res) => {
    try {
        await query(
            'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
            [req.user.id, req.params.productId]
        );
        res.json({ message: 'Đã xóa khỏi yêu thích' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/users  — danh sách người dùng (admin)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const rows = await query(
            'SELECT id, username, email, role, displayname, phone, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
