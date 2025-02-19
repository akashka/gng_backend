export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/user.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');
const { listUsers, createUser, replaceUser, updateUser } = require('../../validations/user.validation');

const router = express.Router();

/**
 * Load user when API with userId route parameter is hit
 */
router.param('userId', controller.load);

router.route('/').get(controller.list).post(controller.create);

router.route('/profile').get(controller.loggedIn);

router
  .route('/:userId')
  .get(controller.get)
  .put(controller.replace)
  .patch(authorize(LOGGED_USER), controller.update)
  .delete(authorize(LOGGED_USER), controller.remove);

module.exports = router;
