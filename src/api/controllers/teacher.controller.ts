export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');
const Teacher = require('../models/teacher.model');
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
exports.getTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      throw new APIError({
        message: 'Teacher not found',
        status: httpStatus.NOT_FOUND,
      });
    }
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
        status: httpStatus.NOT_FOUND,
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
    const teachers = await Teacher.list({
      query: req.query,
    });
    
    const transformedTeachers = teachers.map((teacher: { transform: () => any; }) => teacher.transform());
    res.json(transformedTeachers);
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate teacher
 * @public
 */
exports.deactivateTeacher = async (req: Request, res: Response, next: NextFunction)  => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      throw new APIError({
        message: 'Teacher not found',
        status: httpStatus.NOT_FOUND,
      });
    }

    teacher.isActive = false;
    const savedTeacher = await teacher.save();
    res.json(savedTeacher.transform());
  } catch (error) {
    next(error);
  }
};