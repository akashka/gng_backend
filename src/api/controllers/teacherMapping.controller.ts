export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const StaticData = require('../models/staticData.model'); // Adjust path as needed

// POST request to create/update value
const insertMultipleMappings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('req.body', req.body);
    req.body.map(() => {
      // const newEntry = new StaticData({
      //   name,
      //   value,
      //   isActive: true
      // });
      // result = await newEntry.save();
    });

    return res.status(201).json({
      success: true,
      message: 'New data created successfully'
      // data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  insertMultipleMappings
};
