export {};
const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Rate description is required'],
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function (value: number) {
          return Number(value.toFixed(2)) === value;
        },
        message: 'Price can have maximum 2 decimal places'
      }
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Location is required']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: String,
      default: 'system'
    },
    updatedBy: {
      type: String,
      default: 'system'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for location details
rateSchema.virtual('location', {
  ref: 'Location',
  localField: 'locationId',
  foreignField: '_id',
  justOne: true
});

// Index for better query performance
rateSchema.index({ description: 1 });
rateSchema.index({ price: 1 });
rateSchema.index({ locationId: 1 });
rateSchema.index({ isActive: 1 });
rateSchema.index({ createdAt: -1 });

// Pre-save middleware to round price to 2 decimal places
rateSchema.pre('save', function (next: any) {
  if (this.price) {
    this.price = Math.round(this.price * 100) / 100;
  }
  next();
});

module.exports = mongoose.model('Rate', rateSchema);
