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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.userType !== 'manufacturer') {
            return res.status(403).json({ 
                message: 'Bu sayfaya erişim yetkiniz yok. Sadece üreticiler erişebilir.' 
            });
        }

        const manufacturer = await Manufacturer.findOne({ _id: decoded._id });

        if (!manufacturer) {
            throw new Error();
        }

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.userType !== 'professional') {
            return res.status(403).json({ 
                message: 'Bu sayfaya erişim yetkiniz yok. Sadece profesyoneller erişebilir.' 
            });
        }

        const professional = await Professional.findOne({ _id: decoded._id });

        if (!professional) {
            throw new Error();
        }

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
        
        let user;
        if (decoded.userType === 'manufacturer') {
            user = await Manufacturer.findOne({ _id: decoded._id });
        } else if (decoded.userType === 'professional') {
            user = await Professional.findOne({ _id: decoded._id });
        }

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        req.userType = decoded.userType;
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
