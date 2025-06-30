export {};
const mongoose = require('mongoose');

// Bank details sub-schema
const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
      maxLength: [100, 'Bank name cannot exceed 100 characters']
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      uppercase: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid IFSC code (e.g., SBIN0123456)']
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
      maxLength: [100, 'Account holder name cannot exceed 100 characters']
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      match: [/^\d{9,18}$/, 'Account number must be between 9-18 digits']
    },
    accountType: {
      type: String,
      enum: ['savings', 'current', 'salary'],
      required: [true, 'Account type is required'],
      default: 'savings'
    },
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[\w.-]+@[\w.-]+$/, 'Please enter a valid UPI ID (e.g., user@paytm)'],
      default: null
    },
    branchName: {
      type: String,
      trim: true,
      maxLength: [100, 'Branch name cannot exceed 100 characters']
    },
    branchAddress: {
      type: String,
      trim: true,
      maxLength: [200, 'Branch address cannot exceed 200 characters']
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const employeeSchema = new mongoose.Schema(
  {
    profilePic: {
      type: String
    },
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
      match: [/^\d{12}$/, 'Please enter a valid Aadhaar number format (XXXX-XXXX-XXXX)']
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
    },
    bankDetails: {
      type: [bankDetailsSchema]
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

  // Ensure at least one bank account is set as primary if multiple accounts exist
  if (this.bankDetails && this.bankDetails.length > 0) {
    const primaryAccounts = this.bankDetails.filter((account: any) => account.isPrimary);

    // If no primary account is set, make the first one primary
    if (primaryAccounts.length === 0) {
      this.bankDetails[0].isPrimary = true;
    }
  }

  next();
});

// Index for better query performance
employeeSchema.index({ 'bankDetails.accountNumber': 1 });
employeeSchema.index({ 'bankDetails.ifscCode': 1 });

module.exports = mongoose.model('Employee', employeeSchema);
