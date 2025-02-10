export {};
const express = require('express');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');
const router = express.Router();
const reviewsRatingsController = require('../../controllers/reviewsRatings.controller');

router.route('/').get(reviewsRatingsController.getValue);
router.route('/user/:id').get(reviewsRatingsController.getValueByUser);
router.route('/').post(reviewsRatingsController.postValue);
router.route('/:id').put(reviewsRatingsController.putValue);

module.exports = router;
