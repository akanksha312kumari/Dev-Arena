class GamificationService {
  /**
   * Process newly solved problems to award XP and update universal streak.
   * @param {Object} user - The user document (Mongoose)
   * @param {number} oldTotal - Total problems solved before sync
   * @param {number} newTotal - Total problems solved after sync
   */
  async processProblemSolvingActivity(user, oldTotal, newTotal) {
    if (newTotal <= oldTotal) return; // No new problems solved

    const newProblemsCount = newTotal - oldTotal;
    
    // Award XP (10 XP per problem)
    const earnedXp = newProblemsCount * 10;
    this.awardXP(user, earnedXp, `Solved ${newProblemsCount} new problem(s)`);

    // Update Universal Streak
    this.updateStreak(user);

    // Check Badges
    this.checkBadges(user);
  }

  awardXP(user, amount, reason, eventType = 'achievement') {
    user.xp = (user.xp || 0) + amount;
    const oldLevel = user.level || 1;
    const newLevel = Math.floor(user.xp / 100) + 1;
    
    if (newLevel > oldLevel) {
      user.level = newLevel;
      this.addActivity(user, 'badge', `Level Up!`, `You reached Level ${newLevel}!`);
    }

    if (reason) {
      this.addActivity(user, eventType, `Earned ${amount} XP`, reason);
    }
  }

  updateStreak(user) {
    const now = new Date();
    const lastActivity = user.lastActivityDate;
    
    if (!lastActivity) {
      // First activity
      user.stats.dailyStreak = 1;
      user.stats.maxStreak = 1;
      user.lastActivityDate = now;
      this.addActivity(user, 'streak', 'Streak Started!', 'You solved your first problem.');
      return;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    // Normalize to UTC midnight for comparison
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
    const lastActivityMidnight = new Date(Date.UTC(lastActivity.getUTCFullYear(), lastActivity.getUTCMonth(), lastActivity.getUTCDate())).getTime();

    const diffDays = Math.round((todayMidnight - lastActivityMidnight) / msPerDay);

    if (diffDays === 1) {
      // Continued streak
      user.stats.dailyStreak += 1;
      user.lastActivityDate = now;
      if (user.stats.dailyStreak > user.stats.maxStreak) {
        user.stats.maxStreak = user.stats.dailyStreak;
      }
      
      // Milestone check
      if (user.stats.dailyStreak % 7 === 0) {
        this.awardXP(user, 50, `7-Day Streak Bonus!`, 'streak');
      } else {
        this.addActivity(user, 'streak', 'Streak Continued!', `You are on a ${user.stats.dailyStreak}-day streak.`);
      }
    } else if (diffDays > 1) {
      // Broken streak
      user.stats.dailyStreak = 1;
      user.lastActivityDate = now;
      this.addActivity(user, 'streak', 'Streak Reset', 'You started a new streak today.');
    }
    // If diffDays === 0, they already solved a problem today, streak stays the same.
  }

  checkBadges(user) {
    if (!user.badges) user.badges = [];
    const totalSolved = user.stats?.problemsSolved?.total || 0;

    const badgeThresholds = [
      { name: 'Novice Coder', threshold: 10 },
      { name: 'Intermediate', threshold: 50 },
      { name: 'Pro', threshold: 100 },
      { name: 'Algorithm Master', threshold: 500 }
    ];

    for (const badge of badgeThresholds) {
      if (totalSolved >= badge.threshold && !user.badges.includes(badge.name)) {
        user.badges.push(badge.name);
        this.addActivity(user, 'badge', `Badge Unlocked: ${badge.name}`, `You solved ${badge.threshold} problems!`);
      }
    }
  }

  addActivity(user, type, title, description) {
    if (!user.activityFeed) user.activityFeed = [];
    user.activityFeed.unshift({ type, title, description, timestamp: new Date() });
    // Keep only the last 20 activities
    if (user.activityFeed.length > 20) {
      user.activityFeed = user.activityFeed.slice(0, 20);
    }
  }
}

module.exports = new GamificationService();
