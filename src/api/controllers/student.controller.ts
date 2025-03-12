export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');
const Student = require('../models/student.model');
const User = require('../models/user.model');
const ReviewsRatings = require('../models/reviewsRatings.model');
const APIError = require('../utils/APIError');

/**
 * Create new student
 * @public
 */
const generateUserName = (body: { name: any; dob: any }): string | null => {
  if (body && body.name && body.dob) {
    // Step 1: Process the name
    const namePart = body.name
      .replace(/[^a-zA-Z]/g, '') // Remove special characters, numbers, and spaces
      .substring(0, 4) // Take the first 4 characters
      .toLowerCase(); // Convert to lowercase

    // Step 2: Process the date of birth
    const dobDate = new Date(body.dob);
    const dd = String(dobDate.getDate()).padStart(2, '0'); // Get day and pad with leading zero if needed
    const MM = String(dobDate.getMonth() + 1).padStart(2, '0'); // Get month (add 1 since months are 0-indexed) and pad with leading zero

    // Step 3: Combine the name and date parts
    const uniqueCode = `${namePart}${dd}${MM}`;

    return uniqueCode;
  }

  return null; // Return null if body, name, or dob is missing
};

const generatePassword = (body: { name: any; dob: any }): string => {
  // Step 1: Extract the first 3 letters of the name
  const namePart = body.name
    .replace(/[^a-zA-Z]/g, '') // Remove special characters, numbers, and spaces
    .substring(0, 3) // Take the first 3 characters
    .toLowerCase(); // Convert to lowercase

  // Step 2: Extract the last 2 digits of the year from the DOB
  const dobYear = new Date(body.dob).getFullYear(); // Get the full year (e.g., 2005)
  const yearPart = String(dobYear).slice(-2); // Get the last 2 digits (e.g., "05")

  // Step 3: Add a special character
  const specialChar = '@'; // You can change this to any simple special character

  // Step 4: Combine the parts
  const password = `${namePart}${yearPart}${specialChar}`;

  return password;
};

exports.createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = new Student(req.body);
    const user = new User({
      password: generatePassword(req.body),
      picture: req.body.profileImage,
      userRole: 'student',
      userName: req.body.name,
      isActive: true,
      email: req.body.name?.trim().toLowerCase().replace(/ /g, '') + '@test.com'
    });

    const savedUser = await user.save();
    student.userId = savedUser._id;
    const savedStudent = await student.save();
    // To-Do: Send Mail & SMS to the parent about the login credentials
    // sendMailAndSms()
    res.status(httpStatus.CREATED);
    res.json(savedStudent.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get student by ID
 * @public
 */
const getAverageRating = (reviewsRatings: { rating: any }[]) => {
  let total = 0;
  reviewsRatings.map((r: { rating: any }) => (total += r.rating || 0));
  return total / reviewsRatings.length;
};

exports.getStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let student = await Student.findById(req.params.studentId);
    if (!student) {
      throw new APIError({
        message: 'Student not found',
        status: httpStatus.NOT_FOUND
      });
    }
    const reviewsRatings = await ReviewsRatings.find({ foreignId: student.id });
    student.rating = getAverageRating(reviewsRatings);
    student.reviews = reviewsRatings;

    res.json(student.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing student
 * @public
 */
exports.updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('req.params', JSON.stringify(req.params));
    console.log('req.body', JSON.stringify(req.body));
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      throw new APIError({
        message: 'Student not found',
        status: httpStatus.NOT_FOUND
      });
    }

    // Update only the fields present in the request body
    for (const key in req.body) {
      if (req.body.hasOwnProperty(key)) {
        student[key] = req.body[key];
      }
    }

    const savedStudent = await student.save();
    res.json(savedStudent.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of students
 * @public
 */
exports.listStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, sortOptions, searchQuery, boards, classes, parentId, isActive, userId } = req.query;

    // Step 1: Fetch all students
    let students = await Student.find();

    await Promise.all(
      students.map(async (t: any) => {
        const reviewsRatings = await ReviewsRatings.find({ foreignId: t.id });
        t.rating = getAverageRating(reviewsRatings);
      })
    );

    // Handle isActive filter with proper query param type handling
    if (isActive !== undefined) {
      const isActiveValue = isActive === 'true';
      students = students.filter((student: { isActive: boolean }) => student.isActive === isActiveValue);
    }

    if (parentId !== undefined) {
      const parentIdValue = String(parentId);
      students = students.filter((student: { parentId: string }) => student.parentId === parentIdValue);
    }

    if (userId !== undefined) {
      const userIdValue = String(userId);
      students = students.filter((student: { userId: string }) => student.userId === userIdValue);
    }

    // Step 2: Filter based on searchQuery
    if (searchQuery !== undefined) {
      const query = String(searchQuery).toLowerCase();
      students = students.filter((student: { name: string }) => student.name.toLowerCase().includes(query));
    }

    // Step 3: Apply additional filters
    // Helper function to convert query parameter to string array
    const toStringArray = (param: any) => {
      if (!param) return [];
      if (Array.isArray(param)) {
        return param.map((item) => String(item));
      }
      if (typeof param === 'string') {
        return [param];
      }
      // Handle ParsedQs object
      if (typeof param === 'object') {
        return Object.values(param).map((item) => String(item));
      }
      return [];
    };

    // Fixed filter function with proper typing - accept the exact type from req.query
    const filterStudents = (students: any[], filterKey: string, filterArray: Array<String>) => {
      if (filterArray.length > 0) {
        return students.filter((student) => filterArray.some((value) => student[filterKey].includes(value)));
      }
      return students;
    };

    // Pass the query parameters directly to the filterStudents function
    students = filterStudents(students, 'educationBoard', toStringArray(boards));
    students = filterStudents(students, 'educationClass', toStringArray(classes));

    // Step 4: Sort students
    let sortKey: string = 'recommendationIndex';
    let sortOrder: 'asc' | 'dec' = 'asc';

    students.sort((a: any, b: any) => {
      if (a[sortKey] < b[sortKey]) return sortOrder === 'asc' ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    if (sortOptions !== undefined) {
      const sortOptionValue = String(sortOptions);
      if (sortOptionValue === 'relevance') {
        sortKey = 'recommendationIndex';
        sortOrder = 'asc';
      }
      if (sortOptionValue === 'rating') {
        sortKey = 'rating';
        sortOrder = 'dec';
      }
      students.sort((a: any, b: any) => {
        if (a[sortKey] < b[sortKey]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Step 5: Paginate results
    const pageSize = 10;
    const pageNum = Number(page);
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedStudents = students.slice(startIndex, startIndex + pageSize);

    // Step 6: Transform and return results
    const transformedStudents = paginatedStudents.map((student: { transform: () => any }) => student.transform());
    res.json(transformedStudents);
  } catch (error) {
    next(error);
  }
};
