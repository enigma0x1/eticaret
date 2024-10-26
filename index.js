const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoute = require('./routes/auth');
const productsRoute = require('./routes/products');
const cartRoute = require('./routes/cart');
const verifyToken = require('./middleware/auth');
const path = require('path');

// Yeni importlar
const { verifyManufacturer, verifyProfessional } = require('./middleware/auth');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload klasörünü oluştur (eğer yoksa)
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/products', productsRoute);
app.use('/api/cart', cartRoute);

// Test Routes
app.get('/test', (req, res) => {
    res.send('Test route is working!');
});

// Korumalı test rotaları
app.get('/protected', verifyToken, (req, res) => {
    res.json({ message: "Protected route accessed successfully", user: req.user });
});

app.get('/manufacturer-only', verifyManufacturer, (req, res) => {
    res.json({ message: "Manufacturer route accessed successfully", manufacturer: req.manufacturer });
});

app.get('/professional-only', verifyProfessional, (req, res) => {
    res.json({ message: "Professional route accessed successfully", professional: req.professional });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Multer hata kontrolü
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Dosya boyutu çok büyük' });
        }
        return res.status(400).json({ message: 'Dosya yükleme hatası' });
    }
    
    res.status(500).json({ message: 'Bir şeyler yanlış gitti!', error: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Sayfa bulunamadı!' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
