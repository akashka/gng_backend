export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/ocr.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.post('/', controller.processImageOCR);

module.exports = router;
