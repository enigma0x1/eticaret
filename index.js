require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const productRoutes = require('./routes/products');

const app = express();
const port = process.env.PORT || 10000;

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB bağlantısı başarılı'))
    .catch(err => console.error('MongoDB bağlantı hatası:', err));

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);

app.listen(port, () => {
    console.log(`Server ${port} portunda çalışıyor`);
});
