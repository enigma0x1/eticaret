const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');
const Product = require('../models/Product'); // Ürün fiyatı için gerekli

// Aktif sepeti getir
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findActiveCart(
            req.user._id,
            req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        );
        
        if (!cart) {
            cart = new Cart({
                userId: req.user._id,
                userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional',
                items: [],
                total: 0,
                status: 'active'
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

        // Ürün fiyatını al
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        let cart = await Cart.findActiveCart(
            req.user._id,
            req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        );

        if (!cart) {
            cart = new Cart({
                userId: req.user._id,
                userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional',
                status: 'active'
            });
        }

        await cart.addItem(productId, quantity, product.price);
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
        const cart = await Cart.findActiveCart(
            req.user._id,
            req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        );

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Sepet bulunamadı'
            });
        }

        await cart.removeItem(req.params.productId);
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

        const cart = await Cart.findActiveCart(
            req.user._id,
            req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        );

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Sepet bulunamadı'
            });
        }

        await cart.updateItemQuantity(req.params.productId, quantity);
        await cart.populate('items.productId');

        res.json({ success: true, cart });
    } catch (error) {
        if (error.message === 'Ürün sepette bulunamadı') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
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
        const cart = await Cart.findActiveCart(
            req.user._id,
            req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        );

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Sepet bulunamadı'
            });
        }

        await cart.clear();

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

// Sepeti tamamla
router.post('/complete', auth, async (req, res) => {
    try {
        const cart = await Cart.findActiveCart(
            req.user._id,
            req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        );

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Aktif sepet bulunamadı'
            });
        }

        if (cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sepetiniz boş'
            });
        }

        cart.status = 'completed';
        await cart.save();

        res.json({ 
            success: true, 
            message: 'Sepet tamamlandı',
            cart 
        });
    } catch (error) {
        console.error('Complete cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sepet tamamlanırken hata oluştu' 
        });
    }
});

// Sepeti iptal et
router.post('/abandon', auth, async (req, res) => {
    try {
        const cart = await Cart.findActiveCart(
            req.user._id,
            req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        );

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Aktif sepet bulunamadı'
            });
        }

        cart.status = 'abandoned';
        await cart.save();

        res.json({ 
            success: true, 
            message: 'Sepet iptal edildi',
            cart 
        });
    } catch (error) {
        console.error('Abandon cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sepet iptal edilirken hata oluştu' 
        });
    }
});

module.exports = router;
