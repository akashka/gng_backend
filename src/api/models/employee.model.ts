export {};
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    aadhaar: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      unique: true,
      match: [/^\d{4}-\d{4}-\d{4}$/, 'Please enter a valid Aadhaar number format (XXXX-XXXX-XXXX)']
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: null
    },
    address: {
      type: String,
      maxLength: [500, 'Address cannot exceed 500 characters']
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Location is required']
    },
    employeeType: {
      type: String,
      enum: ['full-time', 'contractor'],
      required: [true, 'Employee type is required'],
      default: 'full-time'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    employeeId: {
      type: String,
      unique: true
    },
    dateOfJoining: {
      type: Date,
      default: Date.now
    },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative']
    },
    department: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Generate employee ID before saving
employeeSchema.pre('save', async function (next: () => void) {
  if (!this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
