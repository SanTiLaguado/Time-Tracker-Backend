// src/routes/authRoutes.js
const express = require('express');
const { body, header } = require('express-validator');
const AuthController = require('../controllers/authController');
const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = express.Router();

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  validate,
  AuthController.login
);

/**
 * POST /api/auth/register
 * Header: x-secret-key
 * Body: { name, email, password, role? }
 */
router.post(
  '/register',
  [
    header('x-secret-key').notEmpty().withMessage('Secret key header required'),
    body('name').notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min length 6'),
    body('role').optional().isIn(['admin','user']).withMessage('Invalid role')
  ],
  validate,
  AuthController.register
);

module.exports = router;
