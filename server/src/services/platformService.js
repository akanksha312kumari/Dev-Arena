const User = require('../models/User');
const codeforcesAdapter = require('./platforms/codeforcesAdapter');
const leetcodeAdapter = require('./platforms/leetcodeAdapter');
const codechefAdapter = require('./platforms/codechefAdapter');
const hackerrankAdapter = require('./platforms/hackerrankAdapter');
const atcoderAdapter = require('./platforms/atcoderAdapter');
const gfgAdapter = require('./platforms/gfgAdapter');
const gamificationService = require('./gamificationService');

class PlatformService {
  constructor() {
    this.adapters = {
      codeforces: codeforcesAdapter,
      leetcode: leetcodeAdapter,
      codechef: codechefAdapter,
      hackerrank: hackerrankAdapter,
      atcoder: atcoderAdapter,
      gfg: gfgAdapter
    };
  }

  async syncPlatform(userId, platform) {
    if (!this.adapters[platform]) {
      throw new Error(`Platform ${platform} is not supported`);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const handle = user.platforms && user.platforms[platform];
    if (!handle) {
      throw new Error(`No handle connected for ${platform}`);
    }

    // Rate limiting check (e.g. sync at most once every 2 minutes per platform)
    const lastSynced = user.lastSynced && user.lastSynced[platform];
    // Allow bypassing rate limit via a 'force' param if needed, or just let it pass if explicitly requested
    if (lastSynced && (Date.now() - new Date(lastSynced).getTime() < 20 * 1000)) {
      throw new Error(`Please wait 20 seconds between syncing ${platform}`);
    }

    const adapter = this.adapters[platform];
    const stats = await adapter.fetchStats(handle);

    // Save platform specific stats
    if (!user.platformStats) user.platformStats = {};
    if (!user.platformStats[platform]) user.platformStats[platform] = {};
    
    user.platformStats[platform] = {
      ...user.platformStats[platform],
      ...stats
    };

    if (!user.lastSynced) user.lastSynced = {};
    user.lastSynced[platform] = new Date();

    const oldTotal = user.stats?.problemsSolved?.total || 0;

    // Recompute global stats
    this.recalculateGlobalStats(user);

    const newTotal = user.stats?.problemsSolved?.total || 0;
    await gamificationService.processProblemSolvingActivity(user, oldTotal, newTotal);

    await user.save();
    return user;
  }

  async syncAllPlatforms(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const results = [];
    const platforms = ['codeforces', 'leetcode', 'codechef', 'hackerrank', 'atcoder', 'gfg'];

    for (const platform of platforms) {
      const handle = user.platforms && user.platforms[platform];
      if (!handle) continue; // Skip unconnected platforms

      try {
        // Enforce rate limits gracefully during syncAll
        const lastSynced = user.lastSynced && user.lastSynced[platform];
        if (lastSynced && (Date.now() - new Date(lastSynced).getTime() < 60 * 1000)) {
          results.push({ platform, status: 'skipped', reason: 'rate-limited' });
          continue;
        }

        const adapter = this.adapters[platform];
        const stats = await adapter.fetchStats(handle);

        if (!user.platformStats) user.platformStats = {};
        user.platformStats[platform] = {
          ...user.platformStats[platform],
          ...stats
        };

        if (!user.lastSynced) user.lastSynced = {};
        user.lastSynced[platform] = new Date();
        
        results.push({ platform, status: 'success' });
      } catch (err) {
        console.error(`Failed to sync ${platform} for user ${userId}:`, err.message);
        results.push({ platform, status: 'failed', reason: err.message });
      }
    }

    const oldTotal = user.stats?.problemsSolved?.total || 0;

    this.recalculateGlobalStats(user);

    const newTotal = user.stats?.problemsSolved?.total || 0;
    await gamificationService.processProblemSolvingActivity(user, oldTotal, newTotal);

    await user.save();
    return { user, results };
  }

  recalculateGlobalStats(user) {
    if (!user.stats) {
      user.stats = { 
        globalRating: 0, 
        problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 }, 
        dailyStreak: 0,
        maxStreak: 0,
        totalContests: 0
      };
    } else {
      // Reset to 0 before aggregating (preserve maxStreak)
      user.stats.problemsSolved = { easy: 0, medium: 0, hard: 0, total: 0 };
      user.stats.globalRating = 0;
      user.stats.dailyStreak = 0;
      user.stats.totalContests = 0;
    }

    if (!user.platformStats) return;

    for (const [platform, stats] of Object.entries(user.platformStats)) {
      if (!stats) continue;

      // Rating: we take the maximum across platforms (or could sum, but max is common for global "peak" rating)
      if (stats.rating && stats.rating > user.stats.globalRating) {
        user.stats.globalRating = stats.rating;
      }

      // Solved problems: sum them up
      if (stats.problemsSolved) {
        user.stats.problemsSolved.easy += (stats.problemsSolved.easy || 0);
        user.stats.problemsSolved.medium += (stats.problemsSolved.medium || 0);
        user.stats.problemsSolved.hard += (stats.problemsSolved.hard || 0);
        user.stats.problemsSolved.total += (stats.problemsSolved.total || 0);
      }

      // Streaks: take max
      if (stats.streak && stats.streak > user.stats.dailyStreak) {
        user.stats.dailyStreak = stats.streak;
      }
      if (stats.maxStreak && stats.maxStreak > user.stats.maxStreak) {
        user.stats.maxStreak = stats.maxStreak;
      }

      // Contests: sum
      if (stats.contests) {
        user.stats.totalContests += stats.contests;
      }
    }

    // Now aggregate heatmap and recent submissions
    const globalHeatmap = new Map();
    let globalRecent = [];

    const userObj = user.toJSON();

    for (const [platform, stats] of Object.entries(userObj.platformStats || {})) {
      if (!stats) continue;
      
      if (stats.heatmapData) {
        const hEntries = stats.heatmapData instanceof Map 
          ? Array.from(stats.heatmapData.entries())
          : Object.entries(stats.heatmapData || {});
        for (const [dateStr, count] of hEntries) {
          const numCount = Number(count);
          if (!isNaN(numCount) && numCount > 0) {
            globalHeatmap.set(dateStr, (globalHeatmap.get(dateStr) || 0) + numCount);
          }
        }
      }

      if (stats.recentSubmissions && Array.isArray(stats.recentSubmissions)) {
        globalRecent = globalRecent.concat(stats.recentSubmissions);
      }
    }

    globalRecent.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    user.recentSubmissions = globalRecent.slice(0, 15);
    
    // Calculate streak from aggregated heatmap
    const sortedDatesStr = Array.from(globalHeatmap.keys()).sort((a, b) => b.localeCompare(a));
    let currentStreak = 0;
    let maxComputedStreak = 0;
    
    if (sortedDatesStr.length > 0) {
      // Calculate max streak from all historical dates
      let tempMax = 0;
      let currentTemp = 1;
      for (let i = 0; i < sortedDatesStr.length - 1; i++) {
         const d1 = new Date(sortedDatesStr[i]);
         const d2 = new Date(sortedDatesStr[i+1]);
         const diff = Math.round((d1 - d2) / 86400000);
         if (diff === 1) {
            currentTemp++;
         } else if (diff > 1) {
            if (currentTemp > tempMax) tempMax = currentTemp;
            currentTemp = 1;
         }
      }
      if (currentTemp > tempMax) tempMax = currentTemp;
      maxComputedStreak = tempMax;
      
      const todayDate = new Date();
      const todayStr = todayDate.toISOString().split('T')[0];
      const yesterdayDate = new Date(todayDate.getTime() - 86400000);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
      
      let streak = 0;
      let checkDate = null;
      
      if (globalHeatmap.has(todayStr)) {
         checkDate = new Date(todayStr);
      } else if (globalHeatmap.has(yesterdayStr)) {
         checkDate = new Date(yesterdayStr);
      }
      
      if (checkDate) {
        while (true) {
          const checkStr = checkDate.toISOString().split('T')[0];
          if (globalHeatmap.has(checkStr)) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
          } else {
            break;
          }
        }
        currentStreak = streak;
      }
    }

    // Always trust the higher streak (if adapter gave a higher one)
    user.stats.dailyStreak = Math.max(user.stats.dailyStreak, currentStreak);
    user.stats.maxStreak = Math.max(user.stats.maxStreak || 0, user.stats.dailyStreak, maxComputedStreak);
    
    // Save map
    user.heatmapData = globalHeatmap;
  }
}

module.exports = new PlatformService();
