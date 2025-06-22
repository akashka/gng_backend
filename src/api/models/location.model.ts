export {};
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      maxlength: [100, 'Location name cannot exceed 100 characters']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      match: [/^\d{5}(-\d{4})?$/, 'Please provide a valid ZIP code']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [50, 'Country name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[\d\s\-\(\)]+$/, 'Please provide a valid phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    metadata: {
      timezone: String,
      region: String,
      notes: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

locationSchema.index({ name: 1 });
locationSchema.index({ city: 1, state: 1 });
locationSchema.index({ status: 1 });
locationSchema.index({ createdAt: -1 });

// Virtual for full address
locationSchema.virtual('fullAddress').get(function () {
  return `${this.address}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
});

// Pre-save middleware
locationSchema.pre('save', function (next: () => void) {
  // Convert city and state to title case
  this.city = this.city.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  this.state = this.state.toUpperCase();
  next();
});

// Static methods
locationSchema.statics.findByStatus = function (status: any) {
  return this.find({ status });
};

locationSchema.statics.findByCity = function (city: string | RegExp) {
  return this.find({ city: new RegExp(city, 'i') });
};

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
