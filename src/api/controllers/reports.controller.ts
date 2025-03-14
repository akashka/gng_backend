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
  Resources,
  StaticData,
  RefreshToken
} from '../models/index';
const models = require('../../../src/api/models/questionpaper.model');
const { Question, QuestionPaper, Answer } = models;
const ExamReport = models.Report;
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

// Teacher-specific reports with enhanced AI insights
const getTeacherReports = async (teacherId: string) => {
  const teacherInfo = await Teachers.findById(teacherId);
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

  // New: Student Performance Segmentation
  const studentPerformanceSegments = await ExamReport.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    {
      $group: {
        _id: '$userUuid',
        averageMarks: { $avg: '$obtainedMarks' },
        totalExams: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 1,
        averageMarks: 1,
        totalExams: 1,
        performanceCategory: {
          $cond: {
            if: { $gte: ['$averageMarks', 80] },
            then: 'high',
            else: {
              $cond: {
                if: { $gte: ['$averageMarks', 60] },
                then: 'medium',
                else: 'low'
              }
            }
          }
        }
      }
    },
    { $group: { _id: '$performanceCategory', count: { $sum: 1 } } }
  ]);

  // New: Topic-wise Analysis
  const topicWiseDifficulty = await Question.aggregate([
    {
      $lookup: {
        from: 'examreports',
        localField: '_id',
        foreignField: 'questions.questionId',
        as: 'reports'
      }
    },
    { $match: { 'reports.teacherId': new mongoose.Types.ObjectId(teacherId) } },
    {
      $group: {
        _id: '$topic',
        averageCorrectness: {
          $avg: {
            $cond: {
              if: { $eq: ['$reports.questions.isCorrect', true] },
              then: 1,
              else: 0
            }
          }
        },
        totalQuestions: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 1,
        averageCorrectness: 1,
        totalQuestions: 1,
        difficultyLevel: {
          $cond: {
            if: { $lt: ['$averageCorrectness', 0.4] },
            then: 'Hard',
            else: {
              $cond: {
                if: { $lt: ['$averageCorrectness', 0.7] },
                then: 'Medium',
                else: 'Easy'
              }
            }
          }
        }
      }
    }
  ]);

  // New: Teaching Effectiveness Analysis
  const teachingEffectiveness = await ExamReport.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    {
      $group: {
        _id: '$userUuid',
        initialScore: { $first: '$obtainedMarks' },
        latestScore: { $last: '$obtainedMarks' },
        examCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 1,
        improvement: { $subtract: ['$latestScore', '$initialScore'] },
        improvementPercentage: {
          $multiply: [{ $divide: [{ $subtract: ['$latestScore', '$initialScore'] }, '$initialScore'] }, 100]
        },
        examCount: 1
      }
    },
    {
      $group: {
        _id: null,
        averageImprovement: { $avg: '$improvement' },
        averageImprovementPercentage: { $avg: '$improvementPercentage' },
        totalStudentsAnalyzed: { $sum: 1 }
      }
    }
  ]);

  // New: AI-based Predictions and Suggestions
  const potentialDropouts = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    {
      $group: {
        _id: '$studentId',
        lastBookingDate: { $max: '$startingDate' },
        totalClasses: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 1,
        lastBookingDate: 1,
        totalClasses: 1,
        daysSinceLastBooking: {
          $trunc: {
            $divide: [{ $subtract: [new Date(), '$lastBookingDate'] }, 1000 * 60 * 60 * 24]
          }
        }
      }
    },
    {
      $match: {
        $or: [{ daysSinceLastBooking: { $gt: 30 } }, { totalClasses: { $lt: 3 } }]
      }
    },
    {
      $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $project: {
        studentId: '$_id',
        name: { $arrayElemAt: ['$studentInfo.name', 0] },
        daysSinceLastBooking: 1,
        totalClasses: 1,
        riskFactor: {
          $cond: {
            if: { $gt: ['$daysSinceLastBooking', 60] },
            then: 'High',
            else: {
              $cond: {
                if: { $gt: ['$daysSinceLastBooking', 45] },
                then: 'Medium',
                else: 'Low'
              }
            }
          }
        }
      }
    }
  ]);

  // New: Personalized Growth Recommendations
  const weakTopics = topicWiseDifficulty
    .filter((topic: { averageCorrectness: number }) => topic.averageCorrectness < 0.5)
    .map((topic: { _id: any }) => topic._id);

  const teachingStrengths = topicWiseDifficulty
    .filter((topic: { averageCorrectness: number }) => topic.averageCorrectness > 0.8)
    .map((topic: { _id: any }) => topic._id);

  // New: Revenue Forecast
  const revenueHistory = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), status: 'paid' } },
    {
      $group: {
        _id: {
          year: { $year: '$startingDate' },
          month: { $month: '$startingDate' }
        },
        revenue: { $sum: '$fees' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Calculate growth rate for forecast (simple moving average)
  let revenueForecast = { nextMonth: 0, next3Months: 0 };
  if (revenueHistory.length >= 3) {
    const last3Months = revenueHistory.slice(-3);
    const avgMonthlyRevenue =
      last3Months.reduce((sum: number, month: { revenue: number }) => sum + month.revenue, 0) / 3;
    const growthRate =
      revenueHistory.length >= 6
        ? last3Months.reduce((sum: number, month: { revenue: number }) => sum + month.revenue, 0) /
            revenueHistory.slice(-6, -3).reduce((sum: number, month: { revenue: number }) => sum + month.revenue, 0) -
          1
        : 0;

    revenueForecast = {
      nextMonth: avgMonthlyRevenue * (1 + growthRate),
      next3Months: avgMonthlyRevenue * 3 * (1 + growthRate)
    };
  }

  // Identify optimal teaching schedule based on high-performing time slots
  const optimalTimeSlots = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), status: 'confirmed' } },
    {
      $lookup: {
        from: 'examreports',
        localField: 'studentId',
        foreignField: 'userUuid',
        as: 'studentPerformance'
      }
    },
    {
      $project: {
        dayOfWeek: { $dayOfWeek: '$startingDate' },
        hourOfDay: { $hour: '$startingDate' },
        studentPerformance: { $avg: '$studentPerformance.obtainedMarks' }
      }
    },
    {
      $group: {
        _id: {
          dayOfWeek: '$dayOfWeek',
          hourOfDay: '$hourOfDay'
        },
        averagePerformance: { $avg: '$studentPerformance' },
        bookingCount: { $sum: 1 }
      }
    },
    { $match: { bookingCount: { $gt: 5 } } }, // Only consider slots with sufficient data
    { $sort: { averagePerformance: -1 } },
    { $limit: 3 }
  ]);

  const convertDayNumber = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day - 1];
  };

  const optimalSlots = optimalTimeSlots.map((slot: any) => ({
    day: convertDayNumber(slot._id.dayOfWeek),
    hour: `${slot._id.hourOfDay}:00`,
    averageStudentPerformance: slot.averagePerformance.toFixed(2)
  }));

  // Suggestions for Teachers
  const popularSubjects = await Booking.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    { $group: { _id: '$subjects', totalBookings: { $sum: 1 } } },
    { $sort: { totalBookings: -1 } },
    { $limit: 3 }
  ]);

  return {
    teacherName: teacherInfo?.name || 'Teacher',
    summary: {
      totalClasses,
      totalStudents,
      totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
      averageRating: averageRating.length > 0 ? averageRating[0].average : 0
    },
    performanceAnalytics: {
      classTrends,
      studentPerformance,
      subjectWiseEarnings,
      batchWisePerformance,
      studentPerformanceSegments, // New: Shows distribution of high/medium/low performing students
      topicWiseDifficulty, // New: Identifies challenging topics for students
      teachingEffectiveness:
        teachingEffectiveness.length > 0
          ? teachingEffectiveness[0]
          : {
              averageImprovement: 0,
              averageImprovementPercentage: 0,
              totalStudentsAnalyzed: 0
            } // New: Measures student improvement over time
    },
    aiInsights: {
      potentialDropouts, // New: Students at risk of discontinuing
      revenueForecast, // New: Predicted earnings
      optimalTeachingSlots: optimalSlots, // New: Best performing time slots
      recommendedFocus: {
        weakTopics, // Topics where students struggle the most
        teachingStrengths // Topics where teacher excels
      }
    },
    recommendations: {
      teachingStrategy:
        weakTopics.length > 0
          ? `Our AI analysis shows students struggle most with ${weakTopics.join(
              ', '
            )}. Consider creating additional resources or practice materials for these topics.`
          : 'Your teaching methods are effective across all topics!',
      scheduleOptimization:
        optimalSlots.length > 0
          ? `Student performance data suggests ${optimalSlots[0].day} at ${optimalSlots[0].hour} is your most effective teaching time. Consider scheduling important sessions during this period.`
          : 'No clear pattern in performance vs. time slot was detected.',
      retentionStrategy:
        potentialDropouts.length > 0
          ? `You have ${potentialDropouts.length} students at risk of dropping out. Consider reaching out to them with personalized follow-ups.`
          : 'Your student retention rate is excellent!',
      growthOpportunity: `Based on booking trends, expanding your offerings in ${
        popularSubjects.length > 0 ? popularSubjects[0]._id : 'your current subjects'
      } could increase your earnings by an estimated ${((revenueForecast.nextMonth || 0) * 0.2).toFixed(2)}.`,
      popularSubjects: popularSubjects.map((sub: { _id: any }) => sub._id), // Top 3 popular subjects to focus on
      increaseEngagement: 'Consider offering discounts for new students or referral bonuses.'
    }
  };
};

