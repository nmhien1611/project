// Chat AI — MNghi (keyword bot, miễn phí)

const CHAT_REPLIES = [
    // Chào hỏi
    { keys: ['xin chào','hello','hi','chào','hey','alo'],
      reply: 'Xin chào! Tôi là trợ lý MNghi AI 🤖\nBạn cần hỗ trợ gì ạ?' },

    // Sản phẩm
    { keys: ['điện thoại','iphone','samsung','android','smartphone'],
      reply: 'MNghi có đầy đủ điện thoại: iPhone, Samsung, Xiaomi, OPPO... Bạn có thể tìm theo tên hoặc xem theo danh mục trên trang chủ nhé!' },
    { keys: ['laptop','máy tính','macbook','dell','asus','lenovo'],
      reply: 'Chúng tôi bán laptop các hãng: MacBook, Dell, ASUS, Lenovo, HP... Vào mục Laptop trên menu để xem đầy đủ sản phẩm và giá.' },
    { keys: ['phụ kiện','tai nghe','sạc','ốp lưng','cáp','airpod'],
      reply: 'MNghi có đủ phụ kiện công nghệ: tai nghe, sạc dự phòng, ốp lưng, cáp, bao da... Xem tại mục Phụ kiện trên website!' },
    { keys: ['giá','bao nhiêu','rẻ','đắt','chi phí'],
      reply: 'Giá sản phẩm hiển thị trực tiếp trên trang. MNghi cam kết giá tốt nhất thị trường! Dùng mã GIAM10 để giảm thêm 10% nhé 😊' },
    { keys: ['hàng mới','mới nhất','mới ra','launch'],
      reply: 'Sản phẩm mới nhất luôn được cập nhật tại mục "Hàng Mới" trên trang chủ. Bạn có thể theo dõi để không bỏ lỡ!' },
    { keys: ['còn hàng','hết hàng','tồn kho','stock'],
      reply: 'Trạng thái tồn kho hiển thị trên trang sản phẩm. Nếu hết hàng, bạn liên hệ hotline 1800-MNghi để đặt trước nhé!' },

    // Đặt hàng
    { keys: ['đặt hàng','mua','order','cách mua','mua như thế nào'],
      reply: 'Cách mua hàng:\n1️⃣ Chọn sản phẩm → Thêm vào giỏ\n2️⃣ Vào Giỏ hàng → Thanh toán\n3️⃣ Điền địa chỉ giao hàng\n4️⃣ Chọn thanh toán → Xác nhận đơn' },
    { keys: ['huỷ đơn','hủy đơn','cancel','huỷ hàng'],
      reply: 'Để huỷ đơn, vào mục Đơn hàng của tôi và chọn Huỷ (chỉ được huỷ khi đơn đang ở trạng thái Chờ xác nhận). Liên hệ hotline 1800-MNghi nếu cần hỗ trợ.' },

    // Vận chuyển
    { keys: ['vận chuyển','giao hàng','ship','phí ship','giao bao lâu','thời gian giao'],
      reply: 'Phí vận chuyển: 30.000₫\nThời gian giao: 2–5 ngày làm việc\nDùng mã FREESHIP để miễn phí ship! 🚚' },
    { keys: ['theo dõi đơn','track','kiểm tra đơn','đơn hàng ở đâu'],
      reply: 'Vào mục Đơn hàng của tôi (khi đăng nhập) để theo dõi trạng thái đơn hàng theo thời gian thực nhé!' },

    // Thanh toán
    { keys: ['thanh toán','payment','qr','chuyển khoản','cod','tiền mặt'],
      reply: 'MNghi hỗ trợ 2 hình thức:\n💵 COD — trả tiền mặt khi nhận hàng\n📱 QR Bank — quét mã chuyển khoản khi xác nhận đơn' },

    // Đổi trả
    { keys: ['hoàn tiền','đổi trả','trả hàng','bảo hành','hỏng','lỗi'],
      reply: 'Chính sách đổi trả:\n✅ Trong 7 ngày kể từ khi nhận hàng\n✅ Sản phẩm còn nguyên hộp, đủ phụ kiện\n✅ Liên hệ hotline 1800-MNghi để được hỗ trợ' },

    // Voucher
    { keys: ['voucher','mã giảm','khuyến mãi','coupon','discount','giảm giá'],
      reply: 'Các mã voucher hiện có:\n🎁 FREESHIP — miễn phí vận chuyển\n🎁 NEWUSER — giảm 15% cho khách mới\n🎁 GIAM10 — giảm 10%\n🎁 GIAM20 — giảm 20%\n🎁 GIAM50K — giảm 50.000₫\nNhập mã ở trang Giỏ hàng!' },

    // Tài khoản
    { keys: ['tài khoản','đăng nhập','đăng ký','mật khẩu','quên mật khẩu','password'],
      reply: 'Đăng ký tài khoản để theo dõi đơn hàng, lưu địa chỉ và nhận ưu đãi riêng! Quên mật khẩu → chọn "Quên mật khẩu" ở trang đăng nhập.' },

    // Liên hệ
    { keys: ['liên hệ','hotline','support','hỗ trợ','cskh','tư vấn'],
      reply: '📞 Hotline: 1800-MNghi (miễn phí)\n📧 Email: support@mnghi.vn\n🕐 Giờ hỗ trợ: 8h – 22h mỗi ngày' },

    // Cảm ơn
    { keys: ['cảm ơn','thanks','thank you','ok','oke','được rồi'],
      reply: 'Rất vui được hỗ trợ bạn! Chúc bạn mua sắm vui vẻ tại MNghi 😊' },
];

