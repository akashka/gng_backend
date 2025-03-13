import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  Booking,
  ClassBatch,
  Parent,
  Student,
  Teachers,
  User,
  ReviewsRatings,
  Questionpaper,
  Resources,
  StaticData,
  RefreshToken,
  Report as ExamReport
} from '../models/index';
const APIError = require('../utils/APIError');
const httpStatus = require('http-status');

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, userId } = req.query;
    let reports: any = {};

    switch (role) {
      case 'teacher':
        reports = await getTeacherReports(String(userId));
        break;
      case 'student':
        reports = await getStudentReports(String(userId));
        break;
      case 'parent':
        reports = await getParentReports(String(userId));
        break;
      case 'admin':
      case 'superadmin':
        reports = await getAdminReports();
        break;
      default:
        throw new APIError({ message: 'Invalid role', status: httpStatus.BAD_REQUEST });
    }

    res.status(httpStatus.OK).json(reports);
  } catch (error) {
    next(error);
  }
};

// Teacher-specific reports
const getTeacherReports = async (teacherId: string) => {
  const totalClasses = await Booking.countDocuments({ teacherId, status: 'confirmed' });
  const studentIds = await Booking.distinct('studentId', { teacherId, status: 'confirmed' });
  const totalStudents = studentIds.length;
  const totalEarnings = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$fees' } } }
  ]);
  const averageRating = await ReviewsRatings.aggregate([
    { $match: { foreignId: teacherId } },
    { $group: { _id: null, average: { $avg: '$rating' } } }
  ]);

  // Complex Metrics for Teachers
  const classTrends = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), status: 'confirmed' } },
    { $group: { _id: { $month: '$startingDate' }, totalClasses: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const studentPerformance = await ExamReport.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    { $group: { _id: '$userUuid', averageMarks: { $avg: '$obtainedMarks' } } }
  ]);

  const subjectWiseEarnings = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), status: 'paid' } },
    { $group: { _id: '$subjects', totalEarnings: { $sum: '$fees' } } }
  ]);

  // Batch-wise Performance
  const batchWisePerformance = await ClassBatch.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    { $lookup: { from: 'bookings', localField: '_id', foreignField: 'batchId', as: 'bookings' } },
    { $unwind: '$bookings' },
    {
      $group: {
        _id: '$_id',
        batchName: { $first: '$name' },
        totalEarnings: { $sum: '$bookings.fees' },
        totalStudents: { $sum: 1 }
      }
    }
  ]);

  // Suggestions for Teachers
  const popularSubjects = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    { $group: { _id: '$subjects', totalBookings: { $sum: 1 } } },
    { $sort: { totalBookings: -1 } },
    { $limit: 3 }
  ]);

  return {
    totalClasses,
    totalStudents,
    totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
    averageRating: averageRating.length > 0 ? averageRating[0].average : 0,
    classTrends,
    studentPerformance,
    subjectWiseEarnings,
    batchWisePerformance, // Performance of each batch
    suggestions: {
      popularSubjects: popularSubjects.map((sub: { _id: any }) => sub._id), // Top 3 popular subjects to focus on
      increaseEngagement: 'Consider offering discounts for new students or referral bonuses.'
    }
  };
};

// Student-specific reports
const getStudentReports = async (studentId: string) => {
  const totalClassesAttended = await Booking.countDocuments({ studentId, status: 'confirmed' });
  const teacherIds = await Booking.distinct('teacherId', { studentId, status: 'confirmed' });
  const totalTeachers = teacherIds.length;
  const totalFeesPaid = await Booking.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId), status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$fees' } } }
  ]);
  const examReports = await ExamReport.find({ userUuid: studentId });

  // Complex Metrics for Students
  const subjectWisePerformance = await ExamReport.aggregate([
    { $match: { userUuid: studentId } },
    { $group: { _id: '$subject', averageMarks: { $avg: '$obtainedMarks' } } }
  ]);

  const attendanceTrends = await Booking.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId), status: 'confirmed' } },
    { $group: { _id: { $month: '$startingDate' }, totalClasses: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const teacherRatings = await ReviewsRatings.aggregate([
    { $match: { foreignId: { $in: teacherIds } } },
    { $group: { _id: '$foreignId', averageRating: { $avg: '$rating' } } }
  ]);

  // Batch-wise Performance
  const batchWisePerformance = await ClassBatch.aggregate([
    { $match: { students: new mongoose.Types.ObjectId(studentId) } },
    { $lookup: { from: 'bookings', localField: '_id', foreignField: 'batchId', as: 'bookings' } },
    { $unwind: '$bookings' },
    {
      $group: {
        _id: '$_id',
        batchName: { $first: '$name' },
        totalClasses: { $sum: 1 },
        totalFees: { $sum: '$bookings.fees' }
      }
    }
  ]);

  // Suggestions for Students
  const weakSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks < 50)
    .map((sub: { _id: any }) => sub._id);
  const strongSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks >= 75)
    .map((sub: { _id: any }) => sub._id);

  return {
    totalClassesAttended,
    totalTeachers,
    totalFeesPaid: totalFeesPaid.length > 0 ? totalFeesPaid[0].total : 0,
    examReports,
    subjectWisePerformance, // Performance in each subject
    attendanceTrends, // Monthly trend of classes attended
    teacherRatings, // Average ratings of teachers the student has attended classes with
    batchWisePerformance, // Performance in each batch
    suggestions: {
      weakSubjects, // Subjects where the student is underperforming
      strongSubjects, // Subjects where the student is excelling
      advice:
        weakSubjects.length > 0
          ? `Focus more on ${weakSubjects.join(', ')} to improve your scores.`
          : 'Keep up the good work!'
    }
  };
};

