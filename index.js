const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoute = require('./routes/auth');
const productsRoute = require('./routes/products');
const cartRoute = require('./routes/cart');
const manufacturerRoute = require('./routes/manufacturer');
const { auth, verifyManufacturer, verifyProfessional } = require('./middleware/auth');
const path = require('path');
const multer = require('multer');

dotenv.config();
const app = express();

// CORS Options
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://enigma0x1.github.io',
        // Diğer izin verilen originler
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400 // 24 saat
};

// CORS Middleware
app.use(cors(corsOptions));

// CORS Pre-flight requests için
app.options('*', cors(corsOptions));

// Security Headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    next();
});

// Basic Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload klasörlerini oluştur (eğer yoksa)
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
const productUploadDir = path.join(__dirname, 'uploads/products');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir);
}

// Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100 // IP başına limit
});
app.use(limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api/products', productsRoute);
app.use('/api/cart', cartRoute);
app.use('/api/manufacturer', manufacturerRoute);

// Test Routes
app.get('/test', (req, res) => {
    res.send('Test route is working!');
});

// Korumalı test rotaları
app.get('/protected', auth, (req, res) => {
    res.json({ message: "Protected route accessed successfully", user: req.user });
});

app.get('/manufacturer-only', verifyManufacturer, (req, res) => {
    res.json({ message: "Manufacturer route accessed successfully", manufacturer: req.manufacturer });
});

app.get('/professional-only', verifyProfessional, (req, res) => {
    res.json({ message: "Professional route accessed successfully", professional: req.professional });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    // Multer hata kontrolü
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                status: 'error',
                message: 'Dosya boyutu çok büyük',
                code: 'FILE_TOO_LARGE'
            });
        }
        return res.status(400).json({ 
            status: 'error',
            message: 'Dosya yükleme hatası',
            code: 'FILE_UPLOAD_ERROR'
        });
    }
    
    // MongoDB hataları
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(503).json({
            status: 'error',
            message: 'Veritabanı hatası',
            code: 'DB_ERROR'
        });
    }

    // Validation hataları
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Doğrulama hatası',
            errors: Object.values(err.errors).map(e => e.message),
            code: 'VALIDATION_ERROR'
        });
    }

    // Genel hata
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Bir şeyler yanlış gitti!',
        code: err.code || 'INTERNAL_SERVER_ERROR'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        status: 'error',
        message: 'Sayfa bulunamadı!',
        code: 'NOT_FOUND'
    });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    app.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Timeout ayarı
server.timeout = 60000; // 60 saniye

module.exports = app;
