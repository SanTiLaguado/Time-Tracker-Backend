// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

/**
 * auth: verifica el token JWT, carga el usuario y comprueba que esté activo.
 */
async function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied, token missing' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Buscamos al usuario por email (el procedimiento GetUserByEmail sólo devuelve activos)
    const user = await userModel.getUserByEmail(payload.email);
    if (!user) {
      return res.status(403).json({ message: 'User inactive or not found' });
    }

    // Cargamos los datos relevantes en req.user
    req.user = {
      id:    user.id,
      email: user.email,
      role:  user.role
    };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(403).json({ message: 'Invalid token or user inactive' });
  }
}

/**
 * requireRoles: asegura que req.user.role esté entre los permitidos.
 */
function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient rights' });
    }
    next();
  };
}

// Middleware específico para administradores
const admin = requireRoles(['admin']);

module.exports = { auth, requireRoles, admin };
