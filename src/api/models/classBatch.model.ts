export {};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Main ClassBatch schema
const ClassBatchSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
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
    days: [
      {
        type: String,
        required: true
      }
    ],
    time: [
      {
        type: String,
        required: true
      }
    ],
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
      required: true
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
