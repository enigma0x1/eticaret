// routes/manufacturer.js
const express = require('express');
const router = express.Router();
const { verifyManufacturer } = require('../middleware/auth');
const Product = require('../models/Product');
const Manufacturer = require('../models/Manufacturer'); // Eklendi
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Dosya işlemleri için eklendi

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/products');
        // Upload klasörünü oluştur (yoksa)
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

// Dashboard bilgilerini getir
router.get('/dashboard', verifyManufacturer, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments({ manufacturer: req.manufacturer._id });
        const outOfStock = await Product.countDocuments({ 
            manufacturer: req.manufacturer._id,
            stock: 0
        });
        
        // Son eklenen ürünler
        const recentProducts = await Product.find({ manufacturer: req.manufacturer._id })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            totalProducts,
            outOfStock,
            recentProducts,
            manufacturer: {
                companyName: req.manufacturer.companyName,
                email: req.manufacturer.email,
                businessArea: req.manufacturer.businessArea
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Üreticinin ürünlerini listele
router.get('/products', verifyManufacturer, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '' } = req.query;
        
        const query = { manufacturer: req.manufacturer._id };
        
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        
        if (category) {
            query.category = category;
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

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
        const { name, description, price, category, specifications, stock } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'En az bir ürün fotoğrafı gereklidir.' });
        }

        const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

        const product = new Product({
            name,
            description,
            price: Number(price),
            category,
            specifications: specifications ? JSON.parse(specifications) : {},
            stock: Number(stock),
            images: imageUrls,
            manufacturer: req.manufacturer._id
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        // Yüklenen dosyaları temizle
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
        const { name, description, price, category, specifications, stock, removedImages } = req.body;
        
        const product = await Product.findOne({
            _id: req.params.id,
            manufacturer: req.manufacturer._id
        });

        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        // Silinecek resimleri kaldır
        if (removedImages) {
            const removedImagesList = JSON.parse(removedImages);
            product.images = product.images.filter(img => !removedImagesList.includes(img));
            
            // Dosyaları fiziksel olarak sil
            removedImagesList.forEach(imgPath => {
                const fullPath = path.join(__dirname, '..', imgPath);
                fs.unlink(fullPath, err => {
                    if (err) console.error('Dosya silinirken hata:', err);
                });
            });
        }

        // Yeni resimler yüklendiyse ekle
        if (req.files && req.files.length > 0) {
            const newImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
            product.images = [...product.images, ...newImageUrls];
        }

        // Diğer alanları güncelle
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price ? Number(price) : product.price;
        product.category = category || product.category;
        product.specifications = specifications ? JSON.parse(specifications) : product.specifications;
        product.stock = stock ? Number(stock) : product.stock;

        await product.save();
        res.json(product);
    } catch (error) {
        // Yüklenen dosyaları temizle
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

        // Ürün resimlerini fiziksel olarak sil
        product.images.forEach(imgPath => {
            const fullPath = path.join(__dirname, '..', imgPath);
            fs.unlink(fullPath, err => {
                if (err) console.error('Dosya silinirken hata:', err);
            });
        });

        await product.deleteOne();
        res.json({ message: 'Ürün başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Profil bilgilerini getir
router.get('/profile', verifyManufacturer, async (req, res) => {
    try {
        const manufacturer = await Manufacturer.findById(req.manufacturer._id)
            .select('-password -tokens -documents');
        res.json(manufacturer);
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
            return res.status(400).json({ message: 'Geçersiz güncelleme alanları' });
        }

        updates.forEach(update => req.manufacturer[update] = req.body[update]);

        // Yeni belgeler yüklendiyse ekle
        if (req.files && req.files.length > 0) {
            const newDocUrls = req.files.map(file => `/uploads/documents/${file.filename}`);
            req.manufacturer.documents = [...(req.manufacturer.documents || []), ...newDocUrls];
        }

        await req.manufacturer.save();
        
        // Hassas bilgileri çıkar
        const manufacturer = req.manufacturer.toObject();
        delete manufacturer.password;
        delete manufacturer.tokens;
        
        res.json(manufacturer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Çıkış yap
router.post('/logout', verifyManufacturer, async (req, res) => {
    try {
        req.manufacturer.tokens = req.manufacturer.tokens.filter(token => token.token !== req.token);
        await req.manufacturer.save();
        res.json({ message: 'Başarıyla çıkış yapıldı' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
