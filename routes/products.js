const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { verifyToken, verifyManufacturer } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Uploads klasörünü oluştur
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).single('image');

// Tüm ürünleri getir (public)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('manufacturer', 'companyName');
        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Manufacturer'ın kendi ürünlerini getir
router.get('/my-products', verifyManufacturer, async (req, res) => {
    try {
        const products = await Product.find({ manufacturer: req.user.id });
        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Ürün ara
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        const products = await Product.find({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } }
            ]
        }).populate('manufacturer', 'companyName');
        
        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Kategori bazlı ürünler
router.get('/category/:category', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.category })
            .populate('manufacturer', 'companyName');
        
        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Filtreli ürün getirme
router.get('/filter', async (req, res) => {
    try {
        const { 
            category, 
            minPrice, 
            maxPrice, 
            modelFormat,
            sort
        } = req.query;

        let query = {};
        
        if (category && category !== 'Tüm Kategoriler') {
            query.category = category;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        if (modelFormat && modelFormat !== 'Tüm Formatlar') {
            query.modelFormats = modelFormat;
        }

        let sortQuery = {};
        switch(sort) {
            case 'price_asc':
                sortQuery = { price: 1 };
                break;
            case 'price_desc':
                sortQuery = { price: -1 };
                break;
            case 'rating':
                sortQuery = { rating: -1 };
                break;
            case 'newest':
                sortQuery = { createdAt: -1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }

        const products = await Product.find(query)
            .sort(sortQuery)
            .populate('manufacturer', 'companyName');

        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Yeni ürün ekle (sadece manufacturer)
router.post('/', verifyManufacturer, (req, res) => {
    upload(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: 'Dosya yükleme hatası',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        try {
            console.log('Gelen veriler:', req.body);
            console.log('Gelen dosya:', req.file);

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Ürün görseli gereklidir'
                });
            }

            const product = new Product({
                title: req.body.title,
                description: req.body.description,
                price: req.body.price,
                category: req.body.category,
                modelFormats: JSON.parse(req.body.modelFormats || '["3D"]'),
                manufacturer: req.user.id,
                image: `/uploads/${req.file.filename}`
            });

            const newProduct = await product.save();
            res.status(201).json({
                success: true,
                product: newProduct
            });
        } catch (error) {
            console.error('Product creation error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    });
});

// Ürün güncelle (sadece kendi ürünlerini)
router.put('/:id', verifyManufacturer, (req, res) => {
    upload(req, res, async function(err) {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        try {
            const product = await Product.findOne({ 
                _id: req.params.id,
                manufacturer: req.user.id 
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı veya bu ürünü düzenleme yetkiniz yok'
                });
            }

            // Mevcut alanları güncelle
            product.title = req.body.title || product.title;
            product.description = req.body.description || product.description;
            product.price = req.body.price || product.price;
            product.category = req.body.category || product.category;
            if (req.body.modelFormats) {
                product.modelFormats = JSON.parse(req.body.modelFormats);
            }

            // Eğer yeni bir resim yüklendiyse
            if (req.file) {
                // Eski resmi sil
                if (product.image) {
                    const oldImagePath = path.join(__dirname, '..', product.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                product.image = `/uploads/${req.file.filename}`;
            }

            await product.save();
            res.json({
                success: true,
                product
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    });
});

// Ürün sil (sadece kendi ürünlerini)
router.delete('/:id', verifyManufacturer, async (req, res) => {
    try {
        const product = await Product.findOne({ 
            _id: req.params.id,
            manufacturer: req.user.id 
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı veya bu ürünü silme yetkiniz yok'
            });
        }

        // Ürün resmini sil
        if (product.image) {
            const imagePath = path.join(__dirname, '..', product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await product.remove();
        res.json({
            success: true,
            message: 'Ürün başarıyla silindi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Tekil ürün getirme
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('manufacturer', 'companyName');
            
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }
        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