// Student-specific reports with enhanced AI insights
const getStudentReports = async (studentId: string) => {
  const studentInfo = await Student.findById(studentId);
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

  // New: Learning Pattern Analysis
  const learningPatterns = await ExamReport.aggregate([
    { $match: { userUuid: studentId } },
    {
      $project: {
        subject: 1,
        obtainedMarks: 1,
        examDate: 1,
        examDayOfWeek: { $dayOfWeek: '$examDate' },
        examHour: { $hour: '$examDate' }
      }
    },
    {
      $group: {
        _id: {
          dayOfWeek: '$examDayOfWeek',
          hourRange: {
            $cond: {
              if: { $lt: ['$examHour', 12] },
              then: 'Morning',
              else: { $cond: { if: { $lt: ['$examHour', 17] }, then: 'Afternoon', else: 'Evening' } }
            }
          }
        },
        averageMarks: { $avg: '$obtainedMarks' },
        examCount: { $sum: 1 }
      }
    },
    { $sort: { averageMarks: -1 } }
  ]);

  // New: Knowledge Gap Analysis
  const knowledgeGaps = await Question.aggregate([
    {
      $lookup: {
        from: 'examreports',
        localField: '_id',
        foreignField: 'questions.questionId',
        as: 'reports'
      }
    },
    { $unwind: '$reports' },
    { $match: { 'reports.userUuid': studentId } },
    { $unwind: '$reports.questions' },
    { $match: { $expr: { $eq: ['$_id', '$reports.questions.questionId'] } } },
    {
      $group: {
        _id: '$topic',
        correctAnswers: {
          $sum: { $cond: { if: '$reports.questions.isCorrect', then: 1, else: 0 } }
        },
        totalQuestions: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 1,
        correctAnswers: 1,
        totalQuestions: 1,
        accuracy: { $divide: ['$correctAnswers', '$totalQuestions'] }
      }
    },
    { $sort: { accuracy: 1 } },
    { $limit: 5 }
  ]);

  // New: Learning Style Analysis
  const questionTypes = await Question.aggregate([
    {
      $lookup: {
        from: 'examreports',
        localField: '_id',
        foreignField: 'questions.questionId',
        as: 'reports'
      }
    },
    { $unwind: '$reports' },
    { $match: { 'reports.userUuid': studentId } },
    { $unwind: '$reports.questions' },
    { $match: { $expr: { $eq: ['$_id', '$reports.questions.questionId'] } } },
    {
      $group: {
        _id: '$questionType',
        correctAnswers: {
          $sum: { $cond: { if: '$reports.questions.isCorrect', then: 1, else: 0 } }
        },
        totalQuestions: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 1,
        correctAnswers: 1,
        totalQuestions: 1,
        accuracy: { $divide: ['$correctAnswers', '$totalQuestions'] }
      }
    },
    { $sort: { accuracy: -1 } }
  ]);

  // New: Performance Trajectory
  const performanceTrajectory = await ExamReport.aggregate([
    { $match: { userUuid: studentId } },
    { $sort: { examDate: 1 } },
    {
      $group: {
        _id: {
          year: { $year: '$examDate' },
          month: { $month: '$examDate' }
        },
        averageMarks: { $avg: '$obtainedMarks' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Calculate trajectory trend
  let trajectoryTrend = 'stable';
  let improvementRate = 0;
  if (performanceTrajectory.length >= 2) {
    const firstScore = performanceTrajectory[0].averageMarks;
    const lastScore = performanceTrajectory[performanceTrajectory.length - 1].averageMarks;
    const difference = lastScore - firstScore;

    improvementRate = (difference / firstScore) * 100;

    if (improvementRate > 5) trajectoryTrend = 'improving';
    else if (improvementRate < -5) trajectoryTrend = 'declining';
  }

  // New: Personalized Study Plan (AI Recommendation)
  const weakSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks < 50)
    .map((sub: { _id: any }) => sub._id);

  const strongSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks >= 75)
    .map((sub: { _id: any }) => sub._id);

  // Find optimal learning time based on past performance
  const optimalLearningTime =
    learningPatterns.length > 0
      ? `${
          learningPatterns[0]._id.dayOfWeek === 1
            ? 'Sunday'
            : learningPatterns[0]._id.dayOfWeek === 2
            ? 'Monday'
            : learningPatterns[0]._id.dayOfWeek === 3
            ? 'Tuesday'
            : learningPatterns[0]._id.dayOfWeek === 4
            ? 'Wednesday'
            : learningPatterns[0]._id.dayOfWeek === 5
            ? 'Thursday'
            : learningPatterns[0]._id.dayOfWeek === 6
            ? 'Friday'
            : 'Saturday'
        }
    during the ${learningPatterns[0]._id.hourRange}`
      : 'Not enough data';

  // Determine learning style based on question performance
  let learningStyle = 'Balanced';
  if (questionTypes.length >= 3) {
    const bestType = questionTypes[0]._id;
    if (bestType === 'MCQ') learningStyle = 'Visual Learner';
    else if (bestType === 'Essay') learningStyle = 'Reflective Learner';
    else if (bestType === 'Problem') learningStyle = 'Analytical Learner';
    else if (bestType === 'Short Answer') learningStyle = 'Conceptual Learner';
  }

  // Generate personalized study plan
  const studyPlanWeeks = [];
  if (weakSubjects.length > 0) {
    // Sort knowledge gaps by most problematic first
    const sortedGaps = knowledgeGaps.sort(
      (a: { accuracy: number }, b: { accuracy: number }) => a.accuracy - b.accuracy
    );

    // Create weekly study plan focusing on weak areas
    for (let i = 0; i < Math.min(4, sortedGaps.length); i++) {
      studyPlanWeeks.push({
        week: i + 1,
        focus: sortedGaps[i]._id,
        recommendedHours: 4 - Math.floor(sortedGaps[i].accuracy * 3), // More time for lower accuracy
        resources: [
          `Practice exercises on ${sortedGaps[i]._id}`,
          `Review fundamentals of ${sortedGaps[i]._id}`,
          `Complete homework assignments related to ${sortedGaps[i]._id}`
        ]
      });
    }
  }

  return {
    studentName: studentInfo?.name || 'Student',
    summary: {
      totalClassesAttended,
      totalTeachers,
      totalFeesPaid: totalFeesPaid.length > 0 ? totalFeesPaid[0].total : 0
    },
    performanceAnalytics: {
      examReports: examReports.length,
      subjectWisePerformance,
      attendanceTrends,
      teacherRatings,
      batchWisePerformance,
      learningPatterns, // New: When student performs best (time of day, day of week)
      knowledgeGaps, // New: Specific topics where student struggles
      questionTypes, // New: Performance by question type
      performanceTrajectory // New: Progress over time
    },
    aiInsights: {
      learningProfile: {
        learningStyle,
        optimalLearningTime,
        strengths: strongSubjects,
        weaknesses: weakSubjects,
        improvementRate: improvementRate.toFixed(2) + '%',
        trajectoryTrend
      },
      studyPlan:
        studyPlanWeeks.length > 0
          ? studyPlanWeeks
          : [
              {
                week: 1,
                focus: 'General review',
                recommendedHours: 3,
                resources: ['Complete practice tests', 'Review class notes']
              }
            ]
    },
    recommendations: {
      studyStrategy:
        weakSubjects.length > 0
          ? `Focus more on ${weakSubjects.join(
              ', '
            )} to improve your scores. Our AI analysis shows you learn best as a ${learningStyle}.`
          : 'Keep up the good work! Consider exploring advanced topics in your strong subjects.',
      timeManagement: `Based on your past performance, you learn best on ${optimalLearningTime}. Try to schedule your study sessions during these times.`,
      resourceRecommendation:
        knowledgeGaps.length > 0
          ? `We've detected knowledge gaps in ${knowledgeGaps[0]._id}. Check out the recommended resources in your personalized study plan.`
          : 'Your knowledge seems well-rounded across topics.',
      testTakingStrategy:
        questionTypes.length > 0
          ? `You perform best on ${questionTypes[0]._id} questions and struggle with ${
              questionTypes[questionTypes.length - 1]._id
            }. Practice more with the latter type.`
          : 'Continue practicing with a variety of question types to maintain balanced skills.',
      weakSubjects,
      strongSubjects,
      advice:
        weakSubjects.length > 0
          ? `Focus more on ${weakSubjects.join(', ')} to improve your scores.`
          : 'Keep up the good work!'
    }
  };
};

// Parent-specific reports with enhanced AI insights
const getParentReports = async (parentId: string) => {
  const parentInfo = await Parent.findById(parentId);
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

  // New: Comparative Child Performance Analysis
  const comparativeChildPerformance = await Promise.all(
    childrenIds.map(async (childId: { toString: () => any }) => {
      const studentInfo = await Student.findById(childId);
      const examData = await ExamReport.aggregate([
        { $match: { userUuid: childId.toString() } },
        { $sort: { examDate: 1 } },
        {
          $group: {
            _id: null,
            examCount: { $sum: 1 },
            averageMarks: { $avg: '$obtainedMarks' },
            recentMarks: { $last: '$obtainedMarks' },
            improvement: { $subtract: [{ $last: '$obtainedMarks' }, { $first: '$obtainedMarks' }] }
          }
        }
      ]);

      const subjectPerformance = await ExamReport.aggregate([
        { $match: { userUuid: childId.toString() } },
        {
          $group: {
            _id: '$subject',
            averageMarks: { $avg: '$obtainedMarks' },
            examCount: { $sum: 1 }
          }
        },
        { $sort: { averageMarks: -1 } }
      ]);

      const attendanceRate = await Booking.aggregate([
        {
          $match: {
            studentId: childId,
            startingDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) }
          }
        },
        {
          $group: {
            _id: null,
            totalScheduled: { $sum: 1 },
            totalAttended: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } }
          }
        },
        {
          $project: {
            attendanceRate: {
              $multiply: [{ $divide: ['$totalAttended', { $max: ['$totalScheduled', 1] }] }, 100]
            }
          }
        }
      ]);

      return {
        childId,
        name: studentInfo?.name || `Child ${childId}`,
        performanceData: examData.length > 0 ? examData[0] : { examCount: 0, averageMarks: 0, improvement: 0 },
        topSubjects: subjectPerformance.slice(0, 2).map((sub: { _id: any }) => sub._id),
        weakSubjects: subjectPerformance.slice(-2).map((sub: { _id: any }) => sub._id),
        attendanceRate: attendanceRate.length > 0 ? attendanceRate[0].attendanceRate : 100
      };
    })
  );

  // New: ROI Analysis on Education Spending
  const educationROI = await Promise.all(
    childrenIds.map(async (childId: { toString: () => any }) => {
      const studentInfo = await Student.findById(childId);
      const feesPaid = await Booking.aggregate([
        { $match: { studentId: childId, status: 'paid' } },
        { $group: { _id: '$subjects', totalFees: { $sum: '$fees' } } }
      ]);

      const subjectPerformance = await ExamReport.aggregate([
        { $match: { userUuid: childId.toString() } },
        { $group: { _id: '$subject', averageMarks: { $avg: '$obtainedMarks' } } }
      ]);

      // Calculate ROI by subject as improvement per dollar spent
      const subjectROI = feesPaid.map((subject: { _id: any; totalFees: number }) => {
        const performance = subjectPerformance.find((perf: { _id: any }) => perf._id === subject._id);

        return {
          subject: subject._id,
          feesPaid: subject.totalFees,
          marks: performance ? performance.averageMarks : 0,
          roi: performance ? (performance.averageMarks / subject.totalFees) * 100 : 0
        };
      });

      return {
        childId,
        name: studentInfo?.name || `Child ${childId}`,
        subjectROI: subjectROI.sort((a: { roi: number }, b: { roi: number }) => b.roi - a.roi)
      };
    })
  );

  // New: AI-generated Educational Insights
  const developmentalInsights = await Promise.all(
    childrenIds.map(async (childId: { toString: () => any }) => {
      const studentInfo = await Student.findById(childId);

      // Determine learning style from question types
      const learningStyle = await Question.aggregate([
        {
          $lookup: {
            from: 'examreports',
            localField: '_id',
            foreignField: 'questions.questionId',
            as: 'reports'
          }
        },
        { $unwind: '$reports' },
        { $match: { 'reports.userUuid': childId.toString() } },
        { $unwind: '$reports.questions' },
        { $match: { $expr: { $eq: ['$_id', '$reports.questions.questionId'] } } },
        {
          $group: {
            _id: '$questionType',
            correctAnswers: {
              $sum: { $cond: { if: '$reports.questions.isCorrect', then: 1, else: 0 } }
            },
            totalQuestions: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 1,
            accuracy: { $divide: ['$correctAnswers', '$totalQuestions'] }
          }
        },
        { $sort: { accuracy: -1 } },
        { $limit: 1 }
      ]);

      // Identify specific challenges
      const challenges = await ExamReport.aggregate([
        { $match: { userUuid: childId.toString() } },
        { $unwind: '$questions' },
        { $match: { 'questions.isCorrect': false } },
        {
          $lookup: {
            from: 'questions',
            localField: 'questions.questionId',
            foreignField: '_id',
            as: 'questionDetails'
          }
        },
        { $unwind: '$questionDetails' },
        {
          $group: {
            _id: '$questionDetails.topic',
            incorrectCount: { $sum: 1 }
          }
        },
        { $sort: { incorrectCount: -1 } },
        { $limit: 3 }
      ]);

      return {
        childId,
        name: studentInfo?.name || `Child ${childId}`,
        preferredLearningStyle:
          learningStyle.length > 0
            ? learningStyle[0]._id === 'MCQ'
              ? 'Visual'
              : learningStyle[0]._id === 'Essay'
              ? 'Verbal'
              : learningStyle[0]._id === 'Problem'
              ? 'Analytical'
              : 'Mixed'
            : 'Undetermined',
        challenges: challenges.map((challenge: { _id: any }) => challenge._id),
        recommendedApproach:
          learningStyle.length > 0
            ? learningStyle[0]._id === 'MCQ'
              ? 'Use visual aids, diagrams, and charts for studying'
              : learningStyle[0]._id === 'Essay'
              ? 'Encourage verbal discussions and written explanations'
              : learningStyle[0]._id === 'Problem'
              ? 'Provide structured problem sets with increasing difficulty'
              : 'Use a balanced approach with various teaching methods'
            : 'Use a variety of teaching methods to determine preferred style'
      };
    })
  );

  // New: Resource Utilization Efficiency
  const resourceEfficiency = await Promise.all(
    childrenIds.map(async (childId: { toString: () => any }) => {
      const resources = await Resources.find({ accessibleTo: childId });
      const resourceIds = resources.map((resource: { _id: any }) => resource._id);

      // Calculate which resources led to improved performance
      const impactAnalysis = [];
      for (const resourceId of resourceIds) {
        const resource = await Resources.findById(resourceId);
        const beforeAccess = await ExamReport.aggregate([
          {
            $match: {
              userUuid: childId.toString(),
              examDate: { $lt: resource.createdAt }
            }
          },
          {
            $group: {
              _id: resource.subject,
              averageMarks: { $avg: '$obtainedMarks' }
            }
          }
        ]);

        const afterAccess = await ExamReport.aggregate([
          {
            $match: {
              userUuid: childId.toString(),
              subject: resource.subject,
              examDate: { $gt: resource.createdAt }
            }
          },
          {
            $group: {
              _id: resource.subject,
              averageMarks: { $avg: '$obtainedMarks' }
            }
          }
        ]);

        if (beforeAccess.length > 0 && afterAccess.length > 0) {
          const improvement = afterAccess[0].averageMarks - beforeAccess[0].averageMarks;
          impactAnalysis.push({
            resourceId,
            resourceName: resource.name,
            subject: resource.subject,
            improvement,
            impactScore: improvement > 0 ? 'Positive' : improvement < 0 ? 'Negative' : 'Neutral'
          });
        }
      }

      return {
        childId,
        resourcesCount: resources.length,
        impactAnalysis: impactAnalysis.sort((a, b) => b.improvement - a.improvement)
      };
    })
  );

  // Suggestions for Parents
  const weakSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks < 50)
    .map((sub: { _id: any }) => sub._id);
  const strongSubjects = subjectWisePerformance
    .filter((sub: { averageMarks: number }) => sub.averageMarks >= 75)
    .map((sub: { _id: any }) => sub._id);

  return {
    parentName: parentInfo?.name || 'Parent',
    summary: {
      totalChildren: children.length,
      totalClassesAttended,
      totalFeesPaid: totalFeesPaid.length > 0 ? totalFeesPaid[0].total : 0
    },
    performanceAnalytics: {
      childrenPerformance: childrenPerformance.length,
      childWisePerformance,
      subjectWisePerformance,
      teacherRatings,
      batchWisePerformance
    },
    aiInsights: {
      comparativeChildPerformance, // New: Compare performance between children
      educationROI, // New: Return on investment analysis for education spending
      developmentalInsights, // New: AI analysis of learning styles and challenges
      resourceEfficiency, // New: Analysis of which resources have been most effective
      familyOverview: {
        overallProgress:
          comparativeChildPerformance.reduce((sum, child) => sum + (child.performanceData.improvement || 0), 0) /
          comparativeChildPerformance.length,
        mostImprovedChild: comparativeChildPerformance.sort(
          (a, b) => (b.performanceData.improvement || 0) - (a.performanceData.improvement || 0)
        )[0]?.name,
        mostChallengedChild: comparativeChildPerformance.sort(
          (a, b) => (a.performanceData.averageMarks || 0) - (b.performanceData.averageMarks || 0)
        )[0]?.name,
        bestAttendance: comparativeChildPerformance.sort((a, b) => (b.attendanceRate || 0) - (a.attendanceRate || 0))[0]
          ?.name
      }
    },
    recommendations: {
      familySupport:
        weakSubjects.length > 0
          ? `Our AI analysis suggests your children need more support in ${weakSubjects.join(
              ', '
            )}. Consider discussing these subjects during family time.`
          : 'Your children are performing well across all subjects!',
      resourceAllocation:
        educationROI.length > 0
          ? `Based on performance improvements per rupee spent, investing more in ${
              educationROI[0].subjectROI?.[0]?.subject || 'current subjects'
            } classes may yield the best results.`
          : 'Continue with balanced investment across subjects.',
      individualFocus: developmentalInsights
        .map(
          (child) =>
            `${child.name} learns best through ${child.preferredLearningStyle} methods. ${
              child.challenges.length > 0 ? `Focus on helping with ${child.challenges[0]}.` : ''
            }`
        )
        .join(' '),
      learningEnvironment: 'Consider creating a dedicated study space at home with minimal distractions.',
      weakSubjects,
      strongSubjects,
      advice:
        weakSubjects.length > 0
          ? `Encourage your children to focus more on ${weakSubjects.join(', ')}.`
          : 'Your children are performing well!'
    }
  };
};

