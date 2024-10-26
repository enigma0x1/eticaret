// models/Manufacturer.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const manufacturerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    companyName: {
        type: String,
        required: true
    },
    taxNumber: {
        type: String,
        required: true,
        unique: true
    },
    address: String,
    phone: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Şifre hashleme
manufacturerSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Şifre karşılaştırma metodu
manufacturerSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Manufacturer', manufacturerSchema);
