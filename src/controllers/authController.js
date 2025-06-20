const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

const MAX_ATTEMPTS = 2;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutos

const AuthController = {
  login: async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      // Verificar si la cuenta está bloqueada temporalmente
      if (user.failed_attempts >= MAX_ATTEMPTS && Date.now() - new Date(user.last_failed_at).getTime() < LOCK_TIME) {
        // Calcula el tiempo restante en milisegundos
        const remainingLockTimeMs = LOCK_TIME - (Date.now() - new Date(user.last_failed_at).getTime());
        const remainingLockTimeMinutes = Math.ceil(remainingLockTimeMs / 60000);
        return res.status(403).json({
          message: 'Cuenta bloqueada temporalmente. Intente más tarde.',
          lockTimeRemaining: remainingLockTimeMinutes
        });
      }

      // Verificar la contraseña con bcrypt.
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Incrementar el contador de intentos fallidos
        await userModel.incrementFailedAttempts(email);
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      // Reiniciar el contador de intentos en login exitoso
      await userModel.resetFailedAttempts(email);

      // Actualizar el último login (opcional)
      await userModel.updateLastLogin(email);

      // Incluir el rol en el payload.
      const payload = { userId: user.id, email: user.email, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

      res.json({ token });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ message: 'Error en el servidor' });
    }
  },

  // Endpoint de registro privado: solo se puede acceder si se envía la clave privada en el header.
  register: async (req, res) => {
    // Se espera que el header 'x-secret-key' contenga la clave privada
    const secretKey = req.headers['x-secret-key'];
    if (secretKey !== process.env.REGISTER_SECRET) {
      return res.status(403).json({ message: 'No autorizado para registrar usuarios' });
    }

    const { email, password, nombre, role } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ message: 'Email, contraseña y nombre son obligatorios' });
    }

    try {
      // Verificar si el usuario ya existe
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'El usuario ya existe' });
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      // Crea el usuario; si no se pasa un rol, se asigna "user" por defecto
      const newUser = await userModel.createUser({ email, password: hashedPassword, nombre, role });
      res.status(201).json({ message: 'Usuario registrado exitosamente', user: newUser });
    } catch (error) {
      console.error('Error en register:', error);
      if (error.message.includes('ya está registrado')) {
        return res.status(409).json({ message: 'El usuario ya existe' });
      }
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  }
};

module.exports = AuthController;