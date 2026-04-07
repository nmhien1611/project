const express = require('express');
const { query } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/vouchers  — danh sách voucher active
router.get('/', verifyToken, async (req, res) => {
    try {
        const rows = await query('SELECT * FROM vouchers WHERE active = 1 ORDER BY code');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/vouchers/validate  — kiểm tra và tính giảm giá
router.post('/validate', verifyToken, async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã voucher' });

        const rows = await query(
            'SELECT * FROM vouchers WHERE code = ? AND active = 1',
            [code.toUpperCase()]
        );
        if (!rows.length) return res.status(404).json({ error: 'Mã voucher không hợp lệ' });

        const v = rows[0];
        if (subtotal < v.min_order) {
            return res.status(400).json({
                error: `Đơn hàng tối thiểu ${v.min_order.toLocaleString()} VND để dùng voucher này`
            });
        }

        let discountAmount = 0;
        let shipDiscount = 0;
        if (v.type === 'percent') discountAmount = Math.floor(subtotal * v.value / 100);
        else if (v.type === 'fixed')  discountAmount = v.value;
        else if (v.type === 'freeship') shipDiscount = 30000;

        res.json({
            valid: true,
            code: v.code,
            type: v.type,
            value: v.value,
            description: v.description,
            discountAmount,
            shipDiscount
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/vouchers  — tạo voucher (admin)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { code, type, value, min_order, description } = req.body;
        await query(
            'INSERT INTO vouchers (code, type, value, min_order, description) VALUES (?, ?, ?, ?, ?)',
            [code.toUpperCase(), type, value, min_order || 0, description || '']
        );
        res.status(201).json({ message: 'Tạo voucher thành công' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Mã voucher đã tồn tại' });
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
