const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend çalışıyor!' });
});

app.listen(port, () => {
    console.log(`Server ${port} portunda çalışıyor`);
});
