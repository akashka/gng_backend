export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');
const Parent = require('../models/parent.model');
const User = require('../models/user.model');
const ReviewsRatings = require('../models/reviewsRatings.model');
const APIError = require('../utils/APIError');
const RefreshToken = require('../models/refreshToken.model');
const moment = require('moment-timezone');
const { SEC_ADMIN_EMAIL, JWT_EXPIRATION_MINUTES, slackEnabled, emailEnabled } = require('../../config/vars');

/**
 * Create new parent
 * @public
 */
exports.createParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let isUserFound = false;
    if (req.body.email) {
      const emailUser = await User.find({ email: req.body.email, isActive: true });
      if (emailUser.length > 0) isUserFound = true;
    }
    if (req.body.phone) {
      const emailPhone = await User.find({ email: req.body.phone, isActive: true });
      if (emailPhone.length > 0) isUserFound = true;
    }

    if (isUserFound) {
      throw new APIError({
        message: 'Email or Phone Number already registered',
        status: httpStatus.NOT_FOUND
      });
    }
    const sendOtp = req.body.sendOtp || false;
    delete req.body.sendOtp;
    const parent = new Parent(req.body);
    const user = new User({
      password: Math.floor(100000 + Math.random() * 900000),
      picture: req.body.profileImage,
      userRole: 'parent',
      isActive: req.body.isActive || true,
      userName: req.body.name,
      email: req.body.email,
      phone: req.body.phone
    });

    console.log('User', JSON.stringify(user));

    const savedUser = await user.save();
    parent.userId = savedUser._id;
    const savedParent = await parent.save();
    if (sendOtp) {
      // To-Do: Send Mail & SMS to the parent OTP
      // sendMailAndSms()
    }
    res.status(httpStatus.CREATED);
    res.json(savedParent.transform());
  } catch (error) {
    next(error);
  }
};

function generateTokenResponse(user: any, accessToken: string) {
  const tokenType = 'Bearer';
  const refreshToken = RefreshToken.generate(user).token;
  const expiresIn = moment().add(JWT_EXPIRATION_MINUTES, 'minutes');
  return {
    tokenType,
    accessToken,
    refreshToken,
    expiresIn
  };
}

exports.verifyOtpParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let notFound = true;
    if (req.body.email) {
      const emailUser = await User.find({ email: req.body.email, isActive: true });
      if (emailUser.length > 0) notFound = false;
    }
    if (req.body.phone) {
      const emailPhone = await User.find({ email: req.body.phone, isActive: true });
      if (emailPhone.length > 0) notFound = false;
    }

    console.log('notFound', JSON.stringify(notFound));

    if (notFound) {
      throw new APIError({
        message: 'Email or Phone Number Not found or already registered',
        status: httpStatus.NOT_FOUND
      });
    }

    const userFound = await User.findOne({ email: req.body.email, isActive: false, phone: req.body.phone });
    const parentFound = await Parent.findOne({ email: req.body.email, isActive: false, phone: req.body.phone });

    console.log('userFound', JSON.stringify(userFound));
    console.log('parentFound', JSON.stringify(parentFound));

    console.log('userFound.password', JSON.stringify(userFound.password));
    console.log('req.body.otp', JSON.stringify(req.body.otp));

    if (userFound && parentFound && userFound.password === req.body.otp) {
      userFound.isActive = true;
      userFound.password = '';
      const savedUser = await userFound.save();
      parentFound.isActive = true;
      const savedParent = await parentFound.save();

      const { user, accessToken } = await User.findAndGenerateToken(savedParent);
      const token = generateTokenResponse(savedUser, accessToken);
      const userTransformed = user.transform();

      console.log('userTransformed', JSON.stringify(userTransformed));
      console.log('token', JSON.stringify(token));

      const data = { token, user: userTransformed };
      return apiJson({ req, res, data });
    } else {
      throw new APIError({
        message: 'OTP Mismatched or details not found',
        status: httpStatus.NOT_FOUND
      });
    }
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

exports.updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let notFound = true;
    if (req.body.email) {
      const emailUser = await User.find({ email: req.body.email });
      if (emailUser.length > 0) notFound = false;
    }
    if (req.body.phone) {
      const emailPhone = await User.find({ email: req.body.phone });
      if (emailPhone.length > 0) notFound = false;
    }

    if (notFound) {
      throw new APIError({
        message: 'Email or Phone Number Not found or already registered',
        status: httpStatus.NOT_FOUND
      });
    }

    const userFound = await User.findOne({ email: req.body.email, phone: req.body.phone });
    const parentFound = await Parent.findOne({ email: req.body.email, phone: req.body.phone });

    userFound.password = req.body.password;
    const savedUser = await userFound.save();
    res.json(savedUser.transform());
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
