export {};
import * as express from 'express';
import { apiJson } from '../../../api/utils/Utils';

const userRoutes = require('./user.route');
const authRoutes = require('./auth.route');
const uploadRoutes = require('./upload.route');
const teacherRoutes = require('./teacher.route');
const questionsRoutes = require('./questions.route');
const staticDataRoutes = require('./staticData.route');
const feedbacksRoutes = require('./feedbacks.route');

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
router.use('/questions', questionsRoutes);
router.use('/staticdata', staticDataRoutes);
router.use('/feedbacks', feedbacksRoutes);

module.exports = router;
