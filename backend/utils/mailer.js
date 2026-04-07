const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ── Gửi OTP xác nhận đăng ký ─────────────────────────────────
async function sendOTPEmail(email, otp) {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"NGSHOP" <${process.env.EMAIL_USER}>`,
        to:   email,
        subject: '🛍️ NGSHOP — Mã xác nhận đăng ký tài khoản',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#ee4d2d,#fb6231);padding:28px 32px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:1px">🛍️ NGSHOP</h1>
                <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px">Xác nhận đăng ký tài khoản</p>
            </div>
            <div style="padding:32px">
                <p style="color:#333;font-size:15px;margin:0 0 20px">Xin chào,</p>
                <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
                    Bạn vừa yêu cầu tạo tài khoản NGSHOP. Dùng mã OTP bên dưới để hoàn tất đăng ký.
                    Mã có hiệu lực <strong>10 phút</strong>.
                </p>
                <div style="text-align:center;margin:28px 0">
                    <div style="display:inline-block;background:#fff5f3;border:2px dashed #ee4d2d;border-radius:12px;padding:18px 40px">
                        <div style="font-size:38px;font-weight:bold;letter-spacing:10px;color:#ee4d2d">${otp}</div>
                    </div>
                </div>
                <p style="color:#888;font-size:13px;text-align:center;margin:0">
                    ⚠️ Không chia sẻ mã này với bất kỳ ai.<br>
                    Nếu bạn không yêu cầu, hãy bỏ qua email này.
                </p>
            </div>
            <div style="background:#f8f8f8;padding:16px;text-align:center;border-top:1px solid #eee">
                <p style="color:#aaa;font-size:12px;margin:0">© 2026 NGSHOP — Mua sắm thông minh</p>
            </div>
        </div>`
    });
}

// ── Gửi mail chào mừng sau khi tạo tài khoản ─────────────────
async function sendWelcomeEmail(email, username, role) {
    const isAdmin = role === 'admin';
    await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"NGSHOP" <${process.env.EMAIL_USER}>`,
        to:   email,
        subject: `🎉 Chào mừng ${username} đến với NGSHOP!`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#ee4d2d,#fb6231);padding:28px 32px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:26px">🛍️ NGSHOP</h1>
                <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px">Đăng ký thành công!</p>
            </div>
            <div style="padding:32px">
                <h2 style="color:#333;margin:0 0 16px">Chào mừng, ${username}! 🎉</h2>
                <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px">
                    Tài khoản của bạn đã được tạo thành công trên NGSHOP.
                    ${isAdmin ? '<br><strong style="color:#ee4d2d">✅ Bạn có quyền Admin.</strong>' : ''}
                </p>
                <div style="background:#fff5f3;border-radius:8px;padding:16px;margin:20px 0">
                    <p style="margin:0;color:#555;font-size:13px;line-height:1.8">
                        📧 Email: <strong>${email}</strong><br>
                        👤 Tên đăng nhập: <strong>${username}</strong><br>
                        🔑 Vai trò: <strong>${isAdmin ? 'Quản trị viên' : 'Thành viên'}</strong>
                    </p>
                </div>
                <div style="text-align:center;margin-top:24px">
                    <a href="http://localhost:5500/index.html"
                       style="display:inline-block;background:#ee4d2d;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                        Mua sắm ngay →
                    </a>
                </div>
            </div>
            <div style="background:#f8f8f8;padding:16px;text-align:center;border-top:1px solid #eee">
                <p style="color:#aaa;font-size:12px;margin:0">© 2026 NGSHOP — Mua sắm thông minh</p>
            </div>
        </div>`
    });
}

// ── Gửi thông báo cập nhật trạng thái đơn hàng ───────────────
const STATUS_VI = {
    confirmed: { label: 'Đã xác nhận',   icon: '✅', color: '#28a745', desc: 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị.' },
    shipping:  { label: 'Đang giao hàng', icon: '🚚', color: '#007bff', desc: 'Đơn hàng của bạn đang trên đường giao đến bạn.' },
    delivered: { label: 'Đã giao thành công', icon: '📦', color: '#17a2b8', desc: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã mua sắm tại MNghi!' },
    cancelled: { label: 'Đã huỷ',        icon: '❌', color: '#dc3545', desc: 'Đơn hàng của bạn đã bị huỷ. Liên hệ hỗ trợ nếu cần thêm thông tin.' },
};

async function sendOrderStatusEmail(email, username, orderId, status, total, items = []) {
    const st = STATUS_VI[status];
    if (!st) return; // không gửi cho 'pending'

    const itemRows = items.map(i =>
        `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333">${i.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center">${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;color:#ee4d2d;font-weight:600">${Number(i.price).toLocaleString('vi-VN')}₫</td>
        </tr>`
    ).join('');

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"MNghi" <${process.env.EMAIL_USER}>`,
        to:   email,
        subject: `${st.icon} MNghi — Đơn hàng ${orderId} ${st.label}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#ee4d2d,#fb6231);padding:28px 32px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:24px">🛍️ MNghi</h1>
                <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px">Thông báo đơn hàng</p>
            </div>
            <div style="padding:28px 32px">
                <p style="color:#333;font-size:15px;margin:0 0 8px">Xin chào <strong>${username}</strong>,</p>
                <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px">${st.desc}</p>

                <div style="background:#f8f9fa;border-left:4px solid ${st.color};border-radius:4px;padding:14px 18px;margin-bottom:20px">
                    <p style="margin:0;font-size:14px;color:#333">
                        📋 Mã đơn hàng: <strong>${orderId}</strong><br>
                        🔖 Trạng thái: <strong style="color:${st.color}">${st.icon} ${st.label}</strong>
                    </p>
                </div>

                ${itemRows ? `
                <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                    <thead>
                        <tr style="background:#f5f5f5">
                            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600">SẢN PHẨM</th>
                            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#888;font-weight:600">SL</th>
                            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600">GIÁ</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>
                <p style="text-align:right;font-size:15px;font-weight:700;color:#ee4d2d;margin:0 0 20px">
                    Tổng cộng: ${Number(total).toLocaleString('vi-VN')}₫
                </p>` : ''}

                <div style="text-align:center;margin-top:20px">
                    <a href="http://localhost:5500/orders.html"
                       style="display:inline-block;background:#ee4d2d;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">
                        Xem đơn hàng →
                    </a>
                </div>
            </div>
            <div style="background:#f8f8f8;padding:14px;text-align:center;border-top:1px solid #eee">
                <p style="color:#aaa;font-size:12px;margin:0">© 2026 MNghi — Mua sắm thông minh | Hotline: 1800-MNghi</p>
            </div>
        </div>`
    });
}

module.exports = { sendOTPEmail, sendWelcomeEmail, sendOrderStatusEmail };
