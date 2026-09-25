const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  codeSnippet: { type: String, default: '' },
  studentAnswer: { type: String, default: '' },
  studentAnswerSubmittedAt: { type: Date, default: null },
  aiAnalysis: { type: String, default: '' },
  socraticChallenge: { type: String, default: '' },
  studentDefense: { type: String, default: '' },
  studentDefenseSubmittedAt: { type: Date, default: null },
  stepState: {
    type: String,
    enum: ['awaiting_initial_answer', 'awaiting_defense', 'evaluated'],
    default: 'awaiting_initial_answer'
  },
  evaluation: {
    initialAnswerScore: { type: Number, default: 0 },
    defenseScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    understanding: { type: String, default: '' },
    misconceptions: [{ type: String }],
    feedback: { type: String, default: '' },
    masteryImpact: { type: Number, default: 0 }
  }
});

const quizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    topic: {
      type: String,
      required: true
    },
    totalQuestions: {
      type: Number,
      default: 3
    },
    currentQuestionIndex: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress'
    },
    aiModel: {
      type: String,
      default: 'groq/compound'
    },
    promptVersion: {
      type: String,
      default: 'v1.0'
    },
    score: {
      type: Number,
      default: 0
    },
    previousMastery: {
      type: Number,
      default: 0
    },
    masteryLevel: {
      type: Number,
      default: 0
    },
    masteryGained: {
      type: Number,
      default: 0
    },
    pointsEarned: {
      type: Number,
      default: 0
    },
    questions: [questionSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
