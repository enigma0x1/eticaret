// models/Professional.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const professionalSchema = new mongoose.Schema({
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
    fullName: {
        type: String,
        required: true
    },
    profession: {
        type: String,
        required: true,
        enum: ['Designer', 'Engineer', 'Architect', 'Other'] // Meslek seçenekleri
    },
    specialization: {
        type: String,
        required: true
    },
    experience: {
        type: Number, // Yıl olarak deneyim
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    portfolio: {
        type: String, // Portfolio URL
        required: false
    },
    certifications: [{
        name: String,
        issuer: String,
        year: Number
    }],
    skills: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    }
});

// Şifre hashleme
professionalSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Şifre karşılaştırma metodu
professionalSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Professional', professionalSchema);
