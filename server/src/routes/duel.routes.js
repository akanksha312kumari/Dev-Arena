const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Duel = require('../models/Duel');

// GET /api/duels/history - fetch current user's duel history
router.get('/history', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const duels = await Duel.find({ players: userId })
      .populate('players', 'username profile.avatar')
      .populate('winner', 'username')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ duels });
  } catch (err) {
    console.error('Error fetching duel history:', err);
    res.status(500).json({ message: 'Failed to fetch duel history.' });
  }
});

module.exports = router;
