const axios = require('axios');

class HackerRankAdapter {
  constructor() {
    this.name = 'hackerrank';
  }

  async fetchStats(handle) {
    try {
      const response = await axios.get(`https://www.hackerrank.com/rest/hackers/${handle}/profile`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const data = response.data.model;
      
      const level = data.level || 0;
      
      return {
        rating: level * 100, // Hackerrank doesn't expose global rating easily, use proxy
        problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 }, // Would need another endpoint
        contests: 0,
        streak: 0,
        maxStreak: 0,
      };
    } catch (error) {
      console.log(`HackerRank sync failed for ${handle}:`, error.message);
      return { rating: 0, problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 }, contests: 0, streak: 0, maxStreak: 0 };
    }
  }
}

module.exports = new HackerRankAdapter();
