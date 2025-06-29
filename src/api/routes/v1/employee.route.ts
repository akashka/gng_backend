export {};
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus
} = require('../../controllers/employee.controller');

// Validation middleware
const employeeValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),

  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('aadhaar')
    .matches(/^\d{12}/)
    .withMessage('Please provide a valid Aadhaar number (XXXXXXXXXXXX)'),

  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Please provide a valid blood group'),

  body('employeeType')
    .isIn(['full-time', 'contractor'])
    .withMessage('Employee type must be either full-time or contractor'),

  body('locationId').isMongoId().withMessage('Please provide a valid location ID')
];

router.get('/', getAllEmployees);
router.get('/:id', getEmployee);
router.post('/', employeeValidation, createEmployee);
router.put('/:id', employeeValidation, updateEmployee);
router.delete('/:id', deleteEmployee);
router.patch('/:id/toggle-status', toggleEmployeeStatus);

module.exports = router;
