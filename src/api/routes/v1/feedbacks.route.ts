export {};
const express = require('express');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');
const router = express.Router();
const feedbacksController = require('../../controllers/feedbacks.controller');

router.route('/').get(authorize(ADMIN), feedbacksController.getValue);
router.route('/').post(feedbacksController.postValue);
router.route('/:uuid').put(authorize(ADMIN), feedbacksController.putValue);

module.exports = router;
