const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// Route imports
const authRoute = require('./routes/auth');
const productsRoute = require('./routes/products');
const cartRoute = require('./routes/cart');
const manufacturerRoute = require('./routes/manufacturer');
const { auth, verifyManufacturer, verifyProfessional } = require('./middleware/auth');

dotenv.config();
const app = express();

// CORS Options
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://enigma0x1.github.io',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400
};

// Middleware Setup
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    next();
});

// Trust Proxy Setting
app.set('trust proxy', 1);

// Upload Directories Setup
const uploadDir = path.join(__dirname, 'uploads');
const productUploadDir = path.join(__dirname, 'uploads/products');

[uploadDir, productUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Static File Serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        status: 'error',
        message: 'Çok fazla istek yapıldı, lütfen daha sonra tekrar deneyin.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
app.use(limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'success',
        message: 'Server is healthy',
        timestamp: new Date(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// API Routes
app.use('/api/auth', authRoute);
app.use('/api/products', productsRoute);
app.use('/api/cart', cartRoute);
app.use('/api/manufacturer', manufacturerRoute);

// Protected Test Routes
app.get('/protected', auth, (req, res) => {
    res.json({ 
        status: 'success',
        message: "Protected route accessed successfully", 
        user: req.user 
    });
});

app.get('/manufacturer-only', verifyManufacturer, (req, res) => {
    res.json({ 
        status: 'success',
        message: "Manufacturer route accessed successfully", 
        manufacturer: req.manufacturer 
    });
});

app.get('/professional-only', verifyProfessional, (req, res) => {
    res.json({ 
        status: 'success',
        message: "Professional route accessed successfully", 
        professional: req.professional 
    });
});

// Error Handlers
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer Error Handler
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ 
            status: 'error',
            message: err.code === 'LIMIT_FILE_SIZE' ? 'Dosya boyutu çok büyük' : 'Dosya yükleme hatası',
            code: err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'FILE_UPLOAD_ERROR'
        });
    }

    // MongoDB Error Handler
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(503).json({
            status: 'error',
            message: 'Veritabanı hatası',
            code: 'DB_ERROR'
        });
    }

    // Validation Error Handler
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Doğrulama hatası',
            errors: Object.values(err.errors).map(e => e.message),
            code: 'VALIDATION_ERROR'
        });
    }

    // JWT Error Handler
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Geçersiz veya süresi dolmuş token',
            code: 'INVALID_TOKEN'
        });
    }

    // Default Error Handler
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Bir şeyler yanlış gitti!',
        code: err.code || 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        status: 'error',
        message: 'Sayfa bulunamadı!',
        code: 'NOT_FOUND',
        path: req.originalUrl
    });
});

// Graceful Shutdown
const gracefulShutdown = () => {
    console.log('Graceful shutdown initiated...');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Server Setup
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Server Timeout
server.timeout = 60000; // 60 seconds

module.exports = app;
