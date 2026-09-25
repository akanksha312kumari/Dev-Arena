const axios = require('axios');
const cheerio = require('cheerio');

class GfgAdapter {
  constructor() {
    this.name = 'gfg';
  }

  async fetchStats(handle) {
    try {
      const response = await axios.get(`https://auth.geeksforgeeks.org/user/${handle}/practice/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const $ = cheerio.load(response.data);
      
      const scoreStr = $('.score_cards_container .score_card:contains("Overall Coding Score") .score_card_value').text().trim();
      const rating = parseInt(scoreStr) || 0;

      const totalStr = $('.score_cards_container .score_card:contains("Total Problem Solved") .score_card_value').text().trim();
      const total = parseInt(totalStr) || 0;

      return {
        rating,
        problemsSolved: { easy: 0, medium: 0, hard: 0, total },
        contests: 0,
        streak: 0,
        maxStreak: 0,
      };
    } catch (error) {
      console.log(`GFG sync failed for ${handle}:`, error.message);
      return { rating: 0, problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 }, contests: 0, streak: 0, maxStreak: 0 };
    }
  }
}

module.exports = new GfgAdapter();
