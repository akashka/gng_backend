export {};
const mongoose = require('mongoose');

const staticDataSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      default: () => require('crypto').randomUUID()
    },
    name: {
      type: String,
      required: true,
      unique: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    type: {
      type: String,
      enum: ['HTML', 'JSON'],
      default: 'JSON'
    }
  },
  {
    timestamps: true
  }
);

const StaticData = mongoose.model('StaticData', staticDataSchema);

module.exports = StaticData;
