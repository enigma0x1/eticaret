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
    tokens: [{ // Token array'i eklendi
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 86400 // 24 saat sonra otomatik silinir
        }
    }],
    isActive: { // Hesap durumu eklendi
        type: Boolean,
        default: true
    },
    lastLogin: { // Son giriş tarihi eklendi
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Password hash middleware
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

// Token ekleme metodu
manufacturerSchema.methods.addToken = async function(token) {
    this.tokens = this.tokens || [];
    this.tokens.push({ token });
    await this.save();
    return token;
};

// Token silme metodu
manufacturerSchema.methods.removeToken = async function(tokenToRemove) {
    this.tokens = this.tokens.filter(token => token.token !== tokenToRemove);
    await this.save();
};

// Tüm tokenleri silme metodu
manufacturerSchema.methods.removeAllTokens = async function() {
    this.tokens = [];
    await this.save();
};

// JSON dönüşümünde hassas verileri çıkar
manufacturerSchema.methods.toJSON = function() {
    const manufacturer = this.toObject();
    delete manufacturer.password;
    delete manufacturer.tokens;
    return manufacturer;
};

// Statik metodlar
manufacturerSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

manufacturerSchema.statics.findByTaxNumber = function(taxNumber) {
    return this.findOne({ taxNumber });
};

// Indexes
manufacturerSchema.index({ email: 1 });
manufacturerSchema.index({ taxNumber: 1 });
manufacturerSchema.index({ companyName: 1 });

const Manufacturer = mongoose.model('Manufacturer', manufacturerSchema);

module.exports = Manufacturer;
