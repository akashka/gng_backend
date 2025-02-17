export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/parent.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/').get(controller.listParents);
router.route('/').post(controller.createParent);
router.route('/:parentId').get(controller.getParent);
router.route('/:parentId').put(controller.updateParent);

module.exports = router;
