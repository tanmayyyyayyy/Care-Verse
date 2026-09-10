// backend/routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { signup, login, getMe, logout, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'doctor', 'nurse']).withMessage('Invalid role'),
];
const loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/signup',          signupRules, signup);
router.post('/login',           loginRules,  login);
router.get( '/me',              protect,     getMe);
router.post('/logout',          protect,     logout);
router.patch('/update-password',protect,     updatePassword);

module.exports = router;
