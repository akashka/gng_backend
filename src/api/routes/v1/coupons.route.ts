const express = require('express');
const router = express.Router();
const couponController = require('../../controllers/coupons.controller');

// Public routes
router.post('/validate', couponController.validateCoupon);

router.post('/apply', couponController.applyCoupon);

// Admin routes
router.get('/', couponController.getAllCoupons);

router.get('/:id', couponController.getCouponById);

router.post('/', couponController.createCoupon);

router.put('/:id', couponController.updateCoupon);

router.delete('/:id', couponController.deleteCoupon);

router.patch('/:id/toggle', couponController.toggleCouponStatus);

module.exports = router;
