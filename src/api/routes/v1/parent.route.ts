export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/parent.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/').get(controller.listParents);
router.route('/register').post(controller.createParent);
router.route('/verifyOtp').post(controller.verifyOtpParent);
router.route('/updatePassword').put(controller.updatePassword);
router.route('/:parentId').get(controller.getParent);
router.route('/:parentId').put(controller.updateParent);

module.exports = router;
