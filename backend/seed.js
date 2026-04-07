/**
 * Seed sản phẩm từ defaultProducts vào MySQL
 * Chạy: node seed.js
 */
require('dotenv').config();
const { query } = require('./config/db');

const defaultProducts = [
    { id: 1,  name: 'iPhone 14',          price: '20,000,000 VND', priceNumber: 20000000, category: 'Điện thoại',  brand: 'Apple',     color: 'Đen',   capacity: '128GB',     image: 'images/iphone.jpg',           discount: 20, freeShip: true,  rating: 4.8, stock: 15 },
    { id: 2,  name: 'Laptop Dell',         price: '15,000,000 VND', priceNumber: 15000000, category: 'Laptop',      brand: 'Dell',      color: 'Xám',   capacity: '256GB',     image: 'images/dell-laptop.jpg',      discount: 15, freeShip: true,  rating: 4.5, stock: 8  },
    { id: 3,  name: 'Áo thun',             price: '200,000 VND',    priceNumber: 200000,   category: 'Thời trang',  brand: 'Nike',      color: 'Trắng', capacity: 'M',         image: 'images/ao-thun.jpg',          discount: 30, freeShip: false, rating: 4.2, stock: 50 },
    { id: 4,  name: 'Nồi cơm điện',        price: '1,000,000 VND',  priceNumber: 1000000,  category: 'Đồ gia dụng', brand: 'Sunhouse',  color: 'Trắng', capacity: '1.8L',      image: 'images/noi-com.jpg',          discount: 25, freeShip: true,  rating: 4.6, stock: 20 },
    { id: 5,  name: 'Tai nghe Bluetooth',  price: '700,000 VND',    priceNumber: 700000,   category: 'Điện thoại',  brand: 'Sony',      color: 'Đen',   capacity: '32GB',      image: 'images/tai-nghe.jpg',         discount: 10, freeShip: false, rating: 4.5, stock: 30 },
    { id: 6,  name: 'Balo đôi',            price: '550,000 VND',    priceNumber: 550000,   category: 'Thời trang',  brand: 'Adidas',    color: 'Xanh',  capacity: '20L',       image: 'images/balo.jpg',             discount: 40, freeShip: true,  rating: 4.7, stock: 25 },
    { id: 7,  name: 'Áo khoác',            price: '350,000 VND',    priceNumber: 350000,   category: 'Thời trang',  brand: 'Zara',      color: 'Đen',   capacity: 'L',         image: 'images/ao-khoac.jpg',         discount: 50, freeShip: true,  rating: 4.9, stock: 3  },
    { id: 8,  name: 'Sạc dự phòng',        price: '450,000 VND',    priceNumber: 450000,   category: 'Điện thoại',  brand: 'Xiaomi',    color: 'Trắng', capacity: '10000mAh',  image: 'images/sac-du-phong.jpg',     discount: 15, freeShip: false, rating: 4.3, stock: 40 },
    { id: 9,  name: 'Bàn ủi',              price: '1,100,000 VND',  priceNumber: 1100000,  category: 'Đồ gia dụng', brand: 'Philips',   color: 'Xám',   capacity: '2L',        image: 'images/ban-ui.jpg',           discount: 20, freeShip: true,  rating: 4.2, stock: 12 },
    { id: 10, name: 'Đồng hồ thông minh',  price: '2,200,000 VND',  priceNumber: 2200000,  category: 'Điện thoại',  brand: 'Samsung',   color: 'Đen',   capacity: '16GB',      image: 'images/dong-ho-thong-minh.jpg', discount: 18, freeShip: true, rating: 4.6, stock: 18 },
    { id: 11, name: 'Smart TV 55"',        price: '8,500,000 VND',  priceNumber: 8500000,  category: 'Đồ gia dụng', brand: 'LG',        color: 'Đen',   capacity: '55inch',    image: 'images/smart-tv.jpg',         discount: 22, freeShip: true,  rating: 4.7, stock: 5  },
    { id: 12, name: 'Máy giặt',            price: '7,200,000 VND',  priceNumber: 7200000,  category: 'Đồ gia dụng', brand: 'Electrolux', color: 'Trắng', capacity: '8kg',      image: 'images/may-giat.jpg',         discount: 28, freeShip: false, rating: 4.5, stock: 7  },
    { id: 13, name: 'Giày sneaker',         price: '1,000,000 VND',  priceNumber: 1000000,  category: 'Thời trang',  brand: 'Puma',      color: 'Trắng', capacity: '42',        image: 'images/giay-sneaker.jpg',     discount: 35, freeShip: true,  rating: 4.8, stock: 22 },
    { id: 14, name: 'Tủ lạnh',             price: '10,000,000 VND', priceNumber: 10000000, category: 'Đồ gia dụng', brand: 'Panasonic', color: 'Bạc',   capacity: '300L',      image: 'images/tu-lanh.jpg',          discount: 25, freeShip: true,  rating: 4.6, stock: 4  },
    { id: 15, name: 'Máy xay sinh tố',     price: '1,350,000 VND',  priceNumber: 1350000,  category: 'Đồ gia dụng', brand: 'Philips',   color: 'Xanh',  capacity: '1.5L',      image: 'images/may-xay-sinh-to.jpg',  discount: 18, freeShip: false, rating: 4.4, stock: 16 },
    { id: 16, name: 'Bàn phím cơ',         price: '1,800,000 VND',  priceNumber: 1800000,  category: 'Laptop',      brand: 'Razer',     color: 'Đen',   capacity: 'Full-size', image: 'images/ban-phim-co.jpg',      discount: 20, freeShip: true,  rating: 4.3, stock: 11 },
    { id: 17, name: 'Mắt kính thời trang', price: '420,000 VND',    priceNumber: 420000,   category: 'Thời trang',  brand: 'Ray-Ban',   color: 'Đen',   capacity: 'One-size',  image: 'images/mat-kinh.jpg',         discount: 30, freeShip: true,  rating: 4.5, stock: 35 },
    { id: 18, name: 'Chuột không dây',     price: '330,000 VND',    priceNumber: 330000,   category: 'Laptop',      brand: 'Logitech',  color: 'Đen',   capacity: '1200dpi',   image: 'images/chuot-khong-day.jpg',  discount: 25, freeShip: false, rating: 4.2, stock: 28 },
    { id: 19, name: 'Samsung Galaxy S23',  price: '18,000,000 VND', priceNumber: 18000000, category: 'Điện thoại',  brand: 'Samsung',   color: 'Trắng', capacity: '256GB',     image: 'images/samsung-s23.jpg',      discount: 15, freeShip: true,  rating: 4.7, stock: 10 },
    { id: 20, name: 'Máy lạnh',            price: '6,500,000 VND',  priceNumber: 6500000,  category: 'Đồ gia dụng', brand: 'Daikin',    color: 'Trắng', capacity: '1HP',       image: 'images/may-lanh.jpg',         discount: 20, freeShip: false, rating: 4.6, stock: 6  },
    { id: 21, name: 'HP Envy',             price: '22,000,000 VND', priceNumber: 22000000, category: 'Laptop',      brand: 'HP',        color: 'Đen',   capacity: '512GB',     image: 'images/hp-envy.jpg',          discount: 12, freeShip: true,  rating: 4.4, stock: 9  },
    { id: 22, name: 'Quần jean',           price: '450,000 VND',    priceNumber: 450000,   category: 'Thời trang',  brand: "Levi's",    color: 'Xanh',  capacity: '32',        image: 'images/quan-jean.jpg',        discount: 20, freeShip: true,  rating: 4.3, stock: 45 },
    { id: 23, name: 'Acer Nitro',          price: '13,500,000 VND', priceNumber: 13500000, category: 'Laptop',      brand: 'Acer',      color: 'Đen',   capacity: '512GB',     image: 'images/acer-nitro.webp',      discount: 18, freeShip: false, rating: 4.5, stock: 7  },
    { id: 24, name: 'Máy hút bụi',         price: '2,200,000 VND',  priceNumber: 2200000,  category: 'Đồ gia dụng', brand: 'Electrolux', color: 'Đỏ',  capacity: '2L',        image: 'images/may-hut-bui.jpg',      discount: 22, freeShip: true,  rating: 4.4, stock: 14 },
    { id: 25, name: 'Váy maxi',            price: '550,000 VND',    priceNumber: 550000,   category: 'Thời trang',  brand: 'H&M',       color: 'Hồng',  capacity: 'M',         image: 'images/vay-maxi.jpg',         discount: 35, freeShip: true,  rating: 4.7, stock: 0  },
    { id: 26, name: 'MacBook Air',         price: '24,000,000 VND', priceNumber: 24000000, category: 'Laptop',      brand: 'Apple',     color: 'Bạc',   capacity: '256GB',     image: 'images/macbook-air.jpg',      discount: 17, freeShip: true,  rating: 4.9, stock: 5  },
    { id: 27, name: 'OPPO Reno',           price: '9,000,000 VND',  priceNumber: 9000000,  category: 'Điện thoại',  brand: 'OPPO',      color: 'Xanh',  capacity: '128GB',     image: 'images/oppo-reno.jpg',        discount: 18, freeShip: true,  rating: 4.6, stock: 13 },
];

async function seed() {
    console.log('🌱 Bắt đầu seed dữ liệu sản phẩm...');
    let inserted = 0, skipped = 0;

    for (const p of defaultProducts) {
        try {
            await query(
                `INSERT IGNORE INTO products
                 (id, name, price, price_number, category, brand, color, capacity, image, discount, free_ship, rating, stock)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [p.id, p.name, p.price, p.priceNumber, p.category, p.brand,
                 p.color, p.capacity, p.image, p.discount, p.freeShip ? 1 : 0, p.rating, p.stock]
            );
            inserted++;
            console.log(`  ✅ ${p.name}`);
        } catch (err) {
            skipped++;
            console.log(`  ⚠️  Bỏ qua: ${p.name} (${err.message})`);
        }
    }

    console.log(`\n✅ Seed xong: ${inserted} sản phẩm thêm mới, ${skipped} bỏ qua`);
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed thất bại:', err);
    process.exit(1);
});
