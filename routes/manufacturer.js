// routes/manufacturer.js
const express = require('express');
const router = express.Router();
const { verifyManufacturer } = require('../middleware/auth');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/products'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Geçersiz dosya tipi. Sadece JPEG, PNG ve WEBP formatları kabul edilir.'));
        }
    }
});

// Üreticinin ürünlerini listele
router.get('/products', verifyManufacturer, async (req, res) => {
    try {
        const products = await Product.find({ manufacturer: req.manufacturer._id });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni ürün ekle
router.post('/products', verifyManufacturer, upload.array('images', 5), async (req, res) => {
    try {
        const { name, description, price, category, specifications, stock } = req.body;
        
        const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

        const product = new Product({
            name,
            description,
            price,
            category,
            specifications: JSON.parse(specifications),
            stock,
            images: imageUrls,
            manufacturer: req.manufacturer._id
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ürün güncelle
router.put('/products/:id', verifyManufacturer, upload.array('images', 5), async (req, res) => {
    try {
        const { name, description, price, category, specifications, stock } = req.body;
        
        const product = await Product.findOne({
            _id: req.params.id,
            manufacturer: req.manufacturer._id
        });

        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        // Yeni resimler yüklendiyse ekle
        if (req.files && req.files.length > 0) {
            const newImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
            product.images = [...product.images, ...newImageUrls];
        }

        // Diğer alanları güncelle
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.category = category || product.category;
        product.specifications = specifications ? JSON.parse(specifications) : product.specifications;
        product.stock = stock || product.stock;

        await product.save();
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ürün sil
router.delete('/products/:id', verifyManufacturer, async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            manufacturer: req.manufacturer._id
        });

        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        res.json({ message: 'Ürün başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sipariş istatistikleri
router.get('/statistics', verifyManufacturer, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments({ manufacturer: req.manufacturer._id });
        const outOfStock = await Product.countDocuments({ 
            manufacturer: req.manufacturer._id,
            stock: 0
        });
        
        // Diğer istatistikler buraya eklenebilir
        
        res.json({
            totalProducts,
            outOfStock,
            // Diğer istatistikler...
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Profil bilgilerini getir
router.get('/profile', verifyManufacturer, async (req, res) => {
    try {
        const manufacturer = await Manufacturer.findById(req.manufacturer._id)
            .select('-password -tokens');
        res.json(manufacturer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Profil güncelle
router.put('/profile', verifyManufacturer, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['companyName', 'address', 'phone'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).json({ message: 'Geçersiz güncelleme' });
    }

    try {
        updates.forEach(update => req.manufacturer[update] = req.body[update]);
        await req.manufacturer.save();
        res.json(req.manufacturer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
