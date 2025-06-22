export {};
const express = require('express');
const router = express.Router();
const {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  toggleLocationStatus,
  getLocationStats
} = require('../../controllers/location.controller');

// GET /api/locations/stats - Get statistics (must be before /:id route)
router.get('/stats', getLocationStats);

// GET /api/locations - Get all locations with query params
router.get('/', getLocations);

// GET /api/locations/:id - Get single location
router.get('/:id', getLocation);

// POST /api/locations - Create new location
router.post('/', createLocation);

// PUT /api/locations/:id - Update location
router.put('/:id', updateLocation);

// DELETE /api/locations/:id - Delete location
router.delete('/:id', deleteLocation);

// PATCH /api/locations/:id/toggle-status - Toggle location status
router.patch('/:id/toggle-status', toggleLocationStatus);

module.exports = router;
