// src/controllers/timeEntryController.js
const TimeEntryModel = require('../models/timeEntryModel');
const { dateRange } = require('../utils/dateRanges');

const TimeEntryController = {
  /**
   * POST /api/time/check-in
   * Creates a new open time entry for the authenticated user.
   */
  checkIn: async (req, res) => {
    try {
      const userId = req.user.id;

      // 1) Validar que NO haya una entrada abierta
      const hasOpen = await TimeEntryModel.hasOpenEntry(userId);
      if (hasOpen) {
        return res.status(400).json({ message: 'Ya existe una sesión abierta.' });
      }

      // 2) Abrir nueva entrada
      const entryId = await TimeEntryModel.openEntry(userId);
      return res.status(201).json({ message: 'Check-in registrado', entryId });
    } catch (err) {
      console.error('Check-in error:', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  },

  /**
   * PATCH /api/time/check-out
   * Closes the open entry and saves the summary.
   */
  checkOut: async (req, res) => {
    const { summary } = req.body;
    if (!summary) {
      return res.status(400).json({ message: 'Resumen es obligatorio' });
    }

    try {
      const userId = req.user.id;

      // 1) Validar que haya una entrada abierta
      const hasOpen = await TimeEntryModel.hasOpenEntry(userId);
      if (!hasOpen) {
        return res.status(400).json({ message: 'No hay una sesión abierta para cerrar.' });
      }

      // 2) Cerrar la entrada
      const success = await TimeEntryModel.closeEntry(userId, summary);
      if (!success) {
        return res.status(400).json({ message: 'No se pudo cerrar la sesión.' });
      }
      return res.json({ message: 'Check-out registrado, pendiente de aprobación' });
    } catch (err) {
      console.error('Check-out error:', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  },

  /**
   * GET /api/time/my
   * Returns all entries for the authenticated user, optionally filtered by date range.
   */
  myEntries: async (req, res) => {
    const { from, to } = req.query;
    try {
      const userId = req.user.id;
      const entries = await TimeEntryModel.getMyEntries(userId, from, to);
      return res.json(entries);
    } catch (err) {
      console.error('Fetch entries error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/time/stats?range={today|week|month}
   * Returns total approved hours for the specified range.
   */
  stats: async (req, res) => {
    const range = req.query.range || 'week';
    try {
      const userId = req.user.id;
      const { start, end } = dateRange(range);
      const hours = await TimeEntryModel.getStats(
        userId,
        start.toISOString(),
        end.toISOString()
      );
      return res.json({ hours, range });
    } catch (err) {
      console.error('Stats error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/admin/time/pending
   * Returns all time entries with status 'PENDING'.
   */
  pending: async (req, res) => {
    try {
      const entries = await TimeEntryModel.getPendingEntries();
      return res.json(entries);
    } catch (err) {
      console.error('Fetch pending entries error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * PATCH /api/admin/time/:id/review
   * Approves or rejects a pending entry.
   * Body: { action: 'APPROVE' | 'REJECT' }
   */
  review: async (req, res) => {
    const entryId = parseInt(req.params.id, 10);
    const { action } = req.body;
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    try {
      const reviewerId = req.user.id;
      const success = await TimeEntryModel.reviewEntry(entryId, reviewerId, action);
      if (!success) {
        return res.status(404).json({ message: 'Entry not found or already reviewed' });
      }
      return res.json({ message: `Entry ${action.toLowerCase()}d` });
    } catch (err) {
      console.error('Review error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = TimeEntryController;
