// src/models/userModel.js
const pool = require('../config/db');

const UserModel = {
  /**
   * Obtiene un usuario activo por email, con sus campos de control de intentos.
   */
  getUserByEmail: async (email) => {
    try {
      const [resultSets] = await pool.query('CALL ObtenerUsuarioPorEmail(?)', [email]);
      // resultSets[0] contiene la primera fila del SELECT
      return resultSets[0] || null;
    } catch (error) {
      throw new Error('Error al obtener usuario: ' + error.message);
    }
  },

  /**
   * Incrementa el contador de intentos fallidos y registra la fecha del último intento.
   */
  incrementFailedAttempts: async (email) => {
    try {
      await pool.query(
        'UPDATE usuario SET failed_attempts = failed_attempts + 1, last_failed_at = UTC_TIMESTAMP() WHERE email = ?',
        [email]
      );
    } catch (error) {
      throw new Error('Error al incrementar intentos fallidos: ' + error.message);
    }
  },

  /**
   * Reinicia el contador de intentos fallidos tras un login exitoso.
   */
  resetFailedAttempts: async (email) => {
    try {
      await pool.query(
        'UPDATE usuario SET failed_attempts = 0, last_failed_at = NULL WHERE email = ?',
        [email]
      );
    } catch (error) {
      throw new Error('Error al reiniciar intentos fallidos: ' + error.message);
    }
  },

  /**
   * Actualiza la fecha del último login del usuario.
   */
  updateLastLogin: async (email) => {
    try {
      await pool.query('CALL ActualizarUltimoLogin(?)', [email]);
      return true;
    } catch (error) {
      console.error('Error al actualizar último login:', error);
      return false;
    }
  },

  /**
   * Crea un nuevo usuario usando el procedimiento almacenado CrearUsuario.
   * Devuelve { id, nombre, email, role }.
   */
  createUser: async ({ nombre, email, password, role = 'user' }) => {
    try {
      const [resultSets] = await pool.query(
        'CALL CrearUsuario(?, ?, ?, ?)',
        [nombre, email, password, role]
      );
      return resultSets[0];
    } catch (error) {
      if (error.message.includes('ya está registrado')) {
        throw new Error('El email ya está registrado');
      }
      throw new Error('Error al crear usuario: ' + error.message);
    }
  }
};

module.exports = UserModel;
