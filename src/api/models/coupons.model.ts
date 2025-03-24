export {};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null
    },
    minOrderAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    usageLimit: {
      type: Number,
      default: null // null means unlimited
    },
    usageCount: {
      type: Number,
      default: 0
    },
    perUserLimit: {
      type: Number,
      default: null // null means unlimited
    },
    appliesTo: {
      subjects: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Subject'
        }
      ],
      boards: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Board'
        }
      ],
      classes: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Class'
        }
      ],
      teachers: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      batches: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Batch'
        }
      ]
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
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

// Index for faster coupon searches
CouponSchema.index({ code: 1 });
CouponSchema.index({ startDate: 1, endDate: 1 });
CouponSchema.index({ isActive: 1 });

// Pre-save hook to ensure dates are valid
CouponSchema.pre('save', function (next: any) {
  if (this.startDate > this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Method to check if coupon is valid for use
CouponSchema.methods.isValid = function () {
  const now = new Date();

  // Check if coupon is active and within date range
  if (!this.isActive || now < this.startDate || now > this.endDate) {
    return false;
  }

  // Check if usage limit is reached
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) {
    return false;
  }

  return true;
};

// Method to check if coupon is applicable to specific criteria
CouponSchema.methods.isApplicable = function (criteria: {
  orderAmount: number;
  subject: any;
  board: any;
  class: any;
  teacher: any;
  batch: any;
}) {
  // Check minimum order amount
  if (criteria.orderAmount < this.minOrderAmount) {
    return false;
  }

  // Check if specific filters are applied and match
  if (
    this.appliesTo.subjects.length > 0 &&
    (!criteria.subject || !this.appliesTo.subjects.includes(criteria.subject))
  ) {
    return false;
  }

  if (this.appliesTo.boards.length > 0 && (!criteria.board || !this.appliesTo.boards.includes(criteria.board))) {
    return false;
  }

  if (this.appliesTo.classes.length > 0 && (!criteria.class || !this.appliesTo.classes.includes(criteria.class))) {
    return false;
  }

  if (
    this.appliesTo.teachers.length > 0 &&
    (!criteria.teacher || !this.appliesTo.teachers.includes(criteria.teacher))
  ) {
    return false;
  }

  if (this.appliesTo.batches.length > 0 && (!criteria.batch || !this.appliesTo.batches.includes(criteria.batch))) {
    return false;
  }

  return true;
};

// Method to calculate discount amount
CouponSchema.methods.calculateDiscount = function (orderAmount: number) {
  let discountAmount = 0;

  if (this.discountType === 'PERCENTAGE') {
    discountAmount = (orderAmount * this.discountValue) / 100;

    // Apply maximum discount cap if specified
    if (this.maxDiscountAmount !== null && discountAmount > this.maxDiscountAmount) {
      discountAmount = this.maxDiscountAmount;
    }
  } else {
    // FLAT discount
    discountAmount = this.discountValue;
  }

  // Ensure discount doesn't exceed order amount
  return Math.min(discountAmount, orderAmount);
};

const Coupon = mongoose.model('Coupon', CouponSchema);

module.exports = Coupon;
