export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { apiJson } from '../../api/utils/Utils';
import { processQuestionImage } from '../utils/imageUtils';
const { handler: errorHandler } = require('../middlewares/error');
const { Question, QuestionPaper, Answer, Report } = require('../models/questionpaper.model');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// add total_marks & total_time
async function generateQuestionPaperAndStore(
  queryObject: {
    class_range: any;
    boards: any;
    subjects: any;
    total_number_of_questions: any;
    difficulty: any;
    question_paper_language: any;
    topic: any;
    questionType: any;
  },
  userUuid: any
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Call external API to get questions
    const response = await axios.post(process.env.AI_ENDPOINT, queryObject);
    const questionsData = response.data.questions;
    let totalMarks = 0;
    let finalQuestions: any[] = [];

    // 2. Process and store questions
    const questionPromises = questionsData.map(
      async (qData: {
        options: any[];
        subject: any;
        class: any;
        board: any;
        question: any;
        image: any;
        correctAnswer: string;
      }) => {
        // Format options with UUIDs
        const options = qData.options.map((opt: any) => ({
          uuid: uuidv4(),
          text: opt
        }));

        // Create question document
        const question = new Question({
          uuid: uuidv4(),
          difficultyLevel: queryObject.difficulty,
          subject: qData.subject,
          educationClass: qData.class,
          board: qData.board,
          topic: queryObject.topic,
          question: qData.question,
          options: options,
          questionType: queryObject.questionType,
          imgSrc: qData.image || null,
          language: queryObject.question_paper_language,
          marks: 1 // Default or can be customized
        });

        if (question.imgSrc) {
          processQuestionImage(question.uuid, question.imgSrc);
        }
        totalMarks += question.marks;

        // Save question
        await question.save({ session });

        // Create and save answer
        if (qData.correctAnswer) {
          const answer = new Answer({
            questionUuid: question.uuid,
            correctAnswers: qData.correctAnswer,
            explanation: null // Can be added if available in API response
          });

          await answer.save({ session });
        }

        finalQuestions.push(question);

        return question.uuid;
      }
    );

    // Wait for all questions and answers to be stored
    const questionUuids = await Promise.all(questionPromises);

    // 3. Create question paper
    const questionPaper = new QuestionPaper({
      uuid: uuidv4(),
      userUuid: userUuid,
      questions: questionUuids,
      answered: false,
      studentAnswers: [],
      totalMarks: totalMarks,
      status: 'pending'
    });

    await questionPaper.save({ session });

    // 4. Create initial report
    const report = new Report({
      uuid: uuidv4(),
      questionPaperUuid: questionPaper.uuid,
      userUuid: userUuid,
      totalQuestions: questionUuids.length,
      attemptedQuestions: 0,
      correctAnswers: 0,
      totalMarks: totalMarks,
      obtainedMarks: 0,
      percentage: 0,
      timeTaken: 0
    });

    await report.save({ session });

    // 5. Commit transaction
    await session.commitTransaction();

    return {
      questionPaper: questionPaper,
      finalQuestions: finalQuestions
    };
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    console.error('Error in generateQuestionPaperAndStore:', error);
    throw {
      success: false,
      error: error.message
    };
  } finally {
    session.endSession();
  }
}

/**
 * Generates a question paper based on provided criteria and stores it in DB
 * @route POST /api/v1/questions/generate
 */
const generateQuestionPaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Destructure and validate request parameters
    const {
      difficultyLevel = 'medium',
      subject = [],
      educationalClass = [],
      board = [],
      topic = [],
      questionType = 'mcq',
      numberOfQuestions = 20,
      timeToAnswer = 15,
      maximumMarks = 20,
      language = 'english',
      userUuid
    } = req.body;

    // Validate mandatory fields
    if (!subject.length || !educationalClass.length || !board.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // Build query object for mongoose
    const queryObject = {
      class_range: educationalClass.toString(),
      boards: board.toString(),
      subjects: subject.toString(),
      total_number_of_questions: numberOfQuestions,
      difficulty: difficultyLevel,
      question_paper_language: language,
      topic: topic || null,
      questionType: questionType
    };

    // Fetch questions based on criteria
    const questionPaper = await generateQuestionPaperAndStore(queryObject, userUuid);

    if (!questionPaper.questionPaper.questions.length) {
      return res.status(404).json({
        success: false,
        error: 'No questions found matching the criteria'
      });
    }

    questionPaper.questionPaper.questions = questionPaper.questionPaper.finalQuestions;
    return res.status(201).json({
      success: true,
      data: questionPaper.questionPaper
    });
  } catch (error) {
    console.error('Error in generateQuestionPaper:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Corrects a question paper based on provided criteria and stores it in DB
 * @route POST /api/v1/questions/evaluate
 */
//studentAnswers will be format [{questionUuid: uuid of question, answer: array or string}]
const evaluateQuestionPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { questionPaperUuid, studentAnswers } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch question paper with all details
    const questionPaper = await QuestionPaper.findOne({ uuid: questionPaperUuid });
    if (!questionPaper) {
      throw new Error('Question paper not found');
    }

    questionPaper.studentAnswers = studentAnswers;

    // Get all questions
    const questions = await Question.find({
      uuid: { $in: questionPaper.questions }
    });

    // Get all correct answers
    const answers = await Answer.find({
      questionUuid: { $in: questionPaper.questions }
    });

    // Create answer map for quick lookup
    const answersMap = answers.reduce((acc: { [x: string]: any }, ans: { questionUuid: string | number }) => {
      acc[ans.questionUuid] = ans;
      return acc;
    }, {});

    // Separate MCQ and non-MCQ questions
    const mcqQuestions = questions.filter((q: { questionType: string }) => q.questionType === 'mcq');
    const nonMcqQuestions = questions.filter((q: { questionType: string }) => q.questionType !== 'mcq');

    // Initialize evaluation results
    let totalMarks = 0;
    let obtainedMarks = 0;
    let correctAnswers = 0;
    let evaluatedAnswers = [];

    // Process MCQ questions
    for (const question of mcqQuestions) {
      const studentAnswer = questionPaper.studentAnswers.find(
        (ans: { questionUuid: any }) => ans.questionUuid === question.uuid
      );

      if (studentAnswer) {
        const correctAnswer = answersMap[question.uuid];
        const isCorrect = evaluateMCQ(studentAnswer.answer, correctAnswer.correctAnswers);

        evaluatedAnswers.push({
          questionUuid: question.uuid,
          answer: studentAnswer.answer,
          marks: isCorrect ? question.marks : 0,
          isCorrect
        });

        totalMarks += question.marks;
        if (isCorrect) {
          obtainedMarks += question.marks;
          correctAnswers++;
        }
      }
    }

    // Process non-MCQ questions
    if (nonMcqQuestions.length > 0) {
      const nonMcqResults = await evaluateNonMCQ(nonMcqQuestions, questionPaper.studentAnswers);

      evaluatedAnswers = [...evaluatedAnswers, ...nonMcqResults.evaluatedAnswers];
      totalMarks += nonMcqResults.totalMarks;
      obtainedMarks += nonMcqResults.obtainedMarks;
      correctAnswers += nonMcqResults.correctAnswers;
    }

    // Calculate percentage
    const percentage = (obtainedMarks / totalMarks) * 100;

    // Update question paper
    await QuestionPaper.findOneAndUpdate(
      { uuid: questionPaperUuid },
      {
        $set: {
          status: 'evaluated',
          studentAnswers: evaluatedAnswers,
          totalMarks,
          answered: true
        }
      },
      { session }
    );

    // Update or create report
    await Report.findOneAndUpdate(
      { questionPaperUuid },
      {
        $set: {
          totalQuestions: questions.length,
          attemptedQuestions: evaluatedAnswers.length,
          correctAnswers,
          totalMarks,
          obtainedMarks,
          percentage,
          submittedAt: new Date()
        }
      },
      { upsert: true, session }
    );

    await session.commitTransaction();

    return {
      success: true,
      totalMarks,
      obtainedMarks,
      percentage,
      evaluatedAnswers
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

function evaluateMCQ(studentAnswers: any[], correctAnswers: any[]) {
  // Handle both single and multiple correct answers
  if (!Array.isArray(studentAnswers)) {
    studentAnswers = [studentAnswers];
  }

  // If lengths don't match in case of multiple correct answers, it's wrong
  if (studentAnswers.length !== correctAnswers.length) {
    return false;
  }

  // Check if all answers match
  return (
    studentAnswers.every((ans: any) => correctAnswers.includes(ans)) &&
    correctAnswers.every((ans: any) => studentAnswers.includes(ans))
  );
}

// Non MCQ to be evaluated later based on the AI API response
async function evaluateNonMCQ(questions: any[], studentAnswers: any[]) {
  try {
    // Prepare data for API
    const evaluationData = questions.map((question: { uuid: any; question: any; marks: any }) => {
      const studentAnswer = studentAnswers.find((ans: { questionUuid: any }) => ans.questionUuid === question.uuid);

      return {
        questionUuid: question.uuid,
        question: question.question,
        studentAnswer: studentAnswer ? studentAnswer.answer[0] : null,
        maxMarks: question.marks
      };
    });

    // Call external API for evaluation
    const response = await axios.post(process.env.AI_ENDPOINT, { answers: evaluationData });

    // Process API response
    let totalMarks = 0;
    let obtainedMarks = 0;
    let correctAnswers = 0;

    const evaluatedAnswers = response.data.evaluations.map(
      (evalu: { maxMarks: number; marksObtained: number; questionUuid: any; feedback: any }) => {
        totalMarks += evalu.maxMarks;
        obtainedMarks += evalu.marksObtained;
        if (evalu.marksObtained === evalu.maxMarks) {
          correctAnswers++;
        }

        return {
          questionUuid: evalu.questionUuid,
          answer: studentAnswers.find((ans: { questionUuid: any }) => ans.questionUuid === evalu.questionUuid).answer,
          marks: evalu.marksObtained,
          isCorrect: evalu.marksObtained === evalu.maxMarks,
          feedback: evalu.feedback
        };
      }
    );

    return {
      evaluatedAnswers,
      totalMarks,
      obtainedMarks,
      correctAnswers
    };
  } catch (error) {
    console.error('Error evaluating non-MCQ answers:', error);
    throw new Error('Failed to evaluate non-MCQ answers');
  }
}

module.exports = {
  generateQuestionPaper,
  evaluateQuestionPaper
};
