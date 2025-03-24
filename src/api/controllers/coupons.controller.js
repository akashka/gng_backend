export {};
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Coupon = require('../models/coupons.model');
const User = require('../models/user.model'); // Assuming you have a User model

/**
 * Controller for validating and applying a coupon
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { couponCode, userId, orderAmount, subject, board, classId, teacher, batch } = req.body;

    if (!couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    if (!orderAmount || Number.isNaN(orderAmount) || orderAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid order amount is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    // Check if coupon is valid (active and within date range)
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is no longer valid',
        details: {
          isActive: coupon.isActive,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          currentDate: new Date()
        }
      });
    }

    // Check if coupon usage limit is reached
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its maximum usage limit'
      });
    }

    // Check if user has reached their per-user limit
    if (coupon.perUserLimit !== null) {
      // Assuming you have a CouponUsage collection or similar to track per-user usage
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // This is a simplified check. You might need to implement a more robust solution
      // depending on how you track coupon usage per user
      const userCouponUsage = await mongoose.model('CouponUsage').countDocuments({
        userId,
        couponId: coupon._id
      });

      if (userCouponUsage >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: `You've already used this coupon ${coupon.perUserLimit} times, which is the maximum allowed per user`
        });
      }
    }

    // Check if coupon is applicable to the order
    const criteria = {
      orderAmount,
      subject: subject || null,
      board: board || null,
      class: classId || null,
      teacher: teacher || null,
      batch: batch || null
    };

    if (!coupon.isApplicable(criteria)) {
      return res.status(400).json({
        success: false,
        message: 'This coupon cannot be applied to your order',
        details: {
          minOrderAmount: coupon.minOrderAmount,
          applicableTo: coupon.appliesTo
        }
      });
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(orderAmount);

    // Return the discount information
    return res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalAmount: orderAmount - discountAmount
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while validating the coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Apply a coupon (when order is confirmed)
 */
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, userId, orderId } = req.body;

    if (!couponCode || !userId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code, user ID, and order ID are required'
      });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    // Increment usage count
    coupon.usageCount += 1;
    await coupon.save();

    // Record usage for this user (for per-user limit tracking)
    await mongoose.model('CouponUsage').create({
      couponId: coupon._id,
      userId,
      orderId,
      usedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Coupon applied and recorded successfully'
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while applying the coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all coupons (for admin)
 */
exports.getAllCoupons = async (req, res) => {
  try {
    // const { page = 1, limit = 10, isActive, search } = req.query;

    // Build query
    // const query = {};

    // Filter by active status if provided
    // if (isActive !== undefined) {
    //   query.isActive = isActive === 'true';
    // }

    // Search by code or name
    // if (search) {
    //   query.$or = [{ code: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }];
    // }

    // Get total count for pagination
    // const total = await Coupon.countDocuments(query);

    // Get coupons with pagination
    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('appliesTo.subjects', 'name')
      .populate('appliesTo.boards', 'name')
      .populate('appliesTo.classes', 'name')
      .populate('appliesTo.teachers', 'name')
      .populate('appliesTo.batches', 'name');

    return res.status(200).json({
      success: true,
      data: coupons
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching coupons',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single coupon by ID (for admin)
 */
exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }

    const coupon = await Coupon.findById(id)
      .populate('createdBy', 'name email')
      .populate('appliesTo.subjects', 'name')
      .populate('appliesTo.boards', 'name')
      .populate('appliesTo.classes', 'name')
      .populate('appliesTo.teachers', 'name')
      .populate('appliesTo.batches', 'name');

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    return res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new coupon (for admin)
 */
exports.createCoupon = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      startDate,
      endDate,
      isActive,
      usageLimit,
      perUserLimit,
      appliesTo
    } = req.body;

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'A coupon with this code already exists'
      });
    }

    // Create new coupon
    const coupon = new Coupon({
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscountAmount || null,
      minOrderAmount: minOrderAmount || 0,
      startDate,
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || null,
      appliesTo: appliesTo || {
        subjects: [],
        boards: [],
        classes: [],
        teachers: [],
        batches: []
      },
      createdBy: req.user._id // Assuming req.user is set by authentication middleware
    });

    await coupon.save();

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);

    if (error.message === 'End date must be after start date') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating the coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a coupon (for admin)
 */
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      startDate,
      endDate,
      isActive,
      usageLimit,
      perUserLimit,
      appliesTo
    } = req.body;

    // Find coupon
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    // Check dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Update fields
    if (name) coupon.name = name;
    if (description !== undefined) coupon.description = description;
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
    if (startDate) coupon.startDate = startDate;
    if (endDate) coupon.endDate = endDate;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (perUserLimit !== undefined) coupon.perUserLimit = perUserLimit;
    if (appliesTo) {
      if (appliesTo.subjects) coupon.appliesTo.subjects = appliesTo.subjects;
      if (appliesTo.boards) coupon.appliesTo.boards = appliesTo.boards;
      if (appliesTo.classes) coupon.appliesTo.classes = appliesTo.classes;
      if (appliesTo.teachers) coupon.appliesTo.teachers = appliesTo.teachers;
      if (appliesTo.batches) coupon.appliesTo.batches = appliesTo.batches;
    }

    coupon.updatedAt = Date.now();

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a coupon (for admin)
 */
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Toggle coupon active status (for admin)
 */
exports.toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: coupon.isActive }
    });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while toggling coupon status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
