export {};
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getRates,
  getRate,
  createRate,
  updateRate,
  toggleRateStatus,
  deleteRate
} = require('../controllers/rateController');

// Validation rules
const rateValidation = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .custom((value: any) => {
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        throw new Error('Price can have maximum 2 decimal places');
      }
      return true;
    }),
  body('locationId').isMongoId().withMessage('Invalid location ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// Routes
router.route('/').get(getRates).post(rateValidation, createRate);

router.route('/:id').get(getRate).put(rateValidation, updateRate).delete(deleteRate);

router.patch('/:id/toggle-status', toggleRateStatus);

module.exports = router;
