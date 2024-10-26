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
    businessArea: String,
    contactName: String,
    documents: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

manufacturerSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

manufacturerSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Manufacturer', manufacturerSchema);
