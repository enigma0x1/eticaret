const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product'); // Product modelini ekleyin
const { auth } = require('../middleware/auth');

// Sepeti getir
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ 
            userId: req.user._id,
            userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional'
        }).populate({
            path: 'items.productId',
            select: 'name price images description' // İhtiyacınız olan alanları seçin
        });
        
        if (!cart) {
            cart = new Cart({
                userId: req.user._id,
                userType: req.userType === 'manufacturer' ? 'Manufacturer' : 'Professional',
                items: [],
                total: 0
            });
            await cart.save();
        }

        // Toplam fiyatı hesapla
        cart.total = cart.items.reduce((total, item) => {
            return total + (item.productId.price * item.quantity);
        }, 0);
        
        await cart.save();
        
        res.json({
            success: true,
            cart: {
                _id: cart._id,
                userId: cart.userId,
                userType: cart.userType,
                items: cart.items,
                total: cart.total,
                createdAt: cart.createdAt,
                updatedAt: cart.updatedAt
            }
        });
    } catch (error) {
        console.error('Cart fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Sepet bilgileri alınırken bir hata oluştu',
            error: error.message 
        });
    }
});

// Sepete ürün ekle
router.post('/add', auth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        // Girdi doğrulama
        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ürün veya miktar'
            });
        }

        // Ürünün varlığını kontrol et
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
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

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            // Ürün zaten sepette varsa miktarını güncelle
            cart.items[itemIndex].quantity += quantity;
        } else {
            // Yeni ürün ekle
            cart.items.push({ productId, quantity });
        }

        // Toplam fiyatı güncelle
        cart.total = cart.items.reduce((total, item) => {
            return total + (product.price * item.quantity);
        }, 0);

        await cart.save();

        // Populate edilmiş cart'ı döndür
        const populatedCart = await Cart.findById(cart._id).populate({
            path: 'items.productId',
            select: 'name price images description'
        });

        res.json({
            success: true,
            message: 'Ürün sepete eklendi',
            cart: populatedCart
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Ürün sepete eklenirken bir hata oluştu',
            error: error.message
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

        // Ürünü sepetten çıkar
        cart.items = cart.items.filter(item => item.productId.toString() !== req.params.productId);

        // Toplam fiyatı güncelle
        const populatedCart = await cart.populate({
            path: 'items.productId',
            select: 'price'
        });

        cart.total = populatedCart.items.reduce((total, item) => {
            return total + (item.productId.price * item.quantity);
        }, 0);
        
        await cart.save();

        // Güncel sepeti döndür
        const updatedCart = await Cart.findById(cart._id).populate({
            path: 'items.productId',
            select: 'name price images description'
        });
        
        res.json({
            success: true,
            message: 'Ürün sepetten çıkarıldı',
            cart: updatedCart
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Ürün sepetten çıkarılırken bir hata oluştu',
            error: error.message
        });
    }
});

// Sepetteki ürün miktarını güncelle
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
            // Miktar 0 ise ürünü sepetten çıkar
            cart.items = cart.items.filter(item => 
                item.productId.toString() !== req.params.productId
            );
        } else {
            // Miktarı güncelle
            cart.items[itemIndex].quantity = quantity;
        }

        // Toplam fiyatı güncelle
        const populatedCart = await cart.populate({
            path: 'items.productId',
            select: 'price'
        });

        cart.total = populatedCart.items.reduce((total, item) => {
            return total + (item.productId.price * item.quantity);
        }, 0);

        await cart.save();

        // Güncel sepeti döndür
        const updatedCart = await Cart.findById(cart._id).populate({
            path: 'items.productId',
            select: 'name price images description'
        });

        res.json({
            success: true,
            message: 'Sepet güncellendi',
            cart: updatedCart
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Sepet güncellenirken bir hata oluştu',
            error: error.message
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
            message: 'Sepet temizlenirken bir hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;
