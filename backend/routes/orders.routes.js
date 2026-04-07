const express = require('express');
const { pool, query } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders  — đặt hàng (yêu cầu đăng nhập)
router.post('/', verifyToken, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { name, phone, address, note, items, subtotal, discount, ship, total, voucher } = req.body;

        if (!name || !phone || !address || !items || !items.length) {
            return res.status(400).json({ error: 'Thiếu thông tin đơn hàng' });
        }

        await conn.beginTransaction();

        // Kiểm tra và giảm tồn kho (transaction an toàn)
        for (const item of items) {
            const [rows] = await conn.execute(
                'SELECT stock FROM products WHERE id = ? FOR UPDATE',
                [item.id]
            );
            if (!rows.length) {
                await conn.rollback();
                return res.status(400).json({ error: `Sản phẩm ID ${item.id} không tồn tại` });
            }
            if (rows[0].stock < item.quantity) {
                await conn.rollback();
                return res.status(400).json({
                    error: `Sản phẩm "${item.name}" chỉ còn ${rows[0].stock} sản phẩm trong kho`
                });
            }
            await conn.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.id]
            );
        }

        // Tạo đơn hàng
        const orderId = 'DH' + Date.now();
        await conn.execute(
            `INSERT INTO orders (id, user_id, name, phone, address, note, subtotal, discount, ship, total, voucher, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [orderId, req.user.id, name, phone, address, note || '', subtotal, discount || 0, ship || 0, total, voucher || null]
        );

        // Thêm chi tiết đơn hàng
        for (const item of items) {
            await conn.execute(
                `INSERT INTO order_items (order_id, product_id, name, price, image, quantity)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.id, item.name, item.price, item.image, item.quantity]
            );
        }

        await conn.commit();

        res.status(201).json({
            message: 'Đặt hàng thành công',
            orderId,
            order: { id: orderId, status: 'pending', total, items }
        });
    } catch (err) {
        await conn.rollback();
        console.error('Place order error:', err);
        res.status(500).json({ error: 'Lỗi server khi đặt hàng' });
    } finally {
        conn.release();
    }
});

// GET /api/orders/mine  — đơn hàng của tôi
router.get('/mine', verifyToken, async (req, res) => {
    try {
        const orders = await query(
            `SELECT o.*,
             (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                 'id', oi.id, 'product_id', oi.product_id, 'name', oi.name,
                 'price', oi.price, 'image', oi.image, 'quantity', oi.quantity
             )) FROM order_items oi WHERE oi.order_id = o.id) AS items
             FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        // Parse items JSON string
        const result = orders.map(o => ({
            ...o,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
        }));
        res.json(result);
    } catch (err) {
        console.error('Get my orders error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/orders  — tất cả đơn hàng (admin)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const orders = await query(
            `SELECT o.*, u.username,
             (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                 'id', oi.id, 'product_id', oi.product_id, 'name', oi.name,
                 'price', oi.price, 'image', oi.image, 'quantity', oi.quantity
             )) FROM order_items oi WHERE oi.order_id = o.id) AS items
             FROM orders o LEFT JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC`
        );
        const result = orders.map(o => ({
            ...o,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
        }));
        res.json(result);
    } catch (err) {
        console.error('Get all orders error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/orders/stats  — thống kê (admin)
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const [revenue] = await query(
            `SELECT COALESCE(SUM(total),0) AS total_revenue, COUNT(*) AS total_orders FROM orders WHERE status != 'cancelled'`
        );
        const [delivered] = await query(`SELECT COUNT(*) AS cnt FROM orders WHERE status='delivered'`);
        const [pending]   = await query(`SELECT COUNT(*) AS cnt FROM orders WHERE status='pending'`);
        const catRevenue  = await query(
            `SELECT p.category, SUM(oi.price * oi.quantity) AS revenue
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             JOIN orders o ON oi.order_id = o.id
             WHERE o.status != 'cancelled'
             GROUP BY p.category ORDER BY revenue DESC`
        );
        const topProducts = await query(
            `SELECT oi.name, SUM(oi.quantity) AS qty, SUM(oi.price * oi.quantity) AS revenue
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.status = 'delivered'
             GROUP BY oi.product_id, oi.name ORDER BY revenue DESC LIMIT 10`
        );
        res.json({
            totalRevenue:   revenue.total_revenue,
            totalOrders:    revenue.total_orders,
            delivered:      delivered.cnt,
            pending:        pending.cnt,
            categoryRevenue: catRevenue,
            topProducts
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PUT /api/orders/:id/status  — cập nhật trạng thái (admin)
router.put('/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
        if (!valid.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        }
        await query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Cập nhật trạng thái thành công' });

        // Gửi email thông báo (không block response)
        try {
            const { sendOrderStatusEmail } = require('../utils/mailer');
            const [order] = await query(
                `SELECT o.*, u.email, u.username
                 FROM orders o JOIN users u ON o.user_id = u.id
                 WHERE o.id = ?`, [req.params.id]
            );
            if (order && order.email) {
                const items = await query(
                    'SELECT name, price, quantity FROM order_items WHERE order_id = ?',
                    [req.params.id]
                );
                sendOrderStatusEmail(order.email, order.username, order.id, status, order.total, items)
                    .catch(err => console.error('Email error:', err.message));
            }
        } catch(emailErr) {
            console.error('Email send error:', emailErr.message);
        }
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
