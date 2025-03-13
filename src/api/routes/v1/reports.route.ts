export {};
const express = require('express');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');
const router = express.Router();
const controller = require('../../controllers/reports.controller');

router.route('/').get(controller.getReports);

module.exports = router;
