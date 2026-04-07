const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query }      = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/mailer');

const router = express.Router();

// ── OTP store (in-memory) ─────────────────────────────────────
// Map<email, { otp, expiresAt }>
const otpStore = new Map();

function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// ── POST /api/auth/send-otp ───────────────────────────────────
// Gửi mã xác nhận đến email (trước khi đăng ký)
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Email không hợp lệ' });
        }

        // Kiểm tra email đã có tài khoản chưa
        const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email này đã được dùng để tạo tài khoản' });
        }

        // Giới hạn gửi lại: chờ 60s
        const prev = otpStore.get(email);
        if (prev && Date.now() < prev.expiresAt - 9 * 60 * 1000) {
            const waitSec = Math.ceil((prev.expiresAt - 9 * 60 * 1000 - Date.now()) / 1000);
            return res.status(429).json({ error: `Vui lòng chờ ${waitSec}s trước khi gửi lại` });
        }

        const otp = generateOTP();
        otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

        // Tự xoá sau 10 phút
        setTimeout(() => otpStore.delete(email), 10 * 60 * 1000);

        await sendOTPEmail(email, otp);
        res.json({ message: 'Mã OTP đã được gửi đến email của bạn' });
    } catch (err) {
        console.error('Send OTP error:', err.message);
        res.status(500).json({ error: 'Không thể gửi email. Kiểm tra cấu hình EMAIL_USER và EMAIL_PASS trong .env' });
    }
});

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, otp, adminSecret } = req.body;

        // Validate đầu vào
        if (!username || !email || !password || !otp) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin và mã OTP' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }
        if (username.length < 3) {
            return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
        }

        // Xác nhận OTP
        const stored = otpStore.get(email);
        if (!stored) {
            return res.status(400).json({ error: 'Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng gửi lại' });
        }
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng gửi lại' });
        }
        if (stored.otp !== otp.trim()) {
            return res.status(400).json({ error: 'Mã OTP không đúng' });
        }

        // Kiểm tra email + username trùng
        const existEmail    = await query('SELECT id FROM users WHERE email = ?', [email]);
        const existUsername = await query('SELECT id FROM users WHERE username = ?', [username]);
        if (existEmail.length > 0)    return res.status(409).json({ error: 'Email này đã được dùng để tạo tài khoản' });
        if (existUsername.length > 0) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

        // Xác định role
        const role = (adminSecret && adminSecret === process.env.ADMIN_SECRET) ? 'admin' : 'user';

        // Tạo tài khoản
        const hashed = await bcrypt.hash(password, 10);
        const result = await query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashed, role]
        );

        // Xoá OTP sau khi dùng
        otpStore.delete(email);

        // Gửi mail chào mừng (không block response)
        sendWelcomeEmail(email, username, role).catch(err =>
            console.warn('Welcome email failed:', err.message)
        );

        const token = jwt.sign(
            { id: result.insertId, username, role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            message: 'Đăng ký thành công',
            token,
            user: { id: result.insertId, username, email, role }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const rows = await query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );
        if (!rows.length) return res.status(401).json({ error: 'Tài khoản không tồn tại' });

        const user  = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Mật khẩu không đúng' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role, displayname: user.displayname, phone: user.phone }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ── POST /api/auth/forgot-password ───────────────────────────
// Gửi OTP đặt lại mật khẩu
const resetOtpStore = new Map();

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Email không hợp lệ' });
        }
        const rows = await query('SELECT id, username FROM users WHERE email = ?', [email]);
        if (!rows.length) {
            return res.status(404).json({ error: 'Email này chưa được đăng ký tài khoản' });
        }

        // Cooldown 60s
        const prev = resetOtpStore.get(email);
        if (prev && Date.now() < prev.expiresAt - 9 * 60 * 1000) {
            const wait = Math.ceil((prev.expiresAt - 9 * 60 * 1000 - Date.now()) / 1000);
            return res.status(429).json({ error: `Vui lòng chờ ${wait}s trước khi gửi lại` });
        }

        const otp = generateOTP();
        resetOtpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, userId: rows[0].id });
        setTimeout(() => resetOtpStore.delete(email), 10 * 60 * 1000);

        await sendOTPEmail(email, otp);
        res.json({ message: 'Mã OTP đã được gửi đến email của bạn' });
    } catch (err) {
        console.error('Forgot-password OTP error:', err.message);
        res.status(500).json({ error: 'Không thể gửi email. Kiểm tra cấu hình EMAIL trong .env' });
    }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        const stored = resetOtpStore.get(email);
        if (!stored) return res.status(400).json({ error: 'OTP chưa được gửi hoặc đã hết hạn' });
        if (Date.now() > stored.expiresAt) {
            resetOtpStore.delete(email);
            return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng gửi lại' });
        }
        if (stored.otp !== otp.trim()) {
            return res.status(400).json({ error: 'Mã OTP không đúng' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password = ? WHERE id = ?', [hashed, stored.userId]);
        resetOtpStore.delete(email);

        res.json({ message: 'Đặt lại mật khẩu thành công' });
    } catch (err) {
        console.error('Reset-password error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ── POST /api/auth/change-password ───────────────────────────
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });

        const rows = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (!rows.length) return res.status(404).json({ error: 'Người dùng không tồn tại' });

        const match = await bcrypt.compare(oldPassword, rows[0].password);
        if (!match) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (err) {
        console.error('Change-password error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
