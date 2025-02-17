export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');
const Parent = require('../models/parent.model');
const ReviewsRatings = require('../models/reviewsRatings.model');
const APIError = require('../utils/APIError');

/**
 * Create new parent
 * @public
 */
exports.createParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parent = new Parent(req.body);
    const savedParent = await parent.save();
    res.status(httpStatus.CREATED);
    res.json(savedParent.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get parent by ID
 * @public
 */
const getAverageRating = (reviewsRatings: { rating: any }[]) => {
  let total = 0;
  reviewsRatings.map((r: { rating: any }) => (total += r.rating || 0));
  return total / reviewsRatings.length;
};

exports.getParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let parent = await Parent.findById(req.params.parentId);
    if (!parent) {
      throw new APIError({
        message: 'Parent not found',
        status: httpStatus.NOT_FOUND
      });
    }
    const reviewsRatings = await ReviewsRatings.find({ foreignId: parent.id });
    parent.rating = getAverageRating(reviewsRatings);
    parent.reviews = reviewsRatings;

    res.json(parent.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing parent
 * @public
 */
exports.updateParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('req.params', JSON.stringify(req.params));
    console.log('req.body', JSON.stringify(req.body));
    const parent = await Parent.findById(req.params.parentId);
    if (!parent) {
      throw new APIError({
        message: 'Parent not found',
        status: httpStatus.NOT_FOUND
      });
    }

    // Update only the fields present in the request body
    for (const key in req.body) {
      if (req.body.hasOwnProperty(key)) {
        parent[key] = req.body[key];
      }
    }

    const savedParent = await parent.save();
    res.json(savedParent.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of parents
 * @public
 */
exports.listParents = async (
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
    const { page = 1, sortOptions, searchQuery, boards, classes } = req.query;

    // Step 1: Fetch all parents
    let parents = await Parent.find();
    parents.map(async (t: { id: any; rating: number; isActive: any }) => {
      const reviewsRatings = await ReviewsRatings.find({ foreignId: t.id });
      t.rating = getAverageRating(reviewsRatings);
    });

    parents = parents.filter((parent: { isActive: Boolean }) => parent.isActive === true);

    // Step 2: Filter based on searchQuery
    if (searchQuery) {
      parents = parents.filter((parent: { name: string }) =>
        parent.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Step 3: Apply additional filters
    const filterParents = (parents: any[], filterKey: string, filterValues: string[]) => {
      if (filterValues) {
        const filterArray = Array.isArray(filterValues) ? filterValues : [filterValues];
        return parents.filter((parent) => filterArray.some((value) => parent[filterKey].includes(value)));
      }
      return parents;
    };

    parents = filterParents(parents, 'educationBoard', boards);
    parents = filterParents(parents, 'educationClass', classes);

    // Step 4: Sort parents
    // To-Do: classesLength & prices needs to be added to be displayed
    let sortKey = 'recommendationIndex';
    let sortOrder = 'asc';
    parents.sort((a: any, b: any) => {
      if (a[sortKey] < b[sortKey]) return sortOrder === 'asc' ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    if (sortOptions) {
      if (sortOptions === 'relevance') {
        sortKey = 'recommendationIndex';
        sortOrder = 'asc';
      }
      if (sortOptions === 'rating') {
        sortKey = 'rating';
        sortOrder = 'dec';
      }
      parents.sort((a: any, b: any) => {
        if (a[sortKey] < b[sortKey]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Step 5: Paginate results
    const pageSize = 10;
    const startIndex = (page - 1) * pageSize;
    const paginatedParents = parents.slice(startIndex, startIndex + pageSize);

    // Step 6: Transform and return results
    const transformedParents = paginatedParents.map((parent: { transform: () => any }) => parent.transform());
    res.json(transformedParents);
  } catch (error) {
    next(error);
  }
};
