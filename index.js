require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth'); // Auth routes eklendi
const jwt = require('jsonwebtoken'); // JWT için

const app = express();
const port = process.env.PORT || 10000;

// MongoDB bağlantısı
console.log('MongoDB bağlantısı başlatılıyor...');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB bağlantısı başarılı');
    })
    .catch(err => {
        console.error('MongoDB bağlantı hatası:', err);
    });

// Middleware
app.use(cors());
app.use(express.json());

// JWT doğrulama middleware'i
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: "Token geçersiz!" });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ message: "Yetkilendirme token'ı yok!" });
    }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint çalışıyor' });
});

// Protected test route
app.get('/protected', verifyToken, (req, res) => {
    res.json({ message: 'Protected endpoint çalışıyor', user: req.user });
});

// Hata yakalama middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Bir şeyler ters gitti!' });
});

app.listen(port, () => {
    console.log(`Server ${port} portunda çalışıyor`);
});
