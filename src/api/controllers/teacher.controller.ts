export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');
const Teacher = require('../models/teacher.model');
const User = require('../models/user.model');
const ReviewsRatings = require('../models/reviewsRatings.model');
const APIError = require('../utils/APIError');
const { v4: uuidv4 } = require('uuid');

/**
 * Create new teacher
 * @public
 */
exports.createTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let isUserFound = false;
    if (req.body.email) {
      const emailUser = await User.find({ email: req.body.email, isActive: true });
      if (emailUser.length > 0) isUserFound = true;
    }
    if (req.body.phone) {
      const emailPhone = await User.find({ phone: req.body.phone, isActive: true });
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
    const teacher = new Teacher(req.body);
    teacher.uuid = uuidv4();
    const user = new User({
      otp: Math.floor(100000 + Math.random() * 900000),
      picture: req.body.profileImage,
      userRole: 'teacher',
      isActive: req.body.isActive ?? (sendOtp ? false : true),
      userName: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password
    });

    console.log('User', JSON.stringify(user));

    const savedUser = await user.save();
    teacher.userId = savedUser._id;
    const savedTeacher = await teacher.save();
    if (sendOtp) {
      // To-Do: Send Mail & SMS to the teacher OTP
      // sendMailAndSms()
    }
    res.status(httpStatus.CREATED);
    res.json(savedTeacher.transform());
  } catch (error) {
    next(error);
  }
};

exports.verifyOtpTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('-------------------------------------------');
    let emailPhone, emailUser, userFound;
    if (req.body.email) {
      emailUser = await User.find({ email: req.body.email, isActive: true });
    }
    if (req.body.phone) {
      emailPhone = await User.find({ phone: req.body.phone, isActive: true });
    }

    console.log('emailPhone', JSON.stringify(emailPhone));
    console.log('emailUser', JSON.stringify(emailUser));
    if (emailPhone.length > 0 || emailUser.length > 0) {
      throw new APIError({
        message: 'Email or Phone Number Not found or already registered',
        status: httpStatus.NOT_FOUND
      });
    }

    emailUser = [];
    emailPhone = [];
    if (req.body.email) {
      emailUser = await User.find({ email: req.body.email, isActive: false });
    }
    if (req.body.phone) {
      emailPhone = await User.find({ phone: req.body.phone, isActive: false });
    }

    console.log('emailPhone', JSON.stringify(emailPhone));
    console.log('emailUser', JSON.stringify(emailUser));
    if (emailUser.length && emailPhone.length)
      userFound = emailUser.filter((obj1: { _id: any }) =>
        emailPhone.some((obj2: { _id: any }) => obj2._id === obj1._id)
      );
    else if (emailUser.length) userFound = emailUser[0];
    else if (emailPhone.length) userFound = emailPhone[0];
    console.log('userFound', JSON.stringify(userFound));

    if (userFound && userFound.otp === req.body.otp) {
      userFound.isActive = true;
      userFound.otp = '';
      const savedUser = await userFound.save();

      const teacherFound = await Teacher.findOne({ userId: userFound._id });
      teacherFound.isActive = true;
      const savedTeacher = await teacherFound.save();

      res.status(httpStatus.CREATED);
      res.json(savedTeacher.transform());
    } else {
      throw new APIError({
        message: 'OTP Mismatched or details not found',
        status: httpStatus.NOT_FOUND
      });
    }
  } catch (error) {
    console.log('err', JSON.stringify(error));
    next(error);
  }
};

exports.updateTeacherStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.status) {
      throw new APIError({
        message: 'Status not found',
        status: httpStatus.NOT_FOUND
      });
    }
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      throw new APIError({
        message: 'Teacher not found',
        status: httpStatus.NOT_FOUND
      });
    }

    teacher.status = req.body.status;
    const savedTeacher = await teacher.save();
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
  return total / reviewsRatings.length;
};

exports.getTeacherByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let teacher = await Teacher.findOne({ userId: req.params.userId });
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
    console.log('req.params', req.params);
    console.log('req.body', req.body);
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      throw new APIError({
        message: 'Teacher not found',
        status: httpStatus.NOT_FOUND
      });
    }

    // Remove fields that shouldn't be updated
    const updateData = omit(req.body, ['email', 'phone']); // Email and phone are unique fields

    // Update only the fields present in the request body
    for (const key in updateData) {
      if (updateData.hasOwnProperty(key)) {
        teacher[key] = updateData[key];
      }
    }

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
exports.listTeachers = async (
  req: {
    query: {
      page?: 1 | undefined;
      sortOptions: any;
      searchQuery: any;
      boards: any;
      qualifications: any;
      professions: any;
      languages: any;
      classes: any;
      subjects: any;
      timings: any;
      days: any;
    };
  },
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      sortOptions,
      searchQuery,
      boards,
      qualifications,
      professions,
      languages,
      classes,
      subjects,
      timings,
      days
    } = req.query;

    // Step 1: Fetch all teachers
    let teachers = await Teacher.find();
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

    teachers = teachers.filter((teacher: { isActive: Boolean }) => teacher.isActive === true);

    // Step 2: Filter based on searchQuery
    if (searchQuery) {
      teachers = teachers.filter((teacher: { name: string }) =>
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Step 3: Apply additional filters
    const filterTeachers = (teachers: any[], filterKey: string, filterValues: string[]) => {
      if (filterValues) {
        const filterArray = Array.isArray(filterValues) ? filterValues : [filterValues];
        return teachers.filter((teacher) => filterArray.some((value) => teacher[filterKey].includes(value)));
      }
      return teachers;
    };

    teachers = filterTeachers(teachers, 'educationBoard', boards);
    teachers = filterTeachers(teachers, 'highestQualification', qualifications);
    teachers = filterTeachers(teachers, 'profession', professions);
    teachers = filterTeachers(teachers, 'languagesKnown', languages);
    teachers = filterTeachers(teachers, 'educationClass', classes);
    teachers = filterTeachers(teachers, 'subjects', subjects);
    teachers = filterTeachers(teachers, 'timeOfDay', timings);
    teachers = filterTeachers(teachers, 'daysOfWeek', days);

    // Step 4: Sort teachers
    // To-Do: classesLength & prices needs to be added to be displayed
    let sortKey = 'recommendationIndex';
    let sortOrder = 'asc';
    teachers.sort((a: any, b: any) => {
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
      if (sortOptions === 'price_low') {
        sortKey = 'prices';
        sortOrder = 'asc';
      }
      if (sortOptions === 'price_high') {
        sortKey = 'prices';
        sortOrder = 'dec';
      }
      if (sortOptions === 'experience') {
        sortKey = 'experienceInMonths';
        sortOrder = 'dec';
      }
      if (sortOptions === 'availability') {
        sortKey = 'classesLength';
        sortOrder = 'dec';
      }
      teachers.sort((a: any, b: any) => {
        if (a[sortKey] < b[sortKey]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Step 5: Paginate results
    const pageSize = 10;
    const startIndex = (page - 1) * pageSize;
    const paginatedTeachers = teachers.slice(startIndex, startIndex + pageSize);

    // Step 6: Transform and return results
    const transformedTeachers = paginatedTeachers.map((teacher: { transform: () => any }) => teacher.transform());
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
