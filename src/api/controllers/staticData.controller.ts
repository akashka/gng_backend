export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const StaticData = require('../models/staticData.model'); // Adjust path as needed

// GET request to fetch value by name
const getValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.query;

    if (!name) {
      const data = await StaticData.find();

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Data not found or inactive'
        });
      }

      return res.status(200).json({
        success: true,
        value: data.value
      });
    }

    const data = await StaticData.findOne({
      name: name,
      isActive: true
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Data not found or inactive'
      });
    }

    return res.status(200).json({
      success: true,
      value: data.value
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
const upsertValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.query;
    const { value } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both name and value are required'
      });
    }

    // First check if entry exists
    const existingEntry = await StaticData.findOne({ name });

    let result;
    if (existingEntry) {
      // Update existing entry
      result = await StaticData.findOneAndUpdate({ name }, { value }, { new: true });

      return res.status(200).json({
        success: true,
        message: 'Data updated successfully',
        data: result
      });
    } else {
      // Create new entry
      const newEntry = new StaticData({
        name,
        value,
        isActive: true
      });
      result = await newEntry.save();

      return res.status(201).json({
        success: true,
        message: 'New data created successfully',
        data: result
      });
    }
  } catch (error) {
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A record with this name already exists'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getValue,
  upsertValue
};
