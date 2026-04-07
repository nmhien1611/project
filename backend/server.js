require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes     = require('./routes/auth.routes');
const productRoutes  = require('./routes/products.routes');
const orderRoutes    = require('./routes/orders.routes');
const userRoutes     = require('./routes/users.routes');
const voucherRoutes  = require('./routes/vouchers.routes');
const reviewRoutes   = require('./routes/reviews.routes');
const chatRoutes     = require('./routes/chat.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS: chỉ cho phép frontend origin ──────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500').split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, cb) => {
        // Cho phép requests không có origin (Postman, curl) và origins được cấu hình
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// ── API Routes (chỉ xử lý API, không serve file tĩnh) ───────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/chat',     chatRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 404 API fallback ─────────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint không tồn tại' });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Lỗi server không xác định' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  NGSHOP Backend  →  http://localhost:${PORT}/api`);
    console.log(`🔒  CORS cho phép   →  ${allowedOrigins.join(', ')}`);
    console.log(`📦  Endpoints: /api/auth | /products | /orders | /users | /vouchers\n`);
});
