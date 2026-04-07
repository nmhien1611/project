const express = require('express');
const { query } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/products  — public
router.get('/', async (req, res) => {
    try {
        const { category, brand, q, sort } = req.query;
        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        if (category) { sql += ' AND category = ?'; params.push(category); }
        if (brand)    { sql += ' AND brand = ?';    params.push(brand); }
        if (q)        { sql += ' AND (name LIKE ? OR brand LIKE ? OR category LIKE ?)';
                        params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

        if (sort === 'price-asc')  sql += ' ORDER BY price_number ASC';
        else if (sort === 'price-desc') sql += ' ORDER BY price_number DESC';
        else if (sort === 'discount')   sql += ' ORDER BY discount DESC';
        else if (sort === 'rating')     sql += ' ORDER BY rating DESC';
        else sql += ' ORDER BY id ASC';

        const rows = await query(sql, params);
        // Normalize field names để khớp với frontend (camelCase)
        const products = rows.map(r => ({
            id:          r.id,
            name:        r.name,
            price:       r.price,
            priceNumber: r.price_number,
            category:    r.category,
            brand:       r.brand,
            color:       r.color,
            capacity:    r.capacity,
            image:       r.image,
            description: r.description,
            discount:    r.discount,
            freeShip:    !!r.free_ship,
            rating:      parseFloat(r.rating),
            reviewCount: r.review_count || 0,
            stock:       r.stock,
            sold:        r.sold || 0
        }));
        res.json(products);
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/products/:id  — public
router.get('/:id', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        const r = rows[0];
        res.json({
            id: r.id, name: r.name, price: r.price, priceNumber: r.price_number,
            category: r.category, brand: r.brand, color: r.color, capacity: r.capacity,
            image: r.image, description: r.description,
            discount: r.discount, freeShip: !!r.free_ship,
            rating: parseFloat(r.rating), reviewCount: r.review_count || 0,
            stock: r.stock, sold: r.sold || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/products  — admin only
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { name, price, priceNumber, category, brand, color, capacity, image, discount, freeShip, rating, stock } = req.body;
        if (!name || !price || !priceNumber) {
            return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
        }
        const result = await query(
            `INSERT INTO products (name, price, price_number, category, brand, color, capacity, image, discount, free_ship, rating, stock)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, price, priceNumber, category, brand, color, capacity, image, discount || 0, freeShip ? 1 : 0, rating || 5, stock || 0]
        );
        res.status(201).json({ message: 'Thêm sản phẩm thành công', id: result.insertId });
    } catch (err) {
        console.error('Add product error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PUT /api/products/:id  — admin only
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { name, price, priceNumber, category, brand, color, capacity, image, discount, freeShip, rating, stock } = req.body;
        await query(
            `UPDATE products SET name=?, price=?, price_number=?, category=?, brand=?, color=?, capacity=?,
             image=?, discount=?, free_ship=?, rating=?, stock=? WHERE id=?`,
            [name, price, priceNumber, category, brand, color, capacity, image,
             discount || 0, freeShip ? 1 : 0, rating || 5, stock ?? 0, req.params.id]
        );
        res.json({ message: 'Cập nhật sản phẩm thành công' });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// DELETE /api/products/:id  — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        await query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Xóa sản phẩm thành công' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
