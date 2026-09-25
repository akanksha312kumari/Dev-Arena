const axios = require('axios');
const cheerio = require('cheerio');

class CodeChefAdapter {
  constructor() {
    this.name = 'codechef';
  }

  async fetchStats(handle) {
    try {
      const response = await axios.get(`https://www.codechef.com/users/${handle}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const $ = cheerio.load(response.data);
      
      const ratingStr = $('.rating-number').text().trim().split(/\s+/)[0];
      const rating = parseInt(ratingStr) || 0;

      const solvedStr = $('h3:contains("Total Problems Solved")').text();
      const total = parseInt(solvedStr.replace(/[^0-9]/g, '')) || 0;

      const contestsStr = $('.contest-participated-count b').text();
      const contests = parseInt(contestsStr) || 0;

      let recentSubmissions = [];
      try {
        const recentRes = await axios.get(`https://www.codechef.com/recent/user?page=0&limit=15&sort_by=recent&sorting_order=asc&language=All&status=15&handle=${handle}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (recentRes.data && recentRes.data.content) {
          const $recent = cheerio.load(recentRes.data.content);
          $recent('table.dataTable tbody tr').each((i, el) => {
            const cols = $recent(el).find('td');
            if (cols.length >= 3) {
              const timeStr = $recent(cols[0]).attr('title') || $recent(cols[0]).text().trim();
              const title = $recent(cols[1]).text().trim();
              const urlSlug = $recent(cols[1]).find('a').attr('href');
              if (title && title !== 'No Recent Activity') {
                recentSubmissions.push({
                  platform: 'codechef',
                  title: title,
                  difficulty: 'Unknown',
                  url: urlSlug ? `https://www.codechef.com${urlSlug}` : '',
                  timestamp: new Date(timeStr) // Note: CodeChef timeStr is like "11:06 AM 10/01/24"
                });
              }
            }
          });
        }
      } catch (err) {
        console.log(`Failed to fetch CodeChef recent submissions for ${handle}:`, err.message);
      }

      return {
        rating,
        problemsSolved: { easy: 0, medium: 0, hard: 0, total },
        contests,
        streak: 0,
        maxStreak: 0,
        recentSubmissions
      };
    } catch (error) {
      console.log(`CodeChef sync failed for ${handle}:`, error.message);
      return { rating: 0, problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 }, contests: 0, streak: 0, maxStreak: 0, recentSubmissions: [] };
    }
  }
}

module.exports = new CodeChefAdapter();
