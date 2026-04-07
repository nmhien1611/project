const express = require('express');
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews/:productId — Lấy đánh giá của sản phẩm
router.get('/:productId', async (req, res) => {
    try {
        const reviews = await query(
            `SELECT r.id, r.rating, r.comment, r.created_at,
                    u.username, u.displayname, u.avatar_url
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.product_id = ?
             ORDER BY r.created_at DESC`,
            [req.params.productId]
        );

        // Thống kê rating
        const stats = await query(
            `SELECT
                COUNT(*) AS total,
                ROUND(AVG(rating), 1) AS avg_rating,
                SUM(rating = 5) AS five,
                SUM(rating = 4) AS four,
                SUM(rating = 3) AS three,
                SUM(rating = 2) AS two,
                SUM(rating = 1) AS one
             FROM reviews WHERE product_id = ?`,
            [req.params.productId]
        );

        res.json({ reviews, stats: stats[0] });
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/reviews/:productId — Thêm đánh giá (cần đăng nhập)
router.post('/:productId', verifyToken, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.productId;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Điểm đánh giá phải từ 1 đến 5' });
        }

        // Kiểm tra sản phẩm tồn tại
        const product = await query('SELECT id FROM products WHERE id = ?', [productId]);
        if (!product.length) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

        // Kiểm tra đã mua chưa (tùy chọn - có thể bỏ nếu muốn ai cũng review được)
        // const bought = await query(
        //     `SELECT 1 FROM order_items oi JOIN orders o ON oi.order_id = o.id
        //      WHERE oi.product_id = ? AND o.user_id = ? AND o.status = 'delivered'`,
        //     [productId, req.user.id]
        // );
        // if (!bought.length) return res.status(403).json({ error: 'Bạn cần mua và nhận hàng để đánh giá' });

        // Kiểm tra đã đánh giá chưa
        const existing = await query(
            'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
            [productId, req.user.id]
        );

        if (existing.length) {
            // Cập nhật đánh giá cũ
            await query(
                'UPDATE reviews SET rating = ?, comment = ?, created_at = NOW() WHERE product_id = ? AND user_id = ?',
                [rating, comment || '', productId, req.user.id]
            );
        } else {
            // Thêm đánh giá mới
            await query(
                'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
                [productId, req.user.id, rating, comment || '']
            );
        }

        // Cập nhật avg rating và review_count trên bảng products
        await query(
            `UPDATE products SET
                rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = ?),
                review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
             WHERE id = ?`,
            [productId, productId, productId]
        );

        res.json({ message: existing.length ? 'Cập nhật đánh giá thành công' : 'Đánh giá thành công' });
    } catch (err) {
        console.error('Post review error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// DELETE /api/reviews/:productId — Xóa đánh giá của mình
router.delete('/:productId', verifyToken, async (req, res) => {
    try {
        await query(
            'DELETE FROM reviews WHERE product_id = ? AND user_id = ?',
            [req.params.productId, req.user.id]
        );
        // Cập nhật lại rating
        await query(
            `UPDATE products SET
                rating = COALESCE((SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id = ?), 5.0),
                review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
             WHERE id = ?`,
            [req.params.productId, req.params.productId, req.params.productId]
        );
        res.json({ message: 'Đã xóa đánh giá' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
