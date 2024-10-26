// middleware/auth.js
const jwt = require('jsonwebtoken');
const Manufacturer = require('../models/Manufacturer');
const Professional = require('../models/Professional');

// Üretici token doğrulama
const verifyManufacturer = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Lütfen giriş yapın' });
        }

        // Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Üretici kontrolü
        const manufacturer = await Manufacturer.findOne({ 
            _id: decoded._id,
            'tokens.token': token 
        });

        if (!manufacturer) {
            throw new Error();
        }

        // Request'e üretici ve token bilgilerini ekle
        req.token = token;
        req.manufacturer = manufacturer;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Lütfen üretici olarak giriş yapın' });
    }
};

// Profesyonel token doğrulama
const verifyProfessional = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Lütfen giriş yapın' });
        }

        // Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Profesyonel kontrolü
        const professional = await Professional.findOne({ 
            _id: decoded._id,
            'tokens.token': token 
        });

        if (!professional) {
            throw new Error();
        }

        // Request'e profesyonel ve token bilgilerini ekle
        req.token = token;
        req.professional = professional;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Lütfen profesyonel olarak giriş yapın' });
    }
};

// Her iki tip için de geçerli genel auth kontrolü
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Lütfen giriş yapın' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Önce üretici olarak kontrol et
        let user = await Manufacturer.findOne({ 
            _id: decoded._id,
            'tokens.token': token 
        });

        // Üretici değilse profesyonel olarak kontrol et
        if (!user) {
            user = await Professional.findOne({ 
                _id: decoded._id,
                'tokens.token': token 
            });
        }

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Lütfen giriş yapın' });
    }
};

module.exports = {
    verifyManufacturer,
    verifyProfessional,
    auth
};
