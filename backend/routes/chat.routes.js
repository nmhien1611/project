const express = require('express');
const router  = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Bạn là trợ lý AI của MNghi — một cửa hàng thương mại điện tử bán điện thoại, laptop, và phụ kiện công nghệ.

Nhiệm vụ của bạn:
- Giải đáp thắc mắc về sản phẩm, đơn hàng, vận chuyển, đổi trả
- Tư vấn sản phẩm phù hợp với nhu cầu khách hàng
- Hỗ trợ kỹ thuật cơ bản
- Luôn thân thiện, ngắn gọn, và hữu ích

Thông tin cửa hàng:
- Hotline: 1800-MNghi (miễn phí), 8h–22h
- Email: support@mnghi.vn
- Phí vận chuyển: 30.000₫, miễn phí với mã FREESHIP
- Thời gian giao hàng: 2–5 ngày làm việc
- Đổi trả trong 7 ngày kể từ khi nhận hàng
- Thanh toán: COD (tiền mặt khi nhận) hoặc chuyển khoản QR
- Voucher có sẵn: FREESHIP, NEWUSER (15%), GIAM10, GIAM20, GIAM50K

Trả lời bằng tiếng Việt, ngắn gọn (tối đa 3–4 câu trừ khi cần giải thích chi tiết).`;

// POST /api/chat  — streaming SSE
router.post('/', async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Thiếu nội dung tin nhắn' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ error: 'AI chưa được cấu hình' });
    }

    // Build messages array from history + new message
    const messages = [
        ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message.trim() }
    ];

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const stream = await client.messages.stream({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages
        });

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        console.error('Chat AI error:', err.message);
        res.write(`data: ${JSON.stringify({ error: 'Không thể kết nối AI. Vui lòng thử lại.' })}\n\n`);
        res.end();
    }
});

module.exports = router;
