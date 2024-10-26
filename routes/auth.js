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

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Geçersiz dosya tipi. Sadece JPEG, PNG, WEBP ve PDF formatları kabul edilir.'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Üretici Login
router.post('/manufacturer/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const manufacturer = await Manufacturer.findOne({ email: email.toLowerCase() });
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

        // Token'ı üreticiye ekle
        manufacturer.tokens = manufacturer.tokens || [];
        manufacturer.tokens.push({ token });
        manufacturer.lastLogin = new Date();
        await manufacturer.save();

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

        const professional = await Professional.findOne({ email: email.toLowerCase() });
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

        // Token'ı profesyonele ekle
        professional.tokens = professional.tokens || [];
        professional.tokens.push({ token });
        professional.lastLogin = new Date();
        await professional.save();

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

        const existingManufacturer = await Manufacturer.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                { taxNumber }
            ]
        });

        if (existingManufacturer) {
            return res.status(400).json({ 
                success: false,
                message: existingManufacturer.email === email.toLowerCase() ? 
                    'Bu email adresi zaten kullanımda' : 
                    'Bu vergi numarası zaten kullanımda'
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
            email: email.toLowerCase(),
            password,
            address,
            phone,
            businessArea,
            taxNumber,
            contactName,
            documents: documentPaths,
            isActive: true
        });

        const token = jwt.sign(
            { 
                _id: manufacturer._id.toString(),
                userType: 'manufacturer'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        manufacturer.tokens = [{ token }];
        await manufacturer.save();

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

        const existingProfessional = await Professional.findOne({ email: email.toLowerCase() });
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
            email: email.toLowerCase(),
            password,
            profession,
            diploma: diplomaPath,
            isActive: true
        });

        const token = jwt.sign(
            { 
                _id: professional._id.toString(),
                userType: 'professional'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        professional.tokens = [{ token }];
        await professional.save();

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

// Token Doğrulama
router.get('/verify-token', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token bulunamadı'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user;

        if (decoded.userType === 'manufacturer') {
            user = await Manufacturer.findOne({ 
                _id: decoded._id,
                'tokens.token': token,
                isActive: true
            });
        } else if (decoded.userType === 'professional') {
            user = await Professional.findOne({ 
                _id: decoded._id,
                'tokens.token': token,
                isActive: true
            });
        }

        if (!user) {
            throw new Error('Geçersiz token');
        }

        res.json({
            success: true,
            userType: decoded.userType,
            user: {
                id: user._id,
                email: user.email,
                ...(decoded.userType === 'manufacturer' ? 
                    { companyName: user.companyName } : 
                    { fullName: user.fullName })
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Geçersiz token'
        });
    }
});

module.exports = router;