function keywordReply(msg) {
    const low = msg.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu để match tốt hơn
        .replace(/đ/g, 'd');
    const msgOrig = msg.toLowerCase();

    // Tìm theo text gốc trước
    let match = CHAT_REPLIES.find(r => r.keys.some(k => msgOrig.includes(k)));
    // Nếu không tìm thấy, thử tìm không dấu
    if (!match) {
        match = CHAT_REPLIES.find(r => r.keys.some(k => {
            const kNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
            return low.includes(kNorm);
        }));
    }
    return match ? match.reply : 'Xin lỗi, tôi chưa hiểu câu hỏi đó 😅\nVui lòng liên hệ hotline 1800-MNghi hoặc email support@mnghi.vn để được hỗ trợ trực tiếp!';
}

function initChat() {
    if (!document.getElementById('chat-widget')) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="chat-widget">
            <button id="chat-toggle" title="Chat với AI MNghi">
                <span id="chat-toggle-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                </span>
                <span id="chat-unread" style="display:none">1</span>
            </button>

            <div id="chat-box" style="display:none">
                <div id="chat-header">
                    <div class="ch-info">
                        <div class="ch-avatar">🤖</div>
                        <div>
                            <div class="ch-name">Trợ lý MNghi AI</div>
                            <div class="ch-status"><span class="ch-dot"></span>Trực tuyến</div>
                        </div>
                    </div>
                    <button id="chat-close" title="Đóng">✕</button>
                </div>
                <div id="chat-messages"></div>
                <div id="chat-input-area">
                    <input id="chat-input" type="text" placeholder="Nhập câu hỏi..." autocomplete="off" maxlength="500">
                    <button id="chat-send">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <style>
            #chat-widget { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

            #chat-toggle {
                width: 56px; height: 56px; border-radius: 50%;
                background: linear-gradient(135deg, #ee4d2d, #ff7043);
                border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(238,77,45,.45);
                display: flex; align-items: center; justify-content: center;
                transition: transform .2s, box-shadow .2s; position: relative;
            }
            #chat-toggle:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(238,77,45,.55); }
            #chat-unread {
                position: absolute; top: -4px; right: -4px;
                background: #f00; color: #fff; font-size: 11px; font-weight: 700;
                width: 18px; height: 18px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                border: 2px solid #fff;
            }

            #chat-box {
                position: absolute; bottom: 68px; right: 0;
                width: 340px; background: #fff; border-radius: 16px;
                box-shadow: 0 8px 40px rgba(0,0,0,.18);
                display: flex; flex-direction: column; overflow: hidden;
                animation: chatSlideIn .2s ease;
            }
            @keyframes chatSlideIn {
                from { opacity: 0; transform: translateY(16px) scale(.97); }
                to   { opacity: 1; transform: translateY(0)  scale(1); }
            }

            #chat-header {
                background: linear-gradient(135deg, #ee4d2d, #ff7043);
                padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
            }
            .ch-info   { display: flex; align-items: center; gap: 10px; }
            .ch-avatar { font-size: 26px; line-height: 1; }
            .ch-name   { color: #fff; font-weight: 700; font-size: 14px; }
            .ch-status { color: rgba(255,255,255,.8); font-size: 11px; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
            .ch-dot    { width: 7px; height: 7px; border-radius: 50%; background: #4cff91; display: inline-block; }
            #chat-close { background: none; border: none; color: rgba(255,255,255,.8); font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: background .15s; }
            #chat-close:hover { background: rgba(255,255,255,.15); color: #fff; }

            #chat-messages {
                flex: 1; overflow-y: auto; padding: 14px 12px;
                display: flex; flex-direction: column; gap: 10px;
                min-height: 260px; max-height: 360px; background: #f9f9f9;
            }
            .chat-msg {
                max-width: 82%; padding: 9px 13px; border-radius: 14px;
                font-size: 13px; line-height: 1.6; word-break: break-word;
                white-space: pre-line;
                animation: msgIn .15s ease;
            }
            @keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
            .chat-bot  { background: #fff; color: #333; border-radius: 4px 14px 14px 14px; align-self: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
            .chat-user { background: linear-gradient(135deg, #ee4d2d, #ff7043); color: #fff; border-radius: 14px 4px 14px 14px; align-self: flex-end; }
            .chat-typing { display: flex; align-items: center; gap: 4px; padding: 10px 14px; background: #fff; border-radius: 4px 14px 14px 14px; align-self: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
            .typing-dot { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: typingBounce 1.2s infinite; }
            .typing-dot:nth-child(2) { animation-delay: .2s; }
            .typing-dot:nth-child(3) { animation-delay: .4s; }
            @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

            .chat-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0 2px; }
            .chat-sug { font-size: 11px; padding: 4px 10px; background: #fff; border: 1px solid #f0d9d5; border-radius: 12px; color: #ee4d2d; cursor: pointer; transition: background .15s; }
            .chat-sug:hover { background: #fff3f0; }

            #chat-input-area {
                display: flex; align-items: center; gap: 8px;
                padding: 10px 12px; border-top: 1px solid #f0f0f0; background: #fff;
            }
            #chat-input {
                flex: 1; border: 1px solid #e8e8e8; border-radius: 20px;
                padding: 8px 14px; font-size: 13px; outline: none;
                transition: border-color .2s;
            }
            #chat-input:focus { border-color: #ee4d2d; }
            #chat-send {
                width: 36px; height: 36px; border-radius: 50%;
                background: linear-gradient(135deg, #ee4d2d, #ff7043);
                border: none; cursor: pointer; flex-shrink: 0;
                display: flex; align-items: center; justify-content: center;
                transition: transform .15s, opacity .15s;
            }
            #chat-send:hover { transform: scale(1.08); }
            #chat-send:disabled { opacity: .5; cursor: default; transform: none; }

            @media (max-width: 400px) {
                #chat-box { width: calc(100vw - 32px); right: -8px; }
            }
        </style>`);
    }

    const toggle   = document.getElementById('chat-toggle');
    const box      = document.getElementById('chat-box');
    const closeBtn = document.getElementById('chat-close');
    const input    = document.getElementById('chat-input');
    const sendBtn  = document.getElementById('chat-send');
    const msgs     = document.getElementById('chat-messages');
    const unread   = document.getElementById('chat-unread');
    if (!toggle || !box) return;

    let isOpen    = false;
    let isLoading = false;

    function addMsg(text, from = 'bot') {
        const d = document.createElement('div');
        d.className = `chat-msg chat-${from}`;
        d.textContent = text;
        msgs.appendChild(d);
        msgs.scrollTop = msgs.scrollHeight;
        return d;
    }

    function addTyping() {
        const d = document.createElement('div');
        d.className = 'chat-typing';
        d.id = 'chat-typing-indicator';
        d.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        msgs.appendChild(d);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function removeTyping() {
        document.getElementById('chat-typing-indicator')?.remove();
    }

    function addSuggestions() {
        const suggestions = ['Cách đặt hàng?', 'Phí ship bao nhiêu?', 'Đổi trả hàng?', 'Mã giảm giá'];
        const wrap = document.createElement('div');
        wrap.className = 'chat-suggestions';
        wrap.innerHTML = suggestions.map(s => `<span class="chat-sug">${s}</span>`).join('');
        msgs.appendChild(wrap);
        msgs.scrollTop = msgs.scrollHeight;
        wrap.querySelectorAll('.chat-sug').forEach(btn => {
            btn.addEventListener('click', () => { wrap.remove(); sendMessage(btn.textContent); });
        });
    }

    function openChat() {
        isOpen = true;
        box.style.display = 'flex';
        unread.style.display = 'none';
        input.focus();
        if (!msgs.children.length) {
            addMsg('Xin chào! Tôi là trợ lý AI của MNghi 🤖\nBạn cần hỗ trợ gì?');
            addSuggestions();
        }
    }
    function closeChat() {
        isOpen = false;
        box.style.display = 'none';
    }

    toggle.addEventListener('click', () => isOpen ? closeChat() : openChat());
    closeBtn.addEventListener('click', closeChat);

    function sendMessage(text) {
        if (isLoading) return;
        const msg = (text || input.value).trim();
        if (!msg) return;
        input.value = '';

        addMsg(msg, 'user');
        isLoading = true;
        sendBtn.disabled = true;

        // Giả lập độ trễ trả lời tự nhiên (600–1200ms)
        addTyping();
        const delay = 600 + Math.random() * 600;
        setTimeout(() => {
            removeTyping();
            addMsg(keywordReply(msg));
            isLoading = false;
            sendBtn.disabled = false;
            input.focus();
        }, delay);
    }

    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); });

    setTimeout(() => {
        if (!isOpen) unread.style.display = 'flex';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initChat);
