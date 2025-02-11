export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/teacherMapping.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/multiple').put(controller.insertMultipleMappings);

module.exports = router;
