export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ReviewsRatings = require('../models/reviewsRatings.model');
import { getSentiment, extractKeywords } from '../../api/utils/Sentiments';

// GET request to fetch value by name
const getValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReviewsRatings.find();

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Data not found'
      });
    }

    return res.status(200).json({
      success: true,
      value: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// POST request to create/update value
const postValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, rating, review, foreignId, userId } = req.body;
    let tagToSave: never[] = [];
    let sentiment = {};

    if (review) {
      sentiment = getSentiment(review);
      tagToSave = extractKeywords(review);
    }

    const newEntry = new ReviewsRatings({
      name,
      rating,
      review,
      foreignId,
      dated: Date.now(),
      tags: tagToSave,
      sentiment,
      userId
    });
    const result = await newEntry.save();

    return res.status(201).json({
      success: true,
      message: 'New data created successfully',
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// PUT request to create/update value
const putValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, rating, review, userId } = req.body;

    // First check if entry exists
    const existingEntry = await ReviewsRatings.findOne({ id });

    let result;
    if (existingEntry) {
      if (name) existingEntry.name = name;
      if (rating) existingEntry.rating = rating;
      if (userId) existingEntry.userId = userId;
      if (review) {
        existingEntry.review = review;
        existingEntry.sentiment = getSentiment(review);
        existingEntry.tagToSave = extractKeywords(review);
      }
      existingEntry.dated = Date.now();

      result = await ReviewsRatings.findOneAndUpdate({ id }, existingEntry);

      return res.status(200).json({
        success: true,
        message: 'Data updated successfully',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'No Entry Found',
        error: 'No entry found'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// GET request by User
const getValueByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // First check if entry exists
    const existingEntry = await ReviewsRatings.find({ foreignId: id });

    if (existingEntry) {
      return res.status(200).json({
        success: true,
        value: existingEntry
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'No Entry Found',
        error: 'No entry found'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getValue,
  postValue,
  putValue,
  getValueByUser
};
