// src/models/userModel.js
const pool = require('../config/db');

const UserModel = {
  /**
   * Fetches an active user by email, including failed-attempts data.
   * Returns null if not found.
   */
  getUserByEmail: async (email) => {
    try {
      const { data: rows } = await pool.query('CALL GetUserByEmail(?)', [email]);
      // rows is an array of result sets; first set is the SELECT result
      return rows[0] ? rows[0][0] : null;
    } catch (error) {
      throw new Error('Error fetching user: ' + error.message);
    }
  },

  /**
   * Increment failed login attempts and set last_failed_at.
   */
  incrementFailedAttempts: async (email) => {
    try {
      await pool.query(
        'UPDATE users SET failed_attempts = failed_attempts + 1, last_failed_at = UTC_TIMESTAMP() WHERE email = ?',
        [email]
      );
    } catch (error) {
      throw new Error('Error incrementing failed attempts: ' + error.message);
    }
  },

  /**
   * Reset failed login attempts after successful login.
   */
  resetFailedAttempts: async (email) => {
    try {
      await pool.query(
        'UPDATE users SET failed_attempts = 0, last_failed_at = NULL WHERE email = ?',
        [email]
      );
    } catch (error) {
      throw new Error('Error resetting failed attempts: ' + error.message);
    }
  },

  /**
   * Update last_login_at timestamp.
   */
  updateLastLogin: async (email) => {
    try {
      await pool.query('CALL UpdateLastLogin(?)', [email]);
      return true;
    } catch (error) {
      console.error('Error updating last login:', error);
      return false;
    }
  },

  /**
   * Create a new user via stored procedure.
   * Returns { id, name, email, role }.
   */
  createUser: async ({ name, email, password, role = 'user' }) => {
    try {
      const { data: rows } = await pool.query(
        'CALL CreateUser(?, ?, ?, ?)',
        [name, email, password, role]
      );
      // rows[0] is the SELECT result from the procedure
      return rows[0][0];
    } catch (error) {
      let msg = error.message;
      try {
        const payload = JSON.parse(error.message);
        if (payload.error?.message.includes('Email already registered')) {
          msg = 'Email already registered';
        }
      } catch {}
      throw new Error('Error creating user: ' + msg);
    }
  }
};

module.exports = UserModel;
