export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/teacher.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/deactivate/:teacherId').put(authorize(LOGGED_USER), controller.deactivateTeacher);
router.route('/').get(authorize(LOGGED_USER), controller.listTeachers);
router.route('/').post(authorize(LOGGED_USER), controller.createTeacher);
router.route('/:teacherId').get(authorize(LOGGED_USER), controller.getTeacher);
router.route('/:teacherId').put(authorize(LOGGED_USER), controller.updateTeacher);

module.exports = router;
