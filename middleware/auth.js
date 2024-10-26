// middleware/auth.js

const jwt = require('jsonwebtoken');
const Manufacturer = require('../models/Manufacturer');
const BlacklistedToken = require('../models/BlacklistedToken');

const verifyManufacturer = async (req, res, next) => {
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
        
        if (decoded.userType !== 'manufacturer') {
            return res.status(403).json({ 
                message: 'Bu sayfaya erişim yetkiniz yok' 
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
        res.status(401).json({ message: 'Lütfen giriş yapın' });
    }
};

module.exports = { verifyManufacturer };
