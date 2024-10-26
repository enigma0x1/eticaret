const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');

// Sepeti getir
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ 
            userId: req.user._id,
            userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        }).populate('items.productId');
        
        if (!cart) {
            cart = new Cart({
                userId: req.user._id,
                userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional',
                items: [],
                total: 0
            });
            await cart.save();
        }
        
        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Sepete ürün ekle
router.post('/add', auth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        let cart = await Cart.findOne({ 
            userId: req.user._id,
            userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        });
        
        if (!cart) {
            cart = new Cart({
                userId: req.user._id,
                userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional',
                items: [],
                total: 0
            });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ productId, quantity });
        }

        await cart.save();
        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Sepetten ürün çıkar
router.delete('/remove/:productId', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ 
            userId: req.user._id,
            userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        });
        
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Sepet bulunamadı' });
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== req.params.productId);
        await cart.save();
        
        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