// Admin and Super Admin reports with enhanced AI insights
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
  const totalExamPapers = await QuestionPaper.countDocuments();

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

  // Subject Popularity
  const subjectPopularity = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: '$subjects', totalBookings: { $sum: 1 } } },
    { $sort: { totalBookings: -1 } }
  ]);

  // New: User Growth Analysis
  const userGrowthTrend = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        newUsers: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Calculate growth rate
  const userGrowthRate =
    userGrowthTrend.length >= 2
      ? (userGrowthTrend[userGrowthTrend.length - 1].newUsers / userGrowthTrend[userGrowthTrend.length - 2].newUsers -
          1) *
        100
      : 0;

  // New: Revenue Analysis
  const revenueAnalysis = await Booking.aggregate([
    { $match: { status: 'paid' } },
    {
      $group: {
        _id: {
          year: { $year: '$startingDate' },
          month: { $month: '$startingDate' }
        },
        revenue: { $sum: '$fees' },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Calculate revenue trends
  const revenueTrend =
    revenueAnalysis.length >= 3
      ? (revenueAnalysis[revenueAnalysis.length - 1].revenue / revenueAnalysis[revenueAnalysis.length - 3].revenue -
          1) *
        100
      : 0;

  // New: Average Revenue Per User
  const arpu = totalEarnings.length > 0 && totalStudents > 0 ? totalEarnings[0].total / totalStudents : 0;

  // New: Teacher Effectiveness Correlation
  const teacherEffectiveness = await Teachers.aggregate([
    {
      $lookup: {
        from: 'reviewsratings',
        localField: '_id',
        foreignField: 'foreignId',
        as: 'ratings'
      }
    },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'teacherId',
        as: 'bookings'
      }
    },
    {
      $lookup: {
        from: 'examreports',
        localField: '_id',
        foreignField: 'teacherId',
        as: 'examReports'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        averageRating: { $avg: '$ratings.rating' },
        totalBookings: { $size: '$bookings' },
        averageStudentPerformance: { $avg: '$examReports.obtainedMarks' }
      }
    },
    { $match: { averageRating: { $exists: true }, averageStudentPerformance: { $exists: true } } }
  ]);

  // Calculate correlation between ratings and student performance
  let correlation = 0;
  if (teacherEffectiveness.length > 2) {
    // Simple correlation calculation
    const ratings = teacherEffectiveness.map((t: { averageRating: any }) => t.averageRating || 0);
    const performances = teacherEffectiveness.map(
      (t: { averageStudentPerformance: any }) => t.averageStudentPerformance || 0
    );

    const avgRating = ratings.reduce((a: any, b: any) => a + b, 0) / ratings.length;
    const avgPerformance = performances.reduce((a: any, b: any) => a + b, 0) / performances.length;

    let numerator = 0;
    let denomRating = 0;
    let denomPerformance = 0;

    for (let i = 0; i < ratings.length; i++) {
      const ratingDiff = ratings[i] - avgRating;
      const perfDiff = performances[i] - avgPerformance;
      numerator += ratingDiff * perfDiff;
      denomRating += ratingDiff * ratingDiff;
      denomPerformance += perfDiff * perfDiff;
    }

    correlation = numerator / (Math.sqrt(denomRating) * Math.sqrt(denomPerformance));
  }

  // New: Platform Utilization Metrics
  const resourceUtilization = await Resources.aggregate([
    {
      $lookup: {
        from: 'examreports',
        localField: 'accessibleTo',
        foreignField: 'userUuid',
        as: 'examReports'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        subject: 1,
        type: 1,
        utilizationScore: { $size: '$examReports' }
      }
    },
    { $sort: { utilizationScore: -1 } }
  ]);

  // New: Churn Risk Analysis
  const churnRiskStudents = await Student.aggregate([
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'studentId',
        as: 'bookings'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        lastBooking: { $max: '$bookings.startingDate' },
        daysSinceLastBooking: {
          $trunc: {
            $divide: [{ $subtract: [new Date(), { $max: '$bookings.startingDate' }] }, 1000 * 60 * 60 * 24]
          }
        },
        totalBookings: { $size: '$bookings' }
      }
    },
    {
      $match: {
        $or: [{ daysSinceLastBooking: { $gt: 45 } }, { totalBookings: { $lt: 2 } }]
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        daysSinceLastBooking: 1,
        totalBookings: 1,
        churnRisk: {
          $cond: {
            if: { $gt: ['$daysSinceLastBooking', 60] },
            then: 'High',
            else: {
              $cond: {
                if: { $gt: ['$daysSinceLastBooking', 45] },
                then: 'Medium',
                else: 'Low'
              }
            }
          }
        }
      }
    },
    { $sort: { daysSinceLastBooking: -1 } }
  ]);

  // New: AI Predictions
  // 1. Revenue Forecast
  const revenueForecast = { nextMonth: 0, nextQuarter: 0 };
  if (revenueAnalysis.length >= 3) {
    const last3Months = revenueAnalysis.slice(-3);
    const avgMonthlyRevenue = last3Months.reduce((sum: any, month: { revenue: any }) => sum + month.revenue, 0) / 3;
    const growthRate =
      revenueAnalysis.length >= 6
        ? last3Months.reduce((sum: any, month: { revenue: any }) => sum + month.revenue, 0) /
            revenueAnalysis.slice(-6, -3).reduce((sum: any, month: { revenue: any }) => sum + month.revenue, 0) -
          1
        : 0;

    revenueForecast.nextMonth = avgMonthlyRevenue * (1 + growthRate);
    revenueForecast.nextQuarter = avgMonthlyRevenue * 3 * (1 + growthRate * 2);
  }

  // 2. User Growth Forecast
  const userGrowthForecast = { nextMonth: 0, nextQuarter: 0 };
  if (userGrowthTrend.length >= 3) {
    const last3Months = userGrowthTrend.slice(-3);
    const avgMonthlyGrowth = last3Months.reduce((sum: any, month: { newUsers: any }) => sum + month.newUsers, 0) / 3;
    const userGrowthRate =
      userGrowthTrend.length >= 6
        ? last3Months.reduce((sum: any, month: { newUsers: any }) => sum + month.newUsers, 0) /
            userGrowthTrend.slice(-6, -3).reduce((sum: any, month: { newUsers: any }) => sum + month.newUsers, 0) -
          1
        : 0;

    userGrowthForecast.nextMonth = avgMonthlyGrowth * (1 + userGrowthRate);
    userGrowthForecast.nextQuarter = avgMonthlyGrowth * 3 * (1 + userGrowthRate * 2);
  }

  // 3. Teacher Demand Forecast
  const teacherDemandForecast = await Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'paid'] } } },
    {
      $group: {
        _id: '$teacherId',
        totalBookings: { $sum: 1 },
        latestBooking: { $max: '$startingDate' }
      }
    },
    { $match: { latestBooking: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) } } },
    { $sort: { totalBookings: -1 } },
    { $limit: 10 }
  ]);

  const inDemandTeachers = await Promise.all(
    teacherDemandForecast.map(async (teacher: { _id: any; totalBookings: any }) => {
      const teacherInfo = await Teachers.findById(teacher._id);
      return {
        name: teacherInfo?.name || 'Unknown Teacher',
        id: teacher._id,
        totalBookings: teacher.totalBookings,
        subjects: teacherInfo?.subjects || []
      };
    })
  );

  // Strategic opportunity identification
  const strategicOpportunities = [];

  // 1. Identify underserved subjects
  const subjectDemandVsSupply = await Promise.all(
    subjectPopularity.slice(0, 5).map(async (subject: { _id: any; totalBookings: number }) => {
      const teachersOffering = await Teachers.countDocuments({ subjects: subject._id });
      return {
        subject: subject._id,
        demand: subject.totalBookings,
        supply: teachersOffering,
        ratio: subject.totalBookings / (teachersOffering || 1)
      };
    })
  );

  // Add high demand/low supply subjects as opportunities
  const underservedSubjects = subjectDemandVsSupply
    .filter((subject) => subject.ratio > 10)
    .map((subject) => subject.subject);

  if (underservedSubjects.length > 0) {
    strategicOpportunities.push({
      type: 'Teacher Recruitment',
      description: `Recruit more teachers for ${underservedSubjects.join(', ')} to meet high demand.`,
      potentialImpact: 'High',
      urgency: 'Medium'
    });
  }

  // 2. Identify retention issues
  if (churnRiskStudents.length > 0.1 * totalStudents) {
    // If more than 10% at risk
    strategicOpportunities.push({
      type: 'Student Retention Program',
      description: `${churnRiskStudents.length} students are at risk of churning. Consider implementing a retention program.`,
      potentialImpact: 'High',
      urgency: 'High'
    });
  }

  // 3. Resource optimization
  const underutilizedResources = resourceUtilization.filter(
    (resource: { utilizationScore: number }) => resource.utilizationScore < 5
  ).length;

  if (underutilizedResources > 0.2 * totalResources) {
    // If more than 20% underutilized
    strategicOpportunities.push({
      type: 'Resource Optimization',
      description: `${underutilizedResources} resources are underutilized. Consider promoting these materials or replacing them.`,
      potentialImpact: 'Medium',
      urgency: 'Low'
    });
  }

  return {
    summary: {
      totalTeachers,
      totalStudents,
      totalParents,
      totalClasses,
      totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
      totalResources,
      totalExamPapers
    },
    platformAnalytics: {
      monthlyEarningsTrend,
      teacherPerformance,
      studentEngagement,
      subjectPopularity,
      userGrowthTrend, // New: Track user growth over time
      revenueAnalysis, // New: Detailed revenue breakdown by month
      arpu, // New: Average Revenue Per User
      teacherEffectiveness, // New: Correlation between teacher ratings and student performance
      teacherRatingToPerformanceCorrelation: correlation.toFixed(2),
      resourceUtilization, // New: How effectively are resources being used
      churnRiskStudents // New: Students at risk of leaving the platform
    },
    aiPredictions: {
      revenueForecast, // New: Projected earnings
      userGrowthForecast, // New: Projected user growth
      highDemandTeachers: inDemandTeachers, // New: Teachers likely to be in high demand
      underservedSubjects // New: Subjects with high demand but low teacher supply
    },
    strategicInsights: {
      platformHealth:
        userGrowthRate > 0 && revenueTrend > 0
          ? 'Growing'
          : userGrowthRate > 0 && revenueTrend <= 0
          ? 'Mixed - Growing Users but Declining Revenue'
          : userGrowthRate <= 0 && revenueTrend > 0
          ? 'Mixed - Declining Users but Growing Revenue'
          : 'Declining',
      teacherQuality:
        correlation > 0.7
          ? 'Strong connection between teacher ratings and student performance'
          : correlation > 0.3
          ? 'Moderate connection between teacher ratings and student performance'
          : 'Weak connection between teacher ratings and student performance',
      retentionConcerns:
        churnRiskStudents.length > 0.2 * totalStudents
          ? 'High'
          : churnRiskStudents.length > 0.1 * totalStudents
          ? 'Medium'
          : 'Low',
      strategicOpportunities
    },
    recommendations: {
      growthStrategy:
        underservedSubjects.length > 0
          ? `Focus on recruiting teachers for ${underservedSubjects.join(', ')} to meet demand and increase revenue.`
          : 'Focus on general platform growth through marketing and feature enhancements.',
      retentionStrategy:
        churnRiskStudents.length > 0
          ? `Implement a retention program targeting ${churnRiskStudents.length} at-risk students, potentially through personalized outreach or special offers.`
          : 'Continue monitoring student engagement to maintain high retention rates.',
      resourceOptimization:
        underutilizedResources > 0
          ? `Review and potentially replace ${underutilizedResources} underutilized resources to improve educational outcomes.`
          : 'Current resource utilization is healthy; consider adding more advanced materials.',
      teacherDevelopment:
        correlation < 0.3
          ? 'Implement additional teacher training programs to strengthen the connection between teaching quality and student outcomes.'
          : 'Current teacher performance is strongly connected to student outcomes; consider recognition programs for top teachers.',
      marketExpansion:
        userGrowthRate < 5
          ? 'Consider expanding to new geographic regions or adding new subject categories to accelerate user growth.'
          : 'Current growth rate is healthy; focus on maintaining quality while scaling operations.',
      pricingStrategy:
        arpu < (totalEarnings.length > 0 ? (totalEarnings[0].total / totalStudents) * 1.2 : 0)
          ? 'Consider strategic price increases for premium offerings to improve ARPU without impacting accessibility.'
          : 'Current pricing strategy is optimal; focus on increasing value to justify current pricing.'
    }
  };
};
