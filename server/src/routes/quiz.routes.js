const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  startQuiz,
  submitAnswer,
  evaluateDefense,
  nextQuestion,
  retryNextQuestion,
  getQuizHistory,
  getQuizStats
} = require('../controllers/quizController');

router.post('/start', protect, startQuiz);
router.post('/submit-answer', protect, submitAnswer);
router.post('/evaluate-defense', protect, evaluateDefense);
router.post('/next-question', protect, nextQuestion);
router.post('/retry-next-question', protect, retryNextQuestion);
router.get('/history', protect, getQuizHistory);
router.get('/stats', protect, getQuizStats);

module.exports = router;
