const express = require('express');
const router = express.Router();
const { aiChat, getLearningPlan } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/chat', protect, aiChat);
router.get('/learning-plan', protect, getLearningPlan);

module.exports = router;
