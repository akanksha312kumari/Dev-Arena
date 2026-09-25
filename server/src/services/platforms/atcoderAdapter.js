const axios = require('axios');
const cheerio = require('cheerio');

class AtCoderAdapter {
  constructor() {
    this.name = 'atcoder';
  }

  async fetchStats(handle) {
    try {
      const response = await axios.get(`https://atcoder.jp/users/${handle}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const $ = cheerio.load(response.data);
      
      const ratingStr = $('th:contains("Rating")').next('td').find('span').first().text().trim();
      const rating = parseInt(ratingStr) || 0;
      
      const contestsStr = $('th:contains("Rated Matches")').next('td').text().trim();
      const contests = parseInt(contestsStr) || 0;

      return {
        rating,
        problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 },
        contests,
        streak: 0,
        maxStreak: 0,
      };
    } catch (error) {
      console.log(`AtCoder sync failed for ${handle}:`, error.message);
      return { rating: 0, problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 }, contests: 0, streak: 0, maxStreak: 0 };
    }
  }
}

module.exports = new AtCoderAdapter();
