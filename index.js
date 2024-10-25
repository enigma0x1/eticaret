const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Backend ana sayfası çalışıyor!' });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend API test endpoint çalışıyor!' });
});

app.listen(port, () => {
    console.log(`Server ${port} portunda çalışıyor`);
});
