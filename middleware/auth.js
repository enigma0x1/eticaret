const jwt = require('jsonwebtoken');
const Manufacturer = require('../models/Manufacturer');
const Professional = require('../models/Professional');
const BlacklistedToken = require('../models/BlacklistedToken');

// Genel auth middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Lütfen giriş yapın' });
        }

        // Token blacklist kontrolü
        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ message: 'Oturum sonlandırılmış' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user;

        if (decoded.userType === 'manufacturer') {
            user = await Manufacturer.findOne({ _id: decoded._id });
            req.userType = 'manufacturer';
        } else if (decoded.userType === 'professional') {
            user = await Professional.findOne({ _id: decoded._id });
            req.userType = 'professional';
        }

        if (!user) {
            throw new Error('Kullanıcı bulunamadı');
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Lütfen giriş yapın' });
    }
};

const verifyManufacturer = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Lütfen giriş yapın' });
        }

        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ message: 'Oturum sonlandırılmış' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.userType !== 'manufacturer') {
            return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
        }

        const manufacturer = await Manufacturer.findOne({ _id: decoded._id });

        if (!manufacturer) {
            throw new Error('Üretici bulunamadı');
        }

        req.token = token;
        req.manufacturer = manufacturer;
        req.user = manufacturer; // Bu satırı ekledik
        next();
    } catch (error) {
        res.status(401).json({ message: 'Lütfen giriş yapın' });
    }
};

const verifyProfessional = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Lütfen giriş yapın' });
        }

        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ message: 'Oturum sonlandırılmış' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.userType !== 'professional') {
            return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
        }

        const professional = await Professional.findOne({ _id: decoded._id });

        if (!professional) {
            throw new Error('Profesyonel bulunamadı');
        }

        req.token = token;
        req.professional = professional;
        req.user = professional; // Bu satırı ekledik
        next();
    } catch (error) {
        res.status(401).json({ message: 'Lütfen giriş yapın' });
    }
};

module.exports = { auth, verifyManufacturer, verifyProfessional };
