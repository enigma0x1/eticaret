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
        required: true
    },
    diploma: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Şifre hashleme
professionalSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

module.exports = mongoose.model('Professional', professionalSchema);
