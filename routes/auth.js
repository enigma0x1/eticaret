// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Manufacturer = require('../models/Manufacturer');
const Professional = require('../models/Professional');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        if (file.fieldname === 'documents') {
            uploadDir = path.join(__dirname, '../uploads/documents');
        } else if (file.fieldname === 'diploma') {
            uploadDir = path.join(__dirname, '../uploads/diplomas');
        }

        // Klasörü oluştur (yoksa)
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

// Üretici Login
router.post('/manufacturer/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const manufacturer = await Manufacturer.findOne({ email });
        if (!manufacturer) {
            return res.status(400).json({
                success: false,
                message: 'Email veya şifre hatalı'
            });
        }

        const isMatch = await bcrypt.compare(password, manufacturer.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Email veya şifre hatalı'
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
            user: {
                id: manufacturer._id,
                email: manufacturer.email,
                companyName: manufacturer.companyName
            },
            token
        });
    } catch (error) {
        console.error('Manufacturer login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Profesyonel Login
router.post('/professional/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const professional = await Professional.findOne({ email });
        if (!professional) {
            return res.status(400).json({
                success: false,
                message: 'Email veya şifre hatalı'
            });
        }

        const isMatch = await bcrypt.compare(password, professional.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Email veya şifre hatalı'
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
            user: {
                id: professional._id,
                email: professional.email,
                fullName: professional.fullName
            },
            token
        });
    } catch (error) {
        console.error('Professional login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Üretici Kaydı
router.post('/manufacturer/register', upload.array('documents', 5), async (req, res) => {
    try {
        const { companyName, email, password, address, phone, businessArea, taxNumber, contactName } = req.body;

        const existingManufacturer = await Manufacturer.findOne({ email });
        if (existingManufacturer) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu email adresi zaten kullanımda' 
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Şirket belgeleri gereklidir'
            });
        }

        const documentPaths = req.files.map(file => `/uploads/documents/${file.filename}`);

        const manufacturer = new Manufacturer({
            companyName,
            email,
            password,
            address,
            phone,
            businessArea,
            taxNumber,
            contactName,
            documents: documentPaths
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
            user: {
                id: manufacturer._id,
                email: manufacturer.email,
                companyName: manufacturer.companyName
            },
            token
        });
    } catch (error) {
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, err => {
                    if (err) console.error('Dosya silinirken hata:', err);
                });
            });
        }
        console.error('Manufacturer register error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası',
            error: error.message
        });
    }
});

// Profesyonel Kaydı
router.post('/professional/register', upload.single('diploma'), async (req, res) => {
    try {
        const { fullName, email, password, profession } = req.body;

        const existingProfessional = await Professional.findOne({ email });
        if (existingProfessional) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu email adresi zaten kullanımda' 
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Diploma veya yeterlilik belgesi gereklidir'
            });
        }

        const diplomaPath = `/uploads/diplomas/${req.file.filename}`;

        const professional = new Professional({
            fullName,
            email,
            password,
            profession,
            diploma: diplomaPath
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
            user: {
                id: professional._id,
                email: professional.email,
                fullName: professional.fullName
            },
            token
        });
    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, err => {
                if (err) console.error('Dosya silinirken hata:', err);
            });
        }
        console.error('Professional register error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası',
            error: error.message
        });
    }
});

module.exports = router;
