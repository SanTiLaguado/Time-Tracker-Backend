const express = require("express");
const authController = require("../controllers/authController");
const { check, validationResult } = require('express-validator');

const router = express.Router();

router.post('/login', [
    check('email').isEmail().withMessage('Debe ser un email válido'),
    check('password').notEmpty().withMessage('La contraseña es obligatoria'),
  ], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    authController.login(req, res);
  });
  
router.post('/private/register', authController.register);

module.exports = router;
