const express = require('express');
const router = express.Router();
const controller = require('../../controllers/classBatch.controller');

// Routes
// Get all batches with optional filtering
router.get('/', controller.getClassBatches);

// Get single batch by ID
router.get('/:id', controller.getClassBatchById);

// Create new batch (requires authentication)
router.post('/', controller.createClassBatch);

// Update batch (requires authentication)
router.put('/:id', controller.updateClassBatch);

// Delete batch (requires authentication)
router.delete('/:id', controller.deleteClassBatch);

// Get batches by teacher with enrollment info
router.get('/teacher/:teacherId/enrollment', controller.getTeacherBatchesWithEnrollment);

module.exports = router;
