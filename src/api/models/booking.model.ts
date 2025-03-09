export {};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookingSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      required: true
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'ClassBatch',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'paid', 'cancelled'],
      default: 'pending'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    classDays: {
      type: [String],
      required: true
    },
    classTimings: {
      type: [String],
      required: true
    },
    subjects: {
      type: [String],
      required: true
    },
    startingDate: {
      type: Date,
      required: true
    },
    fees: {
      type: Number,
      required: true
    },
    bookingType: {
      type: String,
      enum: ['classRoom', 'exam', 'courseMaterials'],
      default: 'classRoom'
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    acceptTNC: {
      type: Boolean,
      default: false
    },
    paymentDetails: {
      type: Object,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', BookingSchema);
