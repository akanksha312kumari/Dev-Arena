const User = require('../models/User');

const getLeaderboard = async (req, res) => {
  try {
    const { type = 'xp', filter = 'global' } = req.query;
    
    let query = {};
    
    if (filter === 'friends') {
      const currentUser = await User.findById(req.user.id);
      query = { _id: { $in: [...currentUser.friends, req.user.id] } };
    }

    let sortOption = {};
    if (type === 'xp') sortOption = { xp: -1 };
    else if (type === 'rating') sortOption = { 'stats.globalRating': -1 };
    else if (type === 'streak') sortOption = { 'stats.dailyStreak': -1 };
    else sortOption = { xp: -1 };

    const topUsers = await User.find(query)
      .select('username profile stats xp level badges')
      .sort(sortOption)
      .limit(50);
      
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
};

module.exports = { getLeaderboard };
