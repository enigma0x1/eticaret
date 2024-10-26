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
            success: true,
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
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Ürünleri listele
router.get('/products', verifyManufacturer, async (req, res) => {
    try {
        const products = await Product.find({ manufacturer: req.manufacturer._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Yeni ürün ekle
router.post('/products', verifyManufacturer, upload.single('image'), async (req, res) => {
    try {
        console.log('Received product data:', req.body);
        console.log('Received file:', req.file);

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'Ürün görseli gereklidir' 
            });
        }

        const product = new Product({
            title: req.body.title,
            description: req.body.description,
            price: Number(req.body.price),
            category: req.body.category,
            modelFormats: JSON.parse(req.body.modelFormats || '["3D"]'),
            manufacturer: req.manufacturer._id,
            image: `/uploads/products/${req.file.filename}`
        });

        await product.save();
        
        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Product creation error:', error);
        if (req.file) {
            fs.unlink(req.file.path, err => {
                if (err) console.error('File deletion error:', err);
            });
        }
        res.status(400).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Ürün güncelle
router.put('/products/:id', verifyManufacturer, upload.single('image'), async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            manufacturer: req.manufacturer._id
        });

        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: 'Ürün bulunamadı' 
            });
        }

        // Temel alanları güncelle
        product.title = req.body.title || product.title;
        product.description = req.body.description || product.description;
        product.price = req.body.price || product.price;
        product.category = req.body.category || product.category;
        if (req.body.modelFormats) {
            product.modelFormats = JSON.parse(req.body.modelFormats);
        }

        // Yeni resim yüklendiyse
        if (req.file) {
            // Eski resmi sil
            if (product.image) {
                const oldImagePath = path.join(__dirname, '..', product.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, err => {
                        if (err) console.error('Old image deletion error:', err);
                    });
                }
            }
            product.image = `/uploads/products/${req.file.filename}`;
        }

        await product.save();
        
        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Product update error:', error);
        res.status(400).json({ 
            success: false,
            message: error.message 
        });
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
            return res.status(404).json({ 
                success: false,
                message: 'Ürün bulunamadı' 
            });
        }

        // Ürün resmini sil
        if (product.image) {
            const imagePath = path.join(__dirname, '..', product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, err => {
                    if (err) console.error('Image deletion error:', err);
                });
            }
        }

        await product.deleteOne();
        
        res.json({
            success: true,
            message: 'Ürün başarıyla silindi'
        });
    } catch (error) {
        console.error('Product deletion error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Profil güncelle
router.put('/profile', verifyManufacturer, upload.array('documents', 5), async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['companyName', 'address', 'phone', 'businessArea', 'contactName'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ 
                success: false,
                message: 'Geçersiz güncelleme' 
            });
        }

        updates.forEach(update => req.manufacturer[update] = req.body[update]);

        if (req.files && req.files.length > 0) {
            const documentUrls = req.files.map(file => `/uploads/documents/${file.filename}`);
            req.manufacturer.documents = [...(req.manufacturer.documents || []), ...documentUrls];
        }

        await req.manufacturer.save();
        
        res.json({
            success: true,
            manufacturer: req.manufacturer
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(400).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Belge sil
router.delete('/documents', verifyManufacturer, async (req, res) => {
    try {
        const { documentPath } = req.body;
        
        if (!documentPath) {
            return res.status(400).json({ 
                success: false,
                message: 'Belge yolu gereklidir' 
            });
        }

        // Belgeyi dosya sisteminden sil
        const fullPath = path.join(__dirname, '..', documentPath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        // Belgeyi veritabanından kaldır
        req.manufacturer.documents = req.manufacturer.documents.filter(doc => doc !== documentPath);
        await req.manufacturer.save();

        res.json({
            success: true,
            message: 'Belge başarıyla silindi'
        });
    } catch (error) {
        console.error('Document deletion error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

module.exports = router;