// Parent-specific reports
const getParentReports = async (parentId: string) => {
  const children = await Student.find({ parentId });
  const childrenIds = children.map((child: { _id: any }) => child._id);
  const totalClassesAttended = await Booking.countDocuments({ studentId: { $in: childrenIds }, status: 'confirmed' });
  const totalFeesPaid = await Booking.aggregate([
    { $match: { studentId: { $in: childrenIds }, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$fees' } } }
  ]);
  const childrenPerformance = await ExamReport.find({ userUuid: { $in: childrenIds } });

  // Complex Metrics for Parents
  const childWisePerformance = await ExamReport.aggregate([
    { $match: { userUuid: { $in: childrenIds } } },
    { $group: { _id: '$userUuid', averageMarks: { $avg: '$obtainedMarks' } } }
  ]);

  const subjectWisePerformance = await ExamReport.aggregate([
    { $match: { userUuid: { $in: childrenIds } } },
    { $group: { _id: '$subject', averageMarks: { $avg: '$obtainedMarks' } } }
  ]);

  const teacherRatings = await ReviewsRatings.aggregate([
    { $match: { foreignId: { $in: await Booking.distinct('teacherId', { studentId: { $in: childrenIds } }) } } },
    { $group: { _id: '$foreignId', averageRating: { $avg: '$rating' } } }
  ]);

  // Batch-wise Performance
  const batchWisePerformance = await ClassBatch.aggregate([
    { $match: { students: { $in: childrenIds } } },
    { $lookup: { from: 'bookings', localField: '_id', foreignField: 'batchId', as: 'bookings' } },
    { $unwind: '$bookings' },
    {
      $group: {
        _id: '$_id',
        batchName: { $first: '$name' },
        totalClasses: { $sum: 1 },
        totalFees: { $sum: '$bookings.fees' }
      }
    }
  ]);

  // Suggestions for Parents
  const weakSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks < 50)
    .map((sub: { _id: any }) => sub._id);
  const strongSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks >= 75)
    .map((sub: { _id: any }) => sub._id);

  return {
    totalChildren: children.length,
    totalClassesAttended,
    totalFeesPaid: totalFeesPaid.length > 0 ? totalFeesPaid[0].total : 0,
    childrenPerformance,
    childWisePerformance, // Performance of each child
    subjectWisePerformance, // Performance of children in each subject
    teacherRatings, // Average ratings of teachers teaching the children
    batchWisePerformance, // Performance in each batch
    suggestions: {
      weakSubjects, // Subjects where children are underperforming
      strongSubjects, // Subjects where children are excelling
      advice:
        weakSubjects.length > 0
          ? `Encourage your children to focus more on ${weakSubjects.join(', ')}.`
          : 'Your children are performing well!'
    }
  };
};

// Admin and Super Admin reports
const getAdminReports = async () => {
  const totalTeachers = await Teachers.countDocuments();
  const totalStudents = await Student.countDocuments();
  const totalParents = await Parent.countDocuments();
  const totalClasses = await Booking.countDocuments({ status: 'confirmed' });
  const totalEarnings = await Booking.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$fees' } } }
  ]);
  const totalResources = await Resources.countDocuments();
  const totalExamPapers = await Questionpaper.countDocuments();

  // Complex Metrics for Admin
  const monthlyEarningsTrend = await Booking.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: { $month: '$startingDate' }, totalEarnings: { $sum: '$fees' } } },
    { $sort: { _id: 1 } }
  ]);

  const teacherPerformance = await ReviewsRatings.aggregate([
    { $group: { _id: '$foreignId', averageRating: { $avg: '$rating' } } }
  ]);

  const studentEngagement = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: '$studentId', totalClasses: { $sum: 1 } } },
    { $sort: { totalClasses: -1 } }
  ]);

  // Batch-wise Performance
  const batchWisePerformance = await ClassBatch.aggregate([
    { $lookup: { from: 'bookings', localField: '_id', foreignField: 'batchId', as: 'bookings' } },
    { $unwind: '$bookings' },
    {
      $group: {
        _id: '$_id',
        batchName: { $first: '$name' },
        totalEarnings: { $sum: '$bookings.fees' },
        totalStudents: { $sum: 1 }
      }
    }
  ]);

  // Suggestions for Admin
  const popularBatches = batchWisePerformance
    .sort((a: { totalStudents: number }, b: { totalStudents: number }) => b.totalStudents - a.totalStudents)
    .slice(0, 3);
  const underperformingBatches = batchWisePerformance.filter(
    (batch: { totalStudents: number }) => batch.totalStudents < 5
  );

  return {
    totalTeachers,
    totalStudents,
    totalParents,
    totalClasses,
    totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
    totalResources,
    totalExamPapers,
    monthlyEarningsTrend, // Monthly trend of earnings
    teacherPerformance, // Average ratings of all teachers
    studentEngagement, // Top students by class attendance
    batchWisePerformance, // Performance of each batch
    suggestions: {
      popularBatches: popularBatches.map((batch: { batchName: any }) => batch.batchName), // Top 3 popular batches
      underperformingBatches: underperformingBatches.map((batch: { batchName: any }) => batch.batchName), // Batches with low enrollment
      advice:
        underperformingBatches.length > 0
          ? `Consider promoting ${underperformingBatches.join(', ')} to increase enrollment.`
          : 'All batches are performing well!'
    }
  };
};
