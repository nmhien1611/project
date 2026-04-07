const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 5500;
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
    // Bỏ query string
    let urlPath = req.url.split('?')[0];

    // Mặc định về index.html
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

    // Thêm .html nếu không có extension (vd: /login → /login.html)
    if (!path.extname(urlPath)) urlPath += '.html';

    const filePath = path.join(ROOT, urlPath);
    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Thử serve 404.html nếu có
            fs.readFile(path.join(ROOT, '404.html'), (e2, d2) => {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(e2 ? '<h2>404 - Không tìm thấy trang</h2>' : d2);
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log(`\n🌐  MNghi Frontend  →  http://localhost:${PORT}`);
    console.log(`📁  Serve từ: ${ROOT}\n`);
});
