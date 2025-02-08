export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const Feedbacks = require('../models/feedbacks.model');

// GET request to fetch value by name
const getValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await Feedbacks.find();

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
    const { rating, feedback, userId, name } = req.body;

    if (!rating || !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Ratings and Feedbacks are required'
      });
    }
    const newEntry = new Feedbacks({
      name,
      rating,
      feedback,
      userId,
      status: 'received'
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
    const { uuid } = req.params;
    const { status, comment } = req.body;

    // First check if entry exists
    const existingEntry = await Feedbacks.findOne({ uuid });

    let result;
    if (existingEntry) {
      if (status) existingEntry.status = status;
      if (comment) existingEntry.comment = comment;

      result = await Feedbacks.findOneAndUpdate({ uuid }, existingEntry);

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

module.exports = {
  getValue,
  postValue,
  putValue
};
