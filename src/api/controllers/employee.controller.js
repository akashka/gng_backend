const { validationResult } = require('express-validator');
const Employee = require('../models/employee.model');
const User = require('../models/user.model');
const Location = require('../models/location.model');

// Get all employees
const getAllEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      employeeType,
      locationId,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    if (employeeType) filter.employeeType = employeeType;
    if (locationId) filter.locationId = locationId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const employees = await Employee.find(filter)
      .populate('locationId', 'name city state')
      .populate('userId', 'username email role')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Employee.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Get single employee
const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('locationId', 'name city state address')
      .populate('userId', 'username email role lastLogin');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

// Create employee
const createEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check if location exists
    const location = await Location.findById(req.body.locationId);
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location'
      });
    }

    // Create employee
    const employee = new Employee(req.body);
    await employee.save();

    // Create user account for the employee
    const username = `${req.body.email.split('@')[0]}_${employee.employeeId}`;
    const defaultPassword = 'Welcome@123'; // You might want to generate this or send via email

    const user = new User({
      username,
      email: req.body.email,
      password: defaultPassword,
      role: 'employee',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      employeeId: employee._id
    });

    await user.save();

    // Update employee with user reference
    employee.userId = user._id;
    await employee.save();

    // Populate the response
    await employee.populate('locationId', 'name city state');
    await employee.populate('userId', 'username email role');

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee,
      userCredentials: {
        username: user.username,
        password: defaultPassword,
        message: 'Please share these credentials securely with the employee'
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error creating employee',
      error: error.message
    });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if location exists (if being updated)
    if (req.body.locationId) {
      const location = await Location.findById(req.body.locationId);
      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location'
        });
      }
    }

    const wasActive = employee.isActive;
    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('locationId', 'name city state')
      .populate('userId', 'username email role');

    // Update user status if employee status changed
    if (req.body.isActive !== undefined && wasActive !== req.body.isActive) {
      await User.findByIdAndUpdate(updatedEmployee.userId, { isActive: req.body.isActive });
    }

    // Update user email if employee email changed
    if (req.body.email && req.body.email !== employee.email) {
      await User.findByIdAndUpdate(updatedEmployee.userId, { email: req.body.email });
    }

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error updating employee',
      error: error.message
    });
  }
};

// Delete employee (soft delete - deactivate)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Soft delete - just deactivate
    employee.isActive = false;
    await employee.save();

    // Also deactivate the user account
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { isActive: false });
    }

    return res.status(200).json({
      success: true,
      message: 'Employee deactivated successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deactivating employee',
      error: error.message
    });
  }
};

// Toggle employee status
const toggleEmployeeStatus = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    employee.isActive = !employee.isActive;
    await employee.save();

    // Update user status as well
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { isActive: employee.isActive });
    }

    await employee.populate('locationId', 'name city state');
    await employee.populate('userId', 'username email role');

    return res.status(200).json({
      success: true,
      message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
      data: employee
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error toggling employee status',
      error: error.message
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus
};
