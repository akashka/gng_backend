/* eslint-disable consistent-return */
const { validationResult } = require('express-validator');
const Rate = require('../models/rate.model');
const Location = require('../models/location.model');

// @desc    Get all rates with filtering, sorting, and pagination
// @route   GET /api/rates
// @access  Public
const getRates = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, locationId, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter object
    const filter = {};

    if (search) {
      filter.$or = [{ description: { $regex: search, $options: 'i' } }];
    }

    if (locationId) {
      filter.locationId = locationId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with population
    // eslint-disable-next-line newline-per-chained-call
    const rates = await Rate.find(filter).populate('location', 'name code').sort(sort).skip(skip).limit(limit).lean();

    // Get total count for pagination
    const total = await Rate.countDocuments(filter);

    // Transform data to match frontend expectations
    const transformedRates = rates.map((rate) => ({
      id: rate._id,
      description: rate.description,
      price: rate.price,
      locationId: rate.locationId,
      locationName: rate.location.name || 'Unknown',
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt
    }));

    res.json({
      success: true,
      data: transformedRates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single rate by ID
// @route   GET /api/rates/:id
// @access  Public
// eslint-disable-next-line consistent-return
const getRate = async (req, res, next) => {
  try {
    const rate = await Rate.findById(req.params.id).populate('location', 'name code');

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }

    const transformedRate = {
      id: rate._id,
      description: rate.description,
      price: rate.price,
      locationId: rate.locationId,
      locationName: rate.location.name || 'Unknown',
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt
    };

    res.json({
      success: true,
      data: transformedRate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new rate
// @route   POST /api/rates
// @access  Public
// eslint-disable-next-line consistent-return
const createRate = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { description, price, locationId, isActive = true } = req.body;

    // Verify location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID'
      });
    }

    // Create rate
    const rate = await Rate.create({
      description,
      price,
      locationId,
      isActive
    });

    // Populate location data
    await rate.populate('location', 'name code');

    const transformedRate = {
      id: rate._id,
      description: rate.description,
      price: rate.price,
      locationId: rate.locationId,
      locationName: rate.location.name || 'Unknown',
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt
    };

    res.status(201).json({
      success: true,
      data: transformedRate,
      message: 'Rate created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update rate
// @route   PUT /api/rates/:id
// @access  Public
// eslint-disable-next-line consistent-return
const updateRate = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { description, price, locationId, isActive } = req.body;

    // Check if rate exists
    let rate = await Rate.findById(req.params.id);
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }

    // Verify location exists if locationId is being updated
    if (locationId && locationId !== rate.locationId.toString()) {
      const location = await Location.findById(locationId);
      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location ID'
        });
      }
    }

    // Update rate
    rate = await Rate.findByIdAndUpdate(
      req.params.id,
      {
        description,
        price,
        locationId,
        isActive,
        updatedBy: 'system' // In real app, get from auth
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('location', 'name code');

    const transformedRate = {
      id: rate._id,
      description: rate.description,
      price: rate.price,
      locationId: rate.locationId,
      locationName: rate.location.name || 'Unknown',
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt
    };

    res.json({
      success: true,
      data: transformedRate,
      message: 'Rate updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle rate status (activate/deactivate)
// @route   PATCH /api/rates/:id/toggle-status
// @access  Public
const toggleRateStatus = async (req, res, next) => {
  try {
    const rate = await Rate.findById(req.params.id);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }

    rate.isActive = !rate.isActive;
    rate.updatedBy = 'system'; // In real app, get from auth
    await rate.save();

    await rate.populate('location', 'name code');

    const transformedRate = {
      id: rate._id,
      description: rate.description,
      price: rate.price,
      locationId: rate.locationId,
      locationName: rate.location.name || 'Unknown',
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt
    };

    res.json({
      success: true,
      data: transformedRate,
      message: `Rate ${rate.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete rate
// @route   DELETE /api/rates/:id
// @access  Public
const deleteRate = async (req, res, next) => {
  try {
    const rate = await Rate.findById(req.params.id);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }

    await Rate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Rate deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRates,
  getRate,
  createRate,
  updateRate,
  toggleRateStatus,
  deleteRate
};
