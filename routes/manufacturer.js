// routes/manufacturer.js

const express = require('express');
const router = express.Router();
const { verifyManufacturer } = require('../middleware/auth');
const Product = require('../models/Product');
const Manufacturer = require('../models/Manufacturer');
const BlacklistedToken = require('../models/BlacklistedToken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/products');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Geçersiz dosya tipi'));
        }
    }
});

// Dashboard
router.get('/dashboard', verifyManufacturer, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments({ manufacturer: req.manufacturer._id });
        const outOfStock = await Product.countDocuments({ 
            manufacturer: req.manufacturer._id,
            stock: 0
        });
        
        const recentProducts = await Product.find({ manufacturer: req.manufacturer._id })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            totalProducts,
            outOfStock,
            recentProducts,
            manufacturer: {
                companyName: req.manufacturer.companyName,
                email: req.manufacturer.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ürünleri listele
router.get('/products', verifyManufacturer, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        const query = { manufacturer: req.manufacturer._id };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Product.countDocuments(query);

        res.json({
            products,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni ürün ekle
router.post('/products', verifyManufacturer, upload.array('images', 5), async (req, res) => {
    try {
        const { name, description, price, category, stock } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'En az bir ürün fotoğrafı gereklidir' });
        }

        const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

        const product = new Product({
            name,
            description,
            price: Number(price),
            category,
            stock: Number(stock),
            images: imageUrls,
            manufacturer: req.manufacturer._id
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, err => {
                    if (err) console.error('Dosya silinirken hata:', err);
                });
            });
        }
        res.status(400).json({ message: error.message });
    }
});

// Profil güncelle
router.put('/profile', verifyManufacturer, upload.array('documents', 5), async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['companyName', 'address', 'phone', 'businessArea', 'contactName'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Geçersiz güncelleme' });
        }

        updates.forEach(update => req.manufacturer[update] = req.body[update]);

        if (req.files && req.files.length > 0) {
            const documentUrls = req.files.map(file => `/uploads/documents/${file.filename}`);
            req.manufacturer.documents = [...(req.manufacturer.documents || []), ...documentUrls];
        }

        await req.manufacturer.save();
        res.json(req.manufacturer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Çıkış yap
router.post('/logout', verifyManufacturer, async (req, res) => {
    try {
        const blacklistedToken = new BlacklistedToken({
            token: req.token
        });
        await blacklistedToken.save();
        res.json({ message: 'Başarıyla çıkış yapıldı' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
