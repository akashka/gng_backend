export {};
const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/booking.controller');

// Create booking - first stage
router.post('/', bookingController.createBooking);

// Update booking - second stage (frequency and TNC)
router.put('/stage-two/:id', bookingController.updateBookingStageTwo);

// Update booking - third stage (payment and status)
router.put('/stage-three/:id', bookingController.updateBookingStageThree);

// Get all bookings (admin and teachers)
router.get('/', bookingController.getAllBookings);

// Get single booking with populated data
router.get('/:id', bookingController.getBooking);

// Delete booking
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
