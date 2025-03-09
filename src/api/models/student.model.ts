export {};
const mongoose = require('mongoose');
import { string } from 'joi';
import { transformData, listData } from '../../api/utils/ModelUtils';

const studentSchema = new mongoose.Schema(
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
    languagesKnown: {
      type: [String]
    },
    profileImage: {
      type: String,
      trim: true
    },
    educationBoard: {
      type: String,
      required: true
    },
    educationClass: {
      type: String,
      required: true
    },
    schoolName: {
      type: String
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
    parentId: {
      type: String,
      required: true,
      ref: 'Parent'
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
  'languagesKnown',
  'profileImage',
  'educationBoard',
  'educationClass',
  'schoolName',
  'isActive',
  'recommendationIndex',
  'parentId',
  'userId',
  'id'
];

studentSchema.method({
  // query is optional, e.g. to transform data for response but only include certain "fields"
  transform({ query = {} }: { query?: any } = {}) {
    // transform every record (only respond allowed fields and "&fields=" in query)
    return transformData(this, query, ALLOWED_FIELDS);
  }
});

studentSchema.statics = {
  list({ query }: { query: any }) {
    return listData(this, query, ALLOWED_FIELDS);
  }
};

const Model = mongoose.model('student', studentSchema);
Model.ALLOWED_FIELDS = ALLOWED_FIELDS;

module.exports = Model;
