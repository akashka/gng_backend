export {};
const mongoose = require('mongoose');

const feedbacksSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      default: () => require('crypto').randomUUID()
    },
    name: {
      type: String
    },
    rating: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    feedback: {
      type: String,
      required: true
    },
    userId: {
      type: String,
      ref: 'User' // Link User model
    },
    status: {
      type: String,
      required: true,
      default: 'received',
      enum: ['received', 'actioned', 'closed']
    },
    comment: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const FeedbacksSchema = mongoose.model('Feedbacks', feedbacksSchema);

module.exports = FeedbacksSchema;
