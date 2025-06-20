// src/models/timeEntryModel.js
const pool = require('../config/db');

const TimeEntryModel = {
  /**
   * Crea una nueva entrada (check-in) para el usuario.
   * @param {number} userId 
   */
  openEntry: async (userId) => {
    try {
      const sql = `
        INSERT INTO time_entries (user_id, check_in)
        VALUES (?, UTC_TIMESTAMP())
      `;
      const [result] = await pool.query(sql, [userId]);
      return result.insertId;
    } catch (err) {
      throw new Error('Error al abrir entrada: ' + err.message);
    }
  },

  /**
   * Cierra la entrada abierta (check-out) y añade el resumen.
   * @param {number} userId 
   * @param {string} summary 
   * @returns {boolean} true si se actualizó
   */
  closeEntry: async (userId, summary) => {
    try {
      const sql = `
        UPDATE time_entries
           SET check_out = UTC_TIMESTAMP(),
               summary   = ?,
               status    = 'PENDING'
         WHERE user_id  = ?
           AND check_out IS NULL
      `;
      const [result] = await pool.query(sql, [summary, userId]);
      return result.affectedRows > 0;
    } catch (err) {
      throw new Error('Error al cerrar entrada: ' + err.message);
    }
  },

  /**
   * Devuelve true si el usuario tiene una entrada sin checkout (abierta).
   * @param {number} userId
   */
  hasOpenEntry: async (userId) => {
    try {
      const sql = `
        SELECT 1
          FROM time_entries
         WHERE user_id = ?
           AND check_out IS NULL
         LIMIT 1
      `;
      const [rows] = await pool.query(sql, [userId]);
      return rows.length > 0;
    } catch (err) {
      throw new Error('Error comprobando entrada abierta: ' + err.message);
    }
  },

  /**
   * Obtiene todas las entradas de un usuario, opcionalmente filtradas por rango de fechas.
   * @param {number} userId 
   * @param {string} [from] fecha ISO (inclusive)
   * @param {string} [to]   fecha ISO (inclusive)
   */
  getMyEntries: async (userId, from, to) => {
    try {
      let sql = `
        SELECT *
          FROM time_entries
         WHERE user_id = ?
      `;
      const params = [userId];

      if (from && to) {
        sql += ' AND check_in BETWEEN ? AND ?';
        params.push(from, to);
      }

      sql += ' ORDER BY check_in DESC';
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      throw new Error('Error al obtener entradas: ' + err.message);
    }
  },

  /**
   * Suma las horas aprobadas en un rango de fechas dado.
   * @param {number} userId 
   * @param {string} start ISO date/time
   * @param {string} end   ISO date/time
   * @returns {number} total de horas (decimal)
   */
  getStats: async (userId, start, end) => {
    try {
      const sql = `
        SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, check_in, check_out)),0) / 3600 AS hours
          FROM time_entries
         WHERE user_id  = ?
           AND status   = 'APPROVED'
           AND check_in >= ?
           AND check_out <= ?
      `;
      const [rows] = await pool.query(sql, [userId, start, end]);
      return parseFloat(rows[0].hours);
    } catch (err) {
      throw new Error('Error al calcular estadísticas: ' + err.message);
    }
  },

  /**
   * Recupera todas las entradas pendientes de revisión.
   */
  getPendingEntries: async () => {
    try {
      const sql = `
        SELECT te.*,
               u.name AS user_name
          FROM time_entries te
          JOIN users u ON u.id = te.user_id
         WHERE te.status = 'PENDING'
         ORDER BY te.check_in DESC
      `;
      const [rows] = await pool.query(sql);
      return rows;
    } catch (err) {
      throw new Error('Error al obtener pendientes: ' + err.message);
    }
  },

  /**
   * Aprueba o rechaza una entrada.
   * @param {number} entryId 
   * @param {number} reviewerId 
   * @param {'APPROVE'|'REJECT'} action 
   * @returns {boolean} true si se actualizó
   */
  reviewEntry: async (entryId, reviewerId, action) => {
    try {
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const sql = `
        UPDATE time_entries
           SET status      = ?,
               reviewer_id = ?
         WHERE id = ?
           AND status = 'PENDING'
      `;
      const [result] = await pool.query(sql, [newStatus, reviewerId, entryId]);
      return result.affectedRows > 0;
    } catch (err) {
      throw new Error('Error al revisar entrada: ' + err.message);
    }
  }
};

module.exports = TimeEntryModel;
