const express = require('express');
const router = express.Router();
const { verifyManufacturer } = require('../middleware/auth');
const Product = require('../models/Product');
const Manufacturer = require('../models/Manufacturer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        if (file.fieldname === 'images') {
            uploadDir = path.join(__dirname, '../uploads/products');
        } else if (file.fieldname === 'documents') {
            uploadDir = path.join(__dirname, '../uploads/documents');
        }
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const prefix = file.fieldname === 'images' ? 'product-' : 'doc-';
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'images') {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Geçersiz resim formatı. Sadece JPEG, PNG ve WEBP kabul edilir.'));
        }
    } else if (file.fieldname === 'documents') {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Geçersiz belge formatı. Sadece PDF, JPEG ve PNG kabul edilir.'));
        }
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
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

        // Son giriş tarihini güncelle
        req.manufacturer.lastLogin = new Date();
        await req.manufacturer.save();

        res.json({
            totalProducts,
            outOfStock,
            recentProducts,
            manufacturer: {
                companyName: req.manufacturer.companyName,
                email: req.manufacturer.email,
                businessArea: req.manufacturer.businessArea,
                lastLogin: req.manufacturer.lastLogin
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ürünleri listele
router.get('/products', verifyManufacturer, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '' } = req.query;
        
        const query = { manufacturer: req.manufacturer._id };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-manufacturer'); // manufacturer bilgisini çıkar

        const count = await Product.countDocuments(query);

        res.json({
            products,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalProducts: count
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

// Ürün güncelle
router.put('/products/:id', verifyManufacturer, upload.array('images', 5), async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            manufacturer: req.manufacturer._id
        });

        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        const updates = Object.keys(req.body);
        const allowedUpdates = ['name', 'description', 'price', 'category', 'stock'];
        updates.forEach(update => {
            if (allowedUpdates.includes(update)) {
                product[update] = req.body[update];
            }
        });

        if (req.files && req.files.length > 0) {
            // Eski resimleri sil
            product.images.forEach(image => {
                const filePath = path.join(__dirname, '..', image);
                fs.unlink(filePath, err => {
                    if (err) console.error('Dosya silinirken hata:', err);
                });
            });

            // Yeni resimleri ekle
            product.images = req.files.map(file => `/uploads/products/${file.filename}`);
        }

        await product.save();
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ürün sil
router.delete('/products/:id', verifyManufacturer, async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            manufacturer: req.manufacturer._id
        });

        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        // Ürün resimlerini sil
        product.images.forEach(image => {
            const filePath = path.join(__dirname, '..', image);
            fs.unlink(filePath, err => {
                if (err) console.error('Dosya silinirken hata:', err);
            });
        });

        await product.deleteOne();
        res.json({ message: 'Ürün başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        await req.manufacturer.removeToken(req.token);
        res.json({ message: 'Başarıyla çıkış yapıldı' });
    } catch (error) {
        res.status(500).json({ message: 'Çıkış yapılırken hata oluştu' });
    }
});

module.exports = router;
