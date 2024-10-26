// routes/professional.js
const express = require('express');
const router = express.Router();
const { verifyProfessional } = require('../middleware/auth');
const Professional = require('../models/Professional');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/diplomas');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'diploma-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Geçersiz dosya tipi. Sadece JPEG, PNG, WEBP ve PDF formatları kabul edilir.'));
        }
    }
});

// Dashboard bilgilerini getir
router.get('/dashboard', verifyProfessional, async (req, res) => {
    try {
        // Son görüntülenen ürünler, favoriler vb. eklenebilir
        res.json({
            professional: {
                fullName: req.professional.fullName,
                email: req.professional.email,
                profession: req.professional.profession
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Profil bilgilerini getir
router.get('/profile', verifyProfessional, async (req, res) => {
    try {
        const professional = await Professional.findById(req.professional._id)
            .select('-password -tokens');
        res.json(professional);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Profil güncelle
router.put('/profile', verifyProfessional, upload.single('diploma'), async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['fullName', 'profession'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Geçersiz güncelleme alanları' });
        }

        updates.forEach(update => req.professional[update] = req.body[update]);

        // Yeni diploma yüklendiyse güncelle
        if (req.file) {
            // Eski diploma dosyasını sil
            if (req.professional.diploma) {
                const oldPath = path.join(__dirname, '..', req.professional.diploma);
                fs.unlink(oldPath, err => {
                    if (err && err.code !== 'ENOENT') console.error('Dosya silinirken hata:', err);
                });
            }
            req.professional.diploma = `/uploads/diplomas/${req.file.filename}`;
        }

        await req.professional.save();
        
        // Hassas bilgileri çıkar
        const professional = req.professional.toObject();
        delete professional.password;
        delete professional.tokens;
        
        res.json(professional);
    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, err => {
                if (err) console.error('Dosya silinirken hata:', err);
            });
        }
        res.status(400).json({ message: error.message });
    }
});

// Favori ürünleri getir
router.get('/favorites', verifyProfessional, async (req, res) => {
    try {
        const professional = await Professional.findById(req.professional._id)
            .populate('favorites');
        res.json(professional.favorites || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ürünü favorilere ekle
router.post('/favorites/:productId', verifyProfessional, async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        const professional = await Professional.findById(req.professional._id);
        if (!professional.favorites.includes(req.params.productId)) {
            professional.favorites.push(req.params.productId);
            await professional.save();
        }

        res.json({ message: 'Ürün favorilere eklendi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ürünü favorilerden çıkar
router.delete('/favorites/:productId', verifyProfessional, async (req, res) => {
    try {
        const professional = await Professional.findById(req.professional._id);
        professional.favorites = professional.favorites.filter(
            id => id.toString() !== req.params.productId
        );
        await professional.save();
        res.json({ message: 'Ürün favorilerden çıkarıldı' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Çıkış yap
router.post('/logout', verifyProfessional, async (req, res) => {
    try {
        req.professional.tokens = req.professional.tokens.filter(token => token.token !== req.token);
        await req.professional.save();
        res.json({ message: 'Başarıyla çıkış yapıldı' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
