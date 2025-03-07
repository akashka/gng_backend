export {};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for days objects
const DaySchema = new Schema(
  {
    day_name: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
  },
  { _id: false }
);

// Schema for time objects
const TimeSchema = new Schema(
  {
    start_time: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

// Main ClassBatch schema
const ClassBatchSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    batchInfo: {
      type: String,
      required: true,
      trim: true
    },
    subjects: [
      {
        type: String,
        required: true
      }
    ],
    boards: [
      {
        type: String,
        required: true
      }
    ],
    classes: [
      {
        type: String,
        required: true
      }
    ],
    days: {
      type: [DaySchema],
      required: true,
      validate: [arrayMinLength, 'At least one day must be selected']
    },
    time: {
      type: [TimeSchema],
      required: true,
      validate: [arrayMinLength, 'At least one time slot must be selected']
    },
    fees: {
      type: Number,
      required: true,
      min: 100,
      max: 25000
    },
    maximumStudents: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
      default: 2
    },
    currentStudents: {
      type: Number,
      default: 0,
      min: 0
    },
    batchStartDate: {
      type: Date,
      required: true
    },
    lastEnrolDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value: Date) {
          // Ensure enrollment date is at least 7 days from today
          const minDate = new Date();
          minDate.setDate(minDate.getDate() + 7);
          return value >= minDate;
        },
        message: 'Last enrollment date must be at least 7 days from today'
      }
    },
    isActive: {
      type: Boolean,
      default: true
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
  {
    timestamps: true
  }
);

// Custom validator for array minimum length
function arrayMinLength(val: string | any[]) {
  return val.length > 0;
}

// Virtual for checking if batch is full
ClassBatchSchema.virtual('isFull').get(function () {
  return this.currentStudents >= this.maximumStudents;
});

// Virtual for checking if enrollment is still open
ClassBatchSchema.virtual('isEnrollmentOpen').get(function () {
  const today = new Date();
  return today <= this.lastEnrolDate && !this.isFull;
});

// Pre-save hook to update the updatedAt field
ClassBatchSchema.pre('save', function (next: () => void) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
ClassBatchSchema.index({ teacherId: 1 });
ClassBatchSchema.index({ subjects: 1 });
ClassBatchSchema.index({ boards: 1 });
ClassBatchSchema.index({ classes: 1 });
ClassBatchSchema.index({ isActive: 1 });
ClassBatchSchema.index({ batchStartDate: 1 });
ClassBatchSchema.index({ lastEnrolDate: 1 });

module.exports = mongoose.model('ClassBatch', ClassBatchSchema);
