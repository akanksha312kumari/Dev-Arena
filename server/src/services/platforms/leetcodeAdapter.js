const axios = require('axios');

class LeetCodeAdapter {
  constructor() {
    this.name = 'leetcode';
  }

  async fetchStats(handle) {
    try {
      // 1. Fetch Solved Problems (https://alfa-leetcode-api.onrender.com/{handle}/solved)
      const solvedRes = await axios.get(`https://alfa-leetcode-api.onrender.com/${handle}/solved`);
      const solvedData = solvedRes.data;

      const total = solvedData.solvedProblem || 0;
      const easy = solvedData.easySolved || 0;
      const medium = solvedData.mediumSolved || 0;
      const hard = solvedData.hardSolved || 0;

      // 2. Fetch Ranking
      let ranking = 0;
      try {
        const profileRes = await axios.get(`https://alfa-leetcode-api.onrender.com/${handle}`);
        if (profileRes.data && profileRes.data.ranking) {
          ranking = profileRes.data.ranking;
        }
      } catch (err) {
        console.log(`Failed to fetch LeetCode profile ranking for ${handle}:`, err.message);
      }

      // 3. Fetch Contest Info
      let rating = 0;
      let contests = 0;
      try {
        const contestRes = await axios.get(`https://alfa-leetcode-api.onrender.com/${handle}/contest`);
        if (contestRes.data) {
           rating = contestRes.data.contestRating ? Math.round(contestRes.data.contestRating) : 0;
           contests = contestRes.data.contestParticipationNum || 0;
        }
      } catch (err) {
        console.log(`Failed to fetch LeetCode contest for ${handle}:`, err.message);
      }

      // 4. Fetch Calendar (Heatmap)
      let heatmapData = {};
      try {
        const calRes = await axios.get(`https://alfa-leetcode-api.onrender.com/${handle}/calendar`);
        if (calRes.data && calRes.data.submissionCalendar) {
          const calendarJson = typeof calRes.data.submissionCalendar === 'string' 
             ? JSON.parse(calRes.data.submissionCalendar) 
             : calRes.data.submissionCalendar;
          for (const [timestamp, count] of Object.entries(calendarJson)) {
            const dateStr = new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0];
            heatmapData[dateStr] = (heatmapData[dateStr] || 0) + count;
          }
        }
      } catch (err) {
        console.log(`Failed to fetch LeetCode calendar for ${handle}:`, err.message);
      }

      // 5. Fetch Recent Submissions
      let recentSubmissions = [];
      try {
        const acRes = await axios.get(`https://alfa-leetcode-api.onrender.com/${handle}/acSubmission`);
        if (acRes.data && acRes.data.submission) {
          recentSubmissions = acRes.data.submission.slice(0, 15).map(sub => ({
            platform: 'leetcode',
            title: sub.title,
            difficulty: 'Unknown',
            url: `https://leetcode.com/problems/${sub.titleSlug}/`,
            timestamp: new Date(parseInt(sub.timestamp) * 1000)
          }));
        }
      } catch (err) {
        console.log(`Failed to fetch LeetCode recent submissions for ${handle}:`, err.message);
      }

      return {
        rating,
        problemsSolved: { easy, medium, hard, total },
        contests,
        streak: 0, // Leetcode API doesn't provide streak directly without auth
        maxStreak: 0,
        ranking: ranking.toString(),
        heatmapData,
        recentSubmissions
      };
    } catch (error) {
      console.error('LeetCode API Error:', error.message);
      if (error.response && error.response.status === 429) {
          throw new Error('LeetCode API is currently rate-limited (429). Please try again in a few minutes.');
      }
      throw new Error(error.response?.data?.message || 'Error communicating with LeetCode API');
    }
  }
}

module.exports = new LeetCodeAdapter();
