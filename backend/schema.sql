-- ============================================================
--  NGSHOP Database Schema  v2.0
--  Chạy: mysql -u root -p ngshop < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS ngshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ngshop;

-- ── Người dùng ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('user','admin') DEFAULT 'user',
    displayname VARCHAR(100),
    phone       VARCHAR(15),
    gender      ENUM('Nam','Nữ','Khác'),
    birthday    DATE,
    avatar_url  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Sản phẩm ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    price        VARCHAR(50)  NOT NULL,
    price_number BIGINT       NOT NULL,
    old_price    BIGINT       DEFAULT 0,
    category     VARCHAR(100),
    brand        VARCHAR(100),
    color        VARCHAR(50),
    capacity     VARCHAR(50),
    image        VARCHAR(500),
    description  TEXT,
    discount     INT          DEFAULT 0,
    free_ship    TINYINT      DEFAULT 0,
    rating       DECIMAL(3,1) DEFAULT 5.0,
    review_count INT          DEFAULT 0,
    stock        INT          DEFAULT 0,
    sold         INT          DEFAULT 0,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── Đơn hàng ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id             VARCHAR(30)  PRIMARY KEY,
    user_id        INT,
    name           VARCHAR(100) NOT NULL,
    phone          VARCHAR(15)  NOT NULL,
    address        TEXT         NOT NULL,
    note           TEXT,
    subtotal       BIGINT       DEFAULT 0,
    discount       BIGINT       DEFAULT 0,
    ship           BIGINT       DEFAULT 0,
    total          BIGINT       NOT NULL,
    voucher        VARCHAR(30),
    payment_method ENUM('cod','transfer') DEFAULT 'cod',
    status         ENUM('pending','confirmed','shipping','delivered','cancelled') DEFAULT 'pending',
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Chi tiết đơn hàng ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   VARCHAR(30)  NOT NULL,
    product_id INT,
    name       VARCHAR(255) NOT NULL,
    price      BIGINT       NOT NULL,
    image      VARCHAR(500),
    quantity   INT          NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ── Yêu thích ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
    user_id    INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── Đánh giá sản phẩm ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT  NOT NULL,
    user_id    INT  NOT NULL,
    order_id   VARCHAR(30),
    rating     TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_review (product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

-- ── Voucher ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouchers (
    code        VARCHAR(30) PRIMARY KEY,
    type        ENUM('percent','fixed','freeship') NOT NULL,
    value       INT     NOT NULL,
    min_order   INT     DEFAULT 0,
    description VARCHAR(200),
    active      TINYINT DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Voucher sử dụng (tránh dùng 1 voucher nhiều lần) ─────────
CREATE TABLE IF NOT EXISTS voucher_usage (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    voucher_code VARCHAR(30) NOT NULL,
    user_id    INT NOT NULL,
    order_id   VARCHAR(30),
    used_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (voucher_code) REFERENCES vouchers(code) ON DELETE CASCADE
);

-- ── Dữ liệu mặc định: Voucher ────────────────────────────────
INSERT IGNORE INTO vouchers (code, type, value, min_order, description) VALUES
('GIAM10',    'percent',  10, 500000,   'Giảm 10% cho đơn từ 500,000₫'),
('GIAM20',    'percent',  20, 2000000,  'Giảm 20% cho đơn từ 2,000,000₫'),
('GIAM50K',   'fixed',    50000, 300000,'Giảm 50,000₫ cho đơn từ 300,000₫'),
('FREESHIP',  'freeship', 0,  200000,   'Miễn phí vận chuyển cho đơn từ 200,000₫'),
('NEWUSER',   'percent',  15, 0,        'Ưu đãi 15% cho khách hàng mới');

-- ── Tài khoản admin mặc định ─────────────────────────────────
-- Mật khẩu mặc định: admin123 — ĐỔI NGAY sau khi cài đặt!
INSERT IGNORE INTO users (username, email, password, role) VALUES
('admin', 'admin@ngshop.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
