export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');
const Leads = require('../models/leads.model');
const ReviewsRatings = require('../models/reviewsRatings.model');
const APIError = require('../utils/APIError');

/**
 * Create new lead
 * @public
 */
exports.createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = new Leads(req.body);
    const savedLead = await lead.save();
    res.status(httpStatus.CREATED);
    res.json(savedLead.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get lead by ID
 * @public
 */
exports.getLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let lead = await Leads.findById(req.params.leadId);
    if (!lead) {
      throw new APIError({
        message: 'Details not found',
        status: httpStatus.NOT_FOUND
      });
    }
    res.json(lead.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing lead
 * @public
 */
exports.updateLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await Leads.findById(req.params.leadId);
    if (!lead) {
      throw new APIError({
        message: 'Details not found',
        status: httpStatus.NOT_FOUND
      });
    }

    // Update only the fields present in the request body
    for (const key in req.body) {
      if (req.body.hasOwnProperty(key)) {
        lead[key] = req.body[key];
      }
    }

    const savedLead = await lead.save();
    res.json(savedLead.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of leads
 * @public
 */
exports.listLeads = async (
  req: {
    query: {
      page?: 1 | undefined;
      sortOptions: any;
      searchQuery: any;
      boards: any;
      classes: any;
    };
  },
  res: Response,
  next: NextFunction
) => {
  try {
    let leads = await Leads.find();
    const transformedLeads = leads.map((lead: { transform: () => any }) => lead.transform());
    res.json(transformedLeads);
  } catch (error) {
    next(error);
  }
};
