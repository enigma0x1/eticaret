const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { verifyToken, verifyManufacturer } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Tüm ürünleri getir (public)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Manufacturer'ın kendi ürünlerini getir
router.get('/my-products', verifyManufacturer, async (req, res) => {
    try {
        const products = await Product.find({ manufacturer: req.user.id });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Kategori bazlı ürünler
router.get('/category/:category', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.category });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

        const products = await Product.find(query).sort(sortQuery);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni ürün ekle (sadece manufacturer)
router.post('/', verifyManufacturer, upload.single('image'), async (req, res) => {
    const product = new Product({
        ...req.body,
        manufacturer: req.user.id,
        image: req.file.filename
    });

    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ürün güncelle (sadece kendi ürünlerini)
router.put('/:id', verifyManufacturer, async (req, res) => {
    try {
        const product = await Product.findOne({ 
            _id: req.params.id,
            manufacturer: req.user.id 
        });

        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı veya bu ürünü düzenleme yetkiniz yok' });
        }

        Object.assign(product, req.body);
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ürün sil (sadece kendi ürünlerini)
router.delete('/:id', verifyManufacturer, async (req, res) => {
    try {
        const product = await Product.findOne({ 
            _id: req.params.id,
            manufacturer: req.user.id 
        });

        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı veya bu ürünü silme yetkiniz yok' });
        }

        await product.remove();
        res.json({ message: 'Ürün başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Tekil ürün getirme
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
