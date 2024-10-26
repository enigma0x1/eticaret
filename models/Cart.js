const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userType'  // Dinamik referans için refPath kullanıyoruz
    },
    userType: {
        type: String,
        required: true,
        enum: ['Manufacturer', 'Professional']  // Sadece bu iki tip kullanıcı olabilir
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    total: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Middleware to update lastUpdated
cartSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Middleware to update total
cartSchema.pre('save', async function(next) {
    if (this.items && this.items.length > 0) {
        this.total = this.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
    } else {
        this.total = 0;
    }
    next();
});

// Virtual for item count
cartSchema.virtual('itemCount').get(function() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Instance method to add item
cartSchema.methods.addItem = async function(productId, quantity, price) {
    const existingItem = this.items.find(item => 
        item.productId.toString() === productId.toString()
    );

    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.price = price; // Update price in case it changed
    } else {
        this.items.push({
            productId,
            quantity,
            price
        });
    }

    return this.save();
};

// Instance method to remove item
cartSchema.methods.removeItem = async function(productId) {
    this.items = this.items.filter(item => 
        item.productId.toString() !== productId.toString()
    );
    return this.save();
};

// Instance method to update item quantity
cartSchema.methods.updateItemQuantity = async function(productId, quantity) {
    const item = this.items.find(item => 
        item.productId.toString() === productId.toString()
    );

    if (!item) {
        throw new Error('Ürün sepette bulunamadı');
    }

    if (quantity <= 0) {
        return this.removeItem(productId);
    }

    item.quantity = quantity;
    return this.save();
};

// Instance method to clear cart
cartSchema.methods.clear = async function() {
    this.items = [];
    return this.save();
};

// Static method to find user's active cart
cartSchema.statics.findActiveCart = async function(userId, userType) {
    return this.findOne({
        userId,
        userType,
        status: 'active'
    }).populate('items.productId');
};

// Indexes for better query performance
cartSchema.index({ userId: 1, userType: 1, status: 1 });
cartSchema.index({ 'items.productId': 1 });
cartSchema.index({ createdAt: 1 });
cartSchema.index({ lastUpdated: 1 });

const Cart = mongoose.model('Cart', cartSchema);

// Ensure indexes are created
Cart.createIndexes().catch(err => {
    console.error('Error creating cart indexes:', err);
});

module.exports = Cart;
