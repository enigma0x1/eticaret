const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const Manufacturer = require('../models/Manufacturer');
const Professional = require('../models/Professional');
const { verifyManufacturer, verifyProfessional } = require('../middleware/auth');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Geçersiz dosya formatı. Sadece PDF, JPEG ve PNG dosyaları kabul edilir.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// ÜRETİCİ ROUTES

// Üretici Kaydı
router.post('/manufacturer/register', async (req, res) => {
    try {
        const { email, password, companyName, taxNumber, address, phone } = req.body;

        const existingManufacturer = await Manufacturer.findOne({ email });
        if (existingManufacturer) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu email adresi zaten kullanımda' 
            });
        }

        const existingTaxNumber = await Manufacturer.findOne({ taxNumber });
        if (existingTaxNumber) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu vergi numarası zaten kayıtlı' 
            });
        }

        const manufacturer = new Manufacturer({
            email,
            password,
            companyName,
            taxNumber,
            address,
            phone
        });

        await manufacturer.save();

        const token = jwt.sign(
            { 
                _id: manufacturer._id.toString(),
                userType: 'manufacturer'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            userType: 'manufacturer',
            manufacturer: {
                id: manufacturer._id,
                email: manufacturer.email,
                companyName: manufacturer.companyName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Üretici Girişi
router.post('/manufacturer/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const manufacturer = await Manufacturer.findOne({ email });
        if (!manufacturer) {
            return res.status(401).json({ 
                success: false,
                message: 'Böyle bir üretici hesabı bulunamadı' 
            });
        }

        const isMatch = await manufacturer.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Hatalı şifre' 
            });
        }

        const token = jwt.sign(
            { 
                _id: manufacturer._id.toString(),
                userType: 'manufacturer'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            userType: 'manufacturer',
            manufacturer: {
                id: manufacturer._id,
                email: manufacturer.email,
                companyName: manufacturer.companyName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

// PROFESYONEL ROUTES

// Profesyonel Kaydı
router.post('/professional/register', upload.single('diploma'), async (req, res) => {
    try {
        const { email, password, fullName, profession, specialization, experience, phone } = req.body;

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'Diploma veya yeterlilik belgesi zorunludur' 
            });
        }

        const existingProfessional = await Professional.findOne({ email });
        if (existingProfessional) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu email adresi zaten kullanımda' 
            });
        }

        const professional = new Professional({
            email,
            password,
            fullName,
            profession,
            specialization,
            experience,
            phone,
            portfolio: req.file.path
        });

        await professional.save();

        const token = jwt.sign(
            { 
                _id: professional._id.toString(),
                userType: 'professional'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            userType: 'professional',
            professional: {
                id: professional._id,
                email: professional.email,
                fullName: professional.fullName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Profesyonel Girişi
router.post('/professional/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const professional = await Professional.findOne({ email });
        if (!professional) {
            return res.status(401).json({ 
                success: false,
                message: 'Böyle bir profesyonel hesabı bulunamadı' 
            });
        }

        const isMatch = await professional.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Hatalı şifre' 
            });
        }

        const token = jwt.sign(
            { 
                _id: professional._id.toString(),
                userType: 'professional'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            userType: 'professional',
            professional: {
                id: professional._id,
                email: professional.email,
                fullName: professional.fullName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

// Çıkış Routes
router.post('/manufacturer/logout', verifyManufacturer, async (req, res) => {
    try {
        req.manufacturer.tokens = req.manufacturer.tokens.filter(token => token.token !== req.token);
        await req.manufacturer.save();
        res.json({ 
            success: true,
            message: 'Başarıyla çıkış yapıldı' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

router.post('/professional/logout', verifyProfessional, async (req, res) => {
    try {
        req.professional.tokens = req.professional.tokens.filter(token => token.token !== req.token);
        await req.professional.save();
        res.json({ 
            success: true,
            message: 'Başarıyla çıkış yapıldı' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

module.exports = router;
