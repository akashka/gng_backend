export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/teacher.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/deactivate/:teacherId').put(controller.deactivateTeacher);
router.route('/').get(controller.listTeachers);
router.route('/verifyOtp').post(controller.verifyOtpTeacher);
router.route('/register').post(controller.createTeacher);
router.route('/getByUserId/:userId').get(controller.getTeacherByUserId);
router.route('/:teacherId').get(controller.getTeacher);
router.route('/updateStatus/:teacherId').put(controller.updateTeacherStatus);
router.route('/:teacherId').put(controller.updateTeacher);

module.exports = router;
