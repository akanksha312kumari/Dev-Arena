const express = require('express');
const router = express.Router();
const { getProblems, getPOTD, seedProblems, getPOTDHistory, solvePOTD } = require('../controllers/problemController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getProblems);
router.get('/potd', protect, getPOTD);
router.get('/potd/history', protect, getPOTDHistory);
router.post('/potd/solve', protect, solvePOTD);
router.post('/seed', protect, seedProblems);

module.exports = router;
