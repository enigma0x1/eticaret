// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Manufacturer = require('../models/Manufacturer');
const Professional = require('../models/Professional');

// Üretici Girişi
router.post('/manufacturer/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const manufacturer = await Manufacturer.findOne({ email });
        if (!manufacturer) {
            return res.status(401).json({ 
                success: false,
                message: 'Böyle bir üretici hesabı bulunamadı' 
            });
        }

        const isMatch = await bcrypt.compare(password, manufacturer.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Hatalı şifre' 
            });
        }

        const token = jwt.sign(
            { 
                _id: manufacturer._id.toString(),
                userType: 'manufacturer'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            userType: 'manufacturer',
            user: {
                id: manufacturer._id,
                email: manufacturer.email,
                companyName: manufacturer.companyName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

// Profesyonel Girişi
router.post('/professional/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const professional = await Professional.findOne({ email });
        if (!professional) {
            return res.status(401).json({ 
                success: false,
                message: 'Böyle bir profesyonel hesabı bulunamadı' 
            });
        }

        const isMatch = await bcrypt.compare(password, professional.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Hatalı şifre' 
            });
        }

        const token = jwt.sign(
            { 
                _id: professional._id.toString(),
                userType: 'professional'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            userType: 'professional',
            user: {
                id: professional._id,
                email: professional.email,
                fullName: professional.fullName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

// Üretici Kaydı
router.post('/manufacturer/register', async (req, res) => {
    try {
        const { companyName, email, password, address, phone } = req.body;

        // Email kontrolü
        const existingManufacturer = await Manufacturer.findOne({ email });
        if (existingManufacturer) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu email adresi zaten kullanımda' 
            });
        }

        // Yeni üretici oluştur
        const manufacturer = new Manufacturer({
            companyName,
            email,
            password,
            address,
            phone
        });

        await manufacturer.save();

        const token = jwt.sign(
            { 
                _id: manufacturer._id.toString(),
                userType: 'manufacturer'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            userType: 'manufacturer',
            user: {
                id: manufacturer._id,
                email: manufacturer.email,
                companyName: manufacturer.companyName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

// Profesyonel Kaydı
router.post('/professional/register', async (req, res) => {
    try {
        const { fullName, email, password, profession } = req.body;

        // Email kontrolü
        const existingProfessional = await Professional.findOne({ email });
        if (existingProfessional) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu email adresi zaten kullanımda' 
            });
        }

        // Yeni profesyonel oluştur
        const professional = new Professional({
            fullName,
            email,
            password,
            profession
        });

        await professional.save();

        const token = jwt.sign(
            { 
                _id: professional._id.toString(),
                userType: 'professional'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            userType: 'professional',
            user: {
                id: professional._id,
                email: professional.email,
                fullName: professional.fullName
            },
            token
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası' 
        });
    }
});

module.exports = router;
