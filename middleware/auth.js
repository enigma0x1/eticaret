const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Token formatı geçersiz" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Token bulunamadı" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Geçersiz token" });
    }
};

const verifyManufacturer = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.userType === 'manufacturer') {
            next();
        } else {
            return res.status(403).json({ message: "Bu işlem için üretici yetkisi gerekli" });
        }
    });
};

module.exports = {
    verifyToken,
    verifyManufacturer
};
