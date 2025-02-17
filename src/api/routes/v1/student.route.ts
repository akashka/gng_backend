export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/student.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/').get(controller.listStudents);
router.route('/').post(controller.createStudent);
router.route('/:studentId').get(controller.getStudent);
router.route('/:studentId').put(controller.updateStudent);

module.exports = router;
