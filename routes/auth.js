const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
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

// REGISTER (SIGNUP)
router.post('/register', upload.single('diploma'), async (req, res) => {
    try {
        const { name, email, password, userType, profession } = req.body;

        // Email kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu email adresi zaten kullanımda' });
        }

        // Dosya kontrolü (eğer professional ise zorunlu)
        if (userType === 'professional' && !req.file) {
            return res.status(400).json({ message: 'Diploma veya yeterlilik belgesi zorunludur' });
        }

        // Şifreyi hash'le
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yeni kullanıcı oluştur
        const user = new User({
            name,
            email,
            password: hashedPassword,
            userType,
            profession: userType === 'professional' ? profession : undefined,
            diplomaUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
            verified: false
        });

        await user.save();

        // Token oluştur
        const token = jwt.sign(
            { userId: user._id, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Kullanıcı başarıyla oluşturuldu',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                profession: user.profession,
                diplomaUrl: user.diplomaUrl
            }
        });

    } catch (error) {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'Dosya boyutu 5MB\'dan büyük olamaz' });
            }
            return res.status(400).json({ message: 'Dosya yükleme hatası' });
        }
        res.status(500).json({ message: error.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Kullanıcı bulunamadı' });
        }

        // Şifreyi kontrol et
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Geçersiz şifre' });
        }

        // Token oluştur
        const token = jwt.sign(
            { userId: user._id, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Giriş başarılı',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                profession: user.profession,
                diplomaUrl: user.diplomaUrl
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Kullanıcı bilgilerini getir
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
