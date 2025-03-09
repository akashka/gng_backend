export {};
import { NextFunction, Request, Response } from 'express';
const Booking = require('../models/booking.model');
const ClassBatch = require('../models/classBatch.model');
const Teacher = require('../models/teacher.model');
const Parent = require('../models/parent.model');
const Student = require('../models/student.model');
const mongoose = require('mongoose');

// Create a new booking (first stage)
exports.createBooking = async (req: Request, res: Response) => {
  try {
    // Check if batch exists and is active
    const batch = await ClassBatch.findById(req.body.batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Class batch not found' });
    }

    if (!batch.isActive) {
      return res.status(400).json({ success: false, message: 'Class batch is not active' });
    }

    // Create new booking with initial status pending
    const newBooking = new Booking(req.body);
    const booking = await newBooking.save();
    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update booking details (second stage - update frequency and TNC)
exports.updateBookingStageTwo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { frequency, acceptTNC } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.frequency = frequency;
    booking.acceptTNC = acceptTNC;

    const updatedBooking = await booking.save();

    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update booking details (third stage - payment details and status)
exports.updateBookingStageThree = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentDetails, status } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if status is being updated to 'paid'
    if (status === 'paid') {
      // Check batch conditions before updating
      const batch = await ClassBatch.findById(booking.batchId);
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Class batch not found' });
      }

      if (!batch.isActive) {
        return res.status(400).json({ success: false, message: 'Class batch is not active' });
      }

      if (batch.currentStudents >= batch.maximumStudents) {
        return res.status(400).json({ success: false, message: 'Class batch is already full' });
      }

      // Update batch's currentStudents count
      batch.currentStudents += 1;
      await batch.save();
    }

    booking.paymentDetails = paymentDetails;
    booking.status = status || booking.status;

    const updatedBooking = await booking.save();

    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all bookings
exports.getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find();
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get a single booking with populated references
exports.getBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('teacherId', 'name email profilePic qualifications experience')
      .populate('studentId', 'name age grade school')
      .populate('parentId', 'name email phone address')
      .populate('batchId', 'name description days time subjects maximumStudents currentStudents');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete a booking
exports.deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // If booking is paid, decrement the currentStudents count in the batch
    if (booking.status === 'paid') {
      const batch = await ClassBatch.findById(booking.batchId);
      if (batch && batch.currentStudents > 0) {
        batch.currentStudents -= 1;
        await batch.save();
      }
    }

    await booking.remove();

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
