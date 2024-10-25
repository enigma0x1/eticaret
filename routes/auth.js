const router = require('express').Router();
const path = require('path');
const User = require(path.resolve(__dirname, '..', 'models', 'User'));
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Hata ayıklama için log ekleyelim
console.log('Models dizini:', path.resolve(__dirname, '..', 'models'));
console.log('User model yolu:', path.resolve(__dirname, '..', 'models', 'User'));

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        console.error('Register hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: "Geçersiz şifre" });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ user, token });
    } catch (err) {
        console.error('Login hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
