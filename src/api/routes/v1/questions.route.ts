export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/questionpaper.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/generate').post(controller.generateQuestionPaper);
router.route('/evaluate').post(controller.evaluateQuestionPaper);

module.exports = router;
