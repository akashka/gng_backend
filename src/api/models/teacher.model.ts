export {};
const mongoose = require('mongoose');
import { transformData, listData } from '../../api/utils/ModelUtils';

const teacherBankDetailsSchema = new mongoose.Schema({
  accountHolderName: {
    type: String,
    required: [true, 'Account holder name is required'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true,
    validate: {
      validator: function (value: string) {
        return /^\d{9,18}$/.test(value);
      },
      message: 'Please enter a valid account number'
    }
  },
  ifscCode: {
    type: String,
    required: [true, 'IFSC code is required'],
    trim: true,
    uppercase: true,
    validate: {
      validator: function (value: string) {
        return /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(value);
      },
      message: 'Please enter a valid IFSC code'
    }
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  branchName: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['savings', 'current'],
    lowercase: true
  }
});

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      minlength: [2, 'Name must be at least 2 characters long'],
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    dob: {
      type: Date,
      validate: {
        validator: function (value: string | number | Date) {
          const today = new Date();
          const birthDate = new Date(value);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age >= 18;
        },
        message: 'Teacher must be at least 18 years old'
      }
    },
    address: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      validate: {
        validator: function (value: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Please enter a valid email address'
      }
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true,
      index: true,
      validate: {
        validator: function (value: string) {
          return /^\+\d{1,4}\d{10}$/.test(value);
        },
        message: 'Please enter a valid phone number with country code (e.g., +911234567890)'
      }
    },
    profession: {
      type: String,
      trim: true
    },
    highestQualification: {
      type: String,
      trim: true
    },
    experienceInMonths: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
      max: [300, 'Experience cannot exceed 300 months']
    },
    languagesKnown: {
      type: [String],
      validate: {
        validator: function (value: string | any[]) {
          return value.length >= 1;
        },
        message: 'At least one language must be specified'
      }
    },
    marksheetImage: {
      type: String,
      trim: true
    },
    aadhaarImage: {
      type: String,
      trim: true
    },
    panCardImage: {
      type: String,
      trim: true
    },
    gstImage: {
      type: String,
      trim: true
    },
    profileImage: {
      type: String,
      trim: true
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function (value: string) {
          return /^\d{12}$/.test(value);
        },
        message: 'Please enter a valid 12-digit Aadhaar number'
      }
    },
    panCardNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value: string) {
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
        },
        message: 'Please enter a valid PAN card number'
      }
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value: string) {
          if (!value) return true; // Optional field
          return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
        },
        message: 'Please enter a valid GST number'
      }
    },
    educationBoard: {
      type: [String],
      validate: {
        validator: function (value: string | any[]) {
          return value.length >= 1;
        },
        message: 'At least one education board must be specified'
      }
    },
    educationClass: {
      type: [String],
      validate: {
        validator: function (value: string | any[]) {
          return value.length >= 1;
        },
        message: 'At least one education class must be specified'
      }
    },
    subjects: {
      type: [String],
      validate: {
        validator: function (value: string | any[]) {
          return value.length >= 1;
        },
        message: 'At least one subject must be specified'
      }
    },
    daysOfWeek: {
      type: [String],
      validate: {
        validator: function (value: any[]) {
          return (
            value.length >= 1 &&
            value.every((day: string) =>
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day.toLowerCase())
            )
          );
        },
        message: 'At least one valid day of week must be specified'
      }
    },
    timeOfDay: {
      type: [String],
      validate: {
        validator: function (value: string | any[]) {
          return value.length >= 1;
        },
        message: 'At least one time slot must be specified'
      }
    },
    bankDetails: {
      type: teacherBankDetailsSchema
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true
    },
    recommendationIndex: {
      type: Number,
      required: true,
      default: 0
    },
    status: {
      type: String,
      required: true,
      default: 'signedup',
      enum: [
        'signedup',
        'firststage',
        'examFailed',
        'examPassed',
        'examLeft',
        'bankSaved',
        'FeesSaved',
        'PhotosUploaded',
        'Onboarded'
      ]
    },
    demoVideo: {
      type: String
    },
    userId: {
      type: String,
      required: true,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for unique fields
teacherSchema.index({ phone: 1 }, { unique: true });
teacherSchema.index({ email: 1 }, { unique: true });

const ALLOWED_FIELDS = [
  'name',
  'bio',
  'dob',
  'address',
  'email',
  'phone',
  'profession',
  'highestQualification',
  'experienceInMonths',
  'languagesKnown',
  'marksheetImage',
  'aadhaarImage',
  'panCardImage',
  'gstImage',
  'profileImage',
  'aadhaarNumber',
  'panCardNumber',
  'gstNumber',
  'educationBoard',
  'educationClass',
  'subjects',
  'daysOfWeek',
  'timeOfDay',
  'bankDetails.accountHolderName',
  'bankDetails.accountNumber',
  'bankDetails.ifscCode',
  'bankDetails.bankName',
  'bankDetails.branchName',
  'bankDetails.accountType',
  'isActive',
  'id',
  'rating',
  'reviews',
  'recommendationIndex',
  'status',
  'demoVideo',
  'userId'
];

teacherSchema.method({
  // query is optional, e.g. to transform data for response but only include certain "fields"
  transform({ query = {} }: { query?: any } = {}) {
    // transform every record (only respond allowed fields and "&fields=" in query)
    return transformData(this, query, ALLOWED_FIELDS);
  }
});

teacherSchema.statics = {
  list({ query }: { query: any }) {
    return listData(this, query, ALLOWED_FIELDS);
  }
};

const Model = mongoose.model('teacher', teacherSchema);
Model.ALLOWED_FIELDS = ALLOWED_FIELDS;

module.exports = Model;
