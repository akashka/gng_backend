export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/questionpaper.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/generate').post(authorize(LOGGED_USER), controller.generateQuestionPaper);
router.route('/evaluate').post(authorize(LOGGED_USER), controller.evaluateQuestionPaper);

module.exports = router;
