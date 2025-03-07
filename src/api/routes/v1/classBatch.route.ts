const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const controller = require('../controllers/classBatch.controller');
const authMiddleware = require('../middleware/auth');

// Validation middleware
const validateClassBatch = [
  check('teacherId', 'Teacher ID is required').notEmpty(),
  check('batchInfo', 'Batch information is required').notEmpty(),
  check('subjects', 'At least one subject is required').isArray({ min: 1 }),
  check('boards', 'At least one education board is required').isArray({ min: 1 }),
  check('classes', 'At least one class is required').isArray({ min: 1 }),
  check('days', 'At least one day is required').isArray({ min: 1 }),
  check('time', 'At least one time slot is required').isArray({ min: 1 }),
  check('fees', 'Fee must be between 100 and 25000').isInt({ min: 100, max: 25000 }),
  check('maximumStudents', 'Maximum students must be 1 or 2').isInt({ min: 1, max: 2 }),
  check('batchStartDate', 'Batch start date is required').notEmpty(),
  check('lastEnrolDate', 'Last enrollment date is required').notEmpty()
];

// Routes
// Get all batches with optional filtering
router.get('/', controller.getClassBatches);

// Get single batch by ID
router.get('/:id', controller.getClassBatchById);

// Create new batch (requires authentication)
router.post('/', validateClassBatch, controller.createClassBatch);

// Update batch (requires authentication)
router.put('/:id', controller.updateClassBatch);

// Delete batch (requires authentication)
router.delete('/:id', controller.deleteClassBatch);

// Get batches by teacher with enrollment info
router.get('/teacher/:teacherId/enrollment', controller.getTeacherBatchesWithEnrollment);

module.exports = router;
