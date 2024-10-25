const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { 
        type: String, 
        required: true,
        get: function(image) {
            return `/uploads/${image}`;
        }
    },
    specs: [String],
    modelFormats: [String],
    stock: { type: Number, required: true },
    rating: { type: Number, default: 0 }
}, { 
    timestamps: true,
    toJSON: { getters: true }
});

module.exports = mongoose.model('Product', productSchema);
