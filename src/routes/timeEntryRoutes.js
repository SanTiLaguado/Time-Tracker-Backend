// src/routes/timeEntryRoutes.js
const express = require('express');
const { body, query, param } = require('express-validator');
const TimeEntryController = require('../controllers/timeEntryController');
const { auth, admin } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = express.Router();

// Camper endpoints
router.post(
  '/time/check-in',
  auth,
  TimeEntryController.checkIn
);

router.patch(
  '/time/check-out',
  auth,
  [
    body('summary').notEmpty().withMessage('Summary is required')
  ],
  validate,
  TimeEntryController.checkOut
);

router.get(
  '/time/my',
  auth,
  [
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date')
  ],
  validate,
  TimeEntryController.myEntries
);

router.get(
  '/time/stats',
  auth,
  [
    query('range')
      .optional()
      .isIn(['today','week','month'])
      .withMessage('Range must be today, week, or month')
  ],
  validate,
  TimeEntryController.stats
);

// Admin endpoints
router.get(
  '/admin/time/pending',
  auth,
  admin,
  TimeEntryController.pending
);

router.patch(
  '/admin/time/:id/review',
  auth,
  admin,
  [
    param('id').isInt().withMessage('Invalid entry id'),
    body('action')
      .isIn(['APPROVE','REJECT'])
      .withMessage('Action must be APPROVE or REJECT')
  ],
  validate,
  TimeEntryController.review
);

module.exports = router;
