const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoute = require('./routes/auth');
const productsRoute = require('./routes/products'); // Yeni eklendi
const cartRoute = require('./routes/cart'); // Yeni eklendi
const verifyToken = require('./middleware/auth');
const path = require('path');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/products', productsRoute); // Yeni eklendi
app.use('/api/cart', cartRoute); // Yeni eklendi

// Test Routes
app.get('/test', (req, res) => {
    res.send('Test route is working!');
});

app.get('/protected', verifyToken, (req, res) => {
    res.json({ message: "Protected route accessed successfully", user: req.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
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
