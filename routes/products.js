const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const verifyToken = require('../middleware/auth');
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

// Tüm ürünleri getir
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni ürün ekle
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
    const product = new Product({
        ...req.body,
        image: req.file.filename
    });

    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
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
            sort // price_asc, price_desc, rating, newest
        } = req.query;

        let query = {};
        
        // Kategori filtresi
        if (category && category !== 'Tüm Kategoriler') {
            query.category = category;
        }

        // Fiyat aralığı filtresi
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Model format filtresi
        if (modelFormat && modelFormat !== 'Tüm Formatlar') {
            query.modelFormats = modelFormat;
        }

        // Sıralama
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
