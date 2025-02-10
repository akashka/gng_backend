import { required } from 'joi';

export {};
const mongoose = require('mongoose');

const reviewsRatingsSchema = new mongoose.Schema(
  {
    name: {
      type: String
    },
    rating: {
      type: Number,
      required: true,
      default: 0
    },
    review: {
      type: String
    },
    foreignId: {
      type: String
    },
    userId: {
      type: String
    },
    dated: {
      type: Date,
      required: true,
      default: Date.now
    },
    tags: [
      {
        type: String
      }
    ],
    sentiment: {
      type: Object
    }
  },
  {
    timestamps: true
  }
);

const FeedbacksSchema = mongoose.model('ReviewsRatings', reviewsRatingsSchema);

module.exports = FeedbacksSchema;
