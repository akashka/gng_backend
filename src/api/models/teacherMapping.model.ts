export {};
const mongoose = require('mongoose');

const teacherMappingSchema = new mongoose.Schema(
  {
    educationBoard: {
      type: String,
      required: true
    },
    educationClass: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    classDays: {
      type: [String],
      validate: {
        validator: function (value: any[]) {
          return value.length >= 1;
        },
        message: 'At least one valid class day must be specified'
      }
    },
    classTimes: {
      type: [String],
      validate: {
        validator: function (value: string | any[]) {
          return value.length >= 1;
        },
        message: 'At least one time slot must be specified'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true
    },
    teacherId: {
      type: String,
      required: true,
      ref: 'Teacher'
    },
    oneStudentFee: {
      type: Number,
      required: true,
      default: 1000
    },
    twoStudentFee: {
      type: Number,
      required: true,
      default: 1000
    }
  },
  {
    timestamps: true
  }
);

const Model = mongoose.model('teacherMapping', teacherMappingSchema);

module.exports = Model;
