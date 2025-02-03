export {};
const express = require('express');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');
const router = express.Router();
const staticDataController = require('../../controllers/staticData.controller');

router.route('/').get(staticDataController.getValue);
router.route('/').post(authorize(ADMIN), staticDataController.upsertValue);

module.exports = router;
