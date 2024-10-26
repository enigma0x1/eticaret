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
        console.error('Cart fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sepet bilgileri alınırken hata oluştu' 
        });
    }
});

// Sepete ürün ekle
router.post('/add', auth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ürün veya miktar'
            });
        }

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

        const itemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId
        );

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ productId, quantity });
        }

        await cart.save();
        await cart.populate('items.productId');

        res.json({ success: true, cart });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün sepete eklenirken hata oluştu' 
        });
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
            return res.status(404).json({
                success: false,
                message: 'Sepet bulunamadı'
            });
        }

        cart.items = cart.items.filter(item => 
            item.productId.toString() !== req.params.productId
        );

        await cart.save();
        await cart.populate('items.productId');

        res.json({ success: true, cart });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün sepetten çıkarılırken hata oluştu' 
        });
    }
});

// Sepet miktarını güncelle
router.put('/update/:productId', auth, async (req, res) => {
    try {
        const { quantity } = req.body;

        if (!quantity || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz miktar'
            });
        }

        const cart = await Cart.findOne({ 
            userId: req.user._id,
            userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Sepet bulunamadı'
            });
        }

        const itemIndex = cart.items.findIndex(item => 
            item.productId.toString() === req.params.productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ürün sepette bulunamadı'
            });
        }

        if (quantity === 0) {
            cart.items = cart.items.filter(item => 
                item.productId.toString() !== req.params.productId
            );
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();
        await cart.populate('items.productId');

        res.json({ success: true, cart });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sepet güncellenirken hata oluştu' 
        });
    }
});

// Sepeti temizle
router.delete('/clear', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ 
            userId: req.user._id,
            userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Sepet bulunamadı'
            });
        }

        cart.items = [];
        cart.total = 0;
        await cart.save();

        res.json({ 
            success: true, 
            message: 'Sepet temizlendi',
            cart 
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sepet temizlenirken hata oluştu' 
        });
    }
});

module.exports = router;
