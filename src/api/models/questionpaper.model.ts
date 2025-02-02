export {};
const mongoose = require('mongoose');
import { transformData, listData } from '../../api/utils/ModelUtils';

// Question Schema
const questionSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    difficultyLevel: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        lowercase: true,
        default: "medium"
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    educationClass: {
        type: String,
        required: true,
        trim: true
    },
    board: {
        type: String,
        required: true,
        trim: true
    },
    topic: {
        type: String,
        trim: true
    },
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: [{
        uuid: {
            type: String,
            required: true,
            default: () => require('uuid').v4()
        },
        text: {
            type: String,
            required: true,
            trim: true
        }
    }],
    isMCQ: {
        type: Boolean,
        required: true,
        default: true
    },
    imgSrc: {
        type: String,
        trim: true
    },
    language: {
        type: String,
        trim: true,
        default: 'english'
    },
    marks: {
        type: Number,
        default: 1,
        minimum: 1,
        maximum: 10
    }
}, {
    timestamps: true
});

// Question Paper Schema
const questionPaperSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    userUuid: {
        type: String,
        required: true,
        ref: 'User' // Link User model
    },
    questions: [{
        type: String, // Question UUID
        required: true,
        ref: 'Question'
    }],
    answered: {
        type: Boolean,
        default: false
    },
    studentAnswers: [{
        questionUuid: {
            type: String,
            required: true
        },
        answer: [{
            type: String,
            required: true
        }],
        marks: {
            type: Number,
            default: 0
        }
    }],
    totalMarks: {
        type: Number,
        default: 0,
        minimum: 0,
        maximum: 100
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'evaluated'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Answer Schema
const answerSchema = new mongoose.Schema({
    questionUuid: {
        type: String,
        required: true,
        ref: 'Question'
    },
    correctAnswers: [{
        type: String, // Option UUID
        required: true
    }],
    explanation: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Report Schema
const reportSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    questionPaperUuid: {
        type: String,
        required: true,
        ref: 'QuestionPaper'
    },
    userUuid: {
        type: String,
        required: true,
        ref: 'User'
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    attemptedQuestions: {
        type: Number,
        required: true,
        default: 0
    },
    correctAnswers: {
        type: Number,
        required: true,
        default: 0
    },
    totalMarks: {
        type: Number,
        required: true,
        default: 0
    },
    obtainedMarks: {
        type: Number,
        required: true,
        default: 0
    },
    percentage: {
        type: Number,
        required: true,
        default: 0
    },
    timeTaken: {
        type: Number, // in seconds
        required: true,
        default: 0
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create indexes
questionSchema.index({ });
questionPaperSchema.index({ });
answerSchema.index({ });
reportSchema.index({ userUuid: 1, questionPaperUuid: 1 });

// Create models
const Question = mongoose.model('Question', questionSchema);
const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);
const Answer = mongoose.model('Answer', answerSchema);
const Report = mongoose.model('Report', reportSchema);

module.exports = {
    Question,
    QuestionPaper,
    Answer,
    Report
};