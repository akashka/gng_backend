export {};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResourcesSchema = new Schema(
  {
    generatedContent: {
      type: String
    },
    educationalClass: {
      type: String,
      required: true
    },
    educationalTopic: {
      type: String,
      required: true
    },
    generatedAt: {
      type: Date,
      required: true
    },
    educationalSubject: {
      type: String
    },
    educationalBoard: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resources', ResourcesSchema);
