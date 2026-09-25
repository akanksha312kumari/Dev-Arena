const axios = require('axios');

class CodeforcesAdapter {
  constructor() {
    this.name = 'codeforces';
  }

  async fetchStats(handle) {
    try {
      // 1. Fetch User Info (for Rating)
      const userInfoRes = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
      if (userInfoRes.data.status !== 'OK') {
        throw new Error('Failed to fetch user info from Codeforces');
      }
      
      const cfUser = userInfoRes.data.result[0];
      const rating = cfUser.rating || 0;

      // 2. Fetch User Status (for Solved Problems)
      const userStatusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);
      if (userStatusRes.data.status !== 'OK') {
        throw new Error('Failed to fetch user status from Codeforces');
      }

      const submissions = userStatusRes.data.result;
      
      const solvedProblems = new Set();
      let easy = 0;
      let medium = 0;
      let hard = 0;
      
      const heatmapData = {};
      const recentSubmissions = [];
      let recentCount = 0;

      submissions.forEach(sub => {
        const timestampMs = sub.creationTimeSeconds * 1000;
        const dateStr = new Date(timestampMs).toISOString().split('T')[0];
        
        if (sub.verdict === 'OK') {
          heatmapData[dateStr] = (heatmapData[dateStr] || 0) + 1;
        }

        if (recentCount < 15) {
          recentSubmissions.push({
            platform: 'codeforces',
            title: `${sub.problem.contestId}${sub.problem.index} - ${sub.problem.name}`,
            difficulty: sub.problem.rating ? sub.problem.rating.toString() : 'Unknown',
            url: `https://codeforces.com/contest/${sub.problem.contestId}/problem/${sub.problem.index}`,
            timestamp: new Date(timestampMs)
          });
          recentCount++;
        }

        if (sub.verdict === 'OK') {
          const problemKey = `${sub.problem.contestId}-${sub.problem.index}`;
          if (!solvedProblems.has(problemKey)) {
            solvedProblems.add(problemKey);
            
            const probRating = sub.problem.rating || 0;
            if (probRating === 0) {
              easy++; 
            } else if (probRating <= 1200) {
              easy++;
            } else if (probRating <= 1800) {
              medium++;
            } else {
              hard++;
            }
          }
        }
      });

      return {
        rating,
        problemsSolved: {
          easy,
          medium,
          hard,
          total: solvedProblems.size
        },
        heatmapData,
        recentSubmissions
      };

    } catch (error) {
      console.error('Codeforces API Error:', error.message);
      throw new Error(error.response?.data?.comment || 'Error communicating with Codeforces API');
    }
  }
}

module.exports = new CodeforcesAdapter();
