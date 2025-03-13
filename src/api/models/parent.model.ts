export {};
const mongoose = require('mongoose');
import { string } from 'joi';
import { transformData, listData } from '../../api/utils/ModelUtils';

const parentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      minlength: [2, 'Name must be at least 2 characters long'],
      trim: true
    },
    dob: {
      type: Date
    },
    address: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (value: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Please enter a valid email address'
      }
    },
    phone: {
      type: String,
      trim: true
    },
    profession: {
      type: String,
      trim: true
    },
    highestQualification: {
      type: String,
      trim: true
    },
    languagesKnown: {
      type: [String]
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

const ALLOWED_FIELDS = [
  'name',
  'dob',
  'address',
  'email',
  'phone',
  'profession',
  'highestQualification',
  'languagesKnown',
  'profileImage',
  'aadhaarNumber',
  'panCardNumber',
  'isActive',
  'recommendationIndex',
  'userId',
  'id'
];

parentSchema.method({
  // query is optional, e.g. to transform data for response but only include certain "fields"
  transform({ query = {} }: { query?: any } = {}) {
    // transform every record (only respond allowed fields and "&fields=" in query)
    return transformData(this, query, ALLOWED_FIELDS);
  }
});

parentSchema.statics = {
  list({ query }: { query: any }) {
    return listData(this, query, ALLOWED_FIELDS);
  }
};

const Model = mongoose.model('parent', parentSchema);
Model.ALLOWED_FIELDS = ALLOWED_FIELDS;

module.exports = Model;
