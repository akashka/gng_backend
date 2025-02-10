export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');
const Teacher = require('../models/teacher.model');
const ReviewsRatings = require('../models/reviewsRatings.model');
const APIError = require('../utils/APIError');

/**
 * Create new teacher
 * @public
 */
exports.createTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacher = new Teacher(req.body);
    const savedTeacher = await teacher.save();
    res.status(httpStatus.CREATED);
    res.json(savedTeacher.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get teacher by ID
 * @public
 */

const getAverageRating = (reviewsRatings: { rating: any }[]) => {
  let total = 0;
  reviewsRatings.map((r: { rating: any }) => (total += r.rating || 0));
  return total;
};

exports.getTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      throw new APIError({
        message: 'Teacher not found',
        status: httpStatus.NOT_FOUND
      });
    }
    const reviewsRatings = await ReviewsRatings.find({ foreignId: teacher.id });
    teacher.rating = getAverageRating(reviewsRatings);
    teacher.reviews = reviewsRatings;

    delete teacher.phone;
    delete teacher.email;
    delete teacher.aadhaarNumber;
    delete teacher.panCardNumber;
    delete teacher.gstNumber;
    delete teacher.isActive;
    delete teacher.status;

    res.json(teacher.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing teacher
 * @public
 */
exports.updateTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      throw new APIError({
        message: 'Teacher not found',
        status: httpStatus.NOT_FOUND
      });
    }

    // Remove fields that shouldn't be updated
    const updateData = omit(req.body, ['email', 'phone']); // Email and phone are unique fields

    // Update fields
    Object.assign(teacher, updateData);

    const savedTeacher = await teacher.save();
    res.json(savedTeacher.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of teachers
 * @public
 */
exports.listTeachers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let teachers = await Teacher.list({
      query: req.query
    });

    teachers.map(
      async (t: {
        id: any;
        rating: number;
        phone: any;
        email: any;
        aadhaarNumber: any;
        panCardNumber: any;
        gstNumber: any;
        isActive: any;
        status: any;
      }) => {
        const reviewsRatings = await ReviewsRatings.find({ foreignId: t.id });
        t.rating = getAverageRating(reviewsRatings);
        delete t.phone;
        delete t.email;
        delete t.aadhaarNumber;
        delete t.panCardNumber;
        delete t.gstNumber;
        delete t.isActive;
        delete t.status;
      }
    );
    const transformedTeachers = teachers.map((teacher: { transform: () => any }) => teacher.transform());
    res.json(transformedTeachers);
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate teacher
 * @public
 */
exports.deactivateTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      throw new APIError({
        message: 'Teacher not found',
        status: httpStatus.NOT_FOUND
      });
    }

    teacher.isActive = false;
    const savedTeacher = await teacher.save();
    res.json(savedTeacher.transform());
  } catch (error) {
    next(error);
  }
};
