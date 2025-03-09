export {};
import * as express from 'express';
import { apiJson } from '../../../api/utils/Utils';

const userRoutes = require('./user.route');
const authRoutes = require('./auth.route');
const uploadRoutes = require('./upload.route');
const teacherRoutes = require('./teacher.route');
const parentRoutes = require('./parent.route');
const studentRoutes = require('./student.route');
const questionsRoutes = require('./questions.route');
const staticDataRoutes = require('./staticData.route');
const feedbacksRoutes = require('./feedbacks.route');
const reviewsRatingsRoutes = require('./reviewsRatings.route');
const resourcesRoutes = require('./resources.route');
const ocrRoutes = require('./ocr.route');
const classBatchRoutes = require('./classBatch.route');
const bookingRoutes = require('./booking.route');

const router = express.Router();

/**
 * GET v1/status
 */
router.get('/status', (req, res, next) => {
  apiJson({ req, res, data: { status: 'OK' } });
  return next();
});

/**
 * GET v1/docs
 */
router.use('/docs', express.static('docs'));

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/teacher', teacherRoutes);
router.use('/parent', parentRoutes);
router.use('/student', studentRoutes);
router.use('/questions', questionsRoutes);
router.use('/staticdata', staticDataRoutes);
router.use('/feedbacks', feedbacksRoutes);
router.use('/reviewsratings', reviewsRatingsRoutes);
router.use('/resources', resourcesRoutes);
router.use('/ocr', ocrRoutes);
router.use('/classBatches', classBatchRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;
