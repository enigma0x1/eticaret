require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const productRoutes = require('./routes/products');

const app = express();
const port = process.env.PORT || 10000;

// MongoDB bağlantısı
console.log('MongoDB bağlantısı başlatılıyor...');
console.log('MONGODB_URI:', process.env.MONGODB_URI); // URL'i kontrol etmek için

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB bağlantısı başarılı');
    })
    .catch(err => {
        console.error('MongoDB bağlantı hatası:', err);
    });

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);

// Hata yakalama middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Bir şeyler ters gitti!' });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint çalışıyor' });
});

app.listen(port, () => {
    console.log(`Server ${port} portunda çalışıyor`);
});
