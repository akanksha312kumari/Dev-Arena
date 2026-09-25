const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    profile: {
      avatar: {
        type: String,
        default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      },
      bio: {
        type: String,
        default: 'Competitive programmer.',
      },
      college: {
        type: String,
        default: '',
      },
    },
    platforms: {
      codeforces: { type: String, default: '' },
      leetcode: { type: String, default: '' },
      codechef: { type: String, default: '' },
      atcoder: { type: String, default: '' },
      hackerrank: { type: String, default: '' },
      gfg: { type: String, default: '' },
    },
    lastSynced: {
      codeforces: { type: Date, default: null },
      leetcode: { type: Date, default: null },
      codechef: { type: Date, default: null },
      atcoder: { type: Date, default: null },
      hackerrank: { type: Date, default: null },
      gfg: { type: Date, default: null },
    },
    platformStats: {
      codeforces: {
        rating: { type: Number, default: 0 },
        problemsSolved: { easy: { type: Number, default: 0 }, medium: { type: Number, default: 0 }, hard: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        contests: { type: Number, default: 0 },
        heatmapData: { type: Map, of: Number, default: {} },
        recentSubmissions: { type: Array, default: [] }
      },
      leetcode: {
        rating: { type: Number, default: 0 },
        problemsSolved: { easy: { type: Number, default: 0 }, medium: { type: Number, default: 0 }, hard: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        contests: { type: Number, default: 0 },
        heatmapData: { type: Map, of: Number, default: {} },
        recentSubmissions: { type: Array, default: [] }
      },
      codechef: {
        rating: { type: Number, default: 0 },
        problemsSolved: { easy: { type: Number, default: 0 }, medium: { type: Number, default: 0 }, hard: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        contests: { type: Number, default: 0 },
        heatmapData: { type: Map, of: Number, default: {} },
        recentSubmissions: { type: Array, default: [] }
      },
      atcoder: {
        rating: { type: Number, default: 0 },
        problemsSolved: { easy: { type: Number, default: 0 }, medium: { type: Number, default: 0 }, hard: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        contests: { type: Number, default: 0 },
        heatmapData: { type: Map, of: Number, default: {} },
        recentSubmissions: { type: Array, default: [] }
      },
      hackerrank: {
        rating: { type: Number, default: 0 },
        problemsSolved: { easy: { type: Number, default: 0 }, medium: { type: Number, default: 0 }, hard: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        contests: { type: Number, default: 0 },
        heatmapData: { type: Map, of: Number, default: {} },
        recentSubmissions: { type: Array, default: [] }
      },
      gfg: {
        rating: { type: Number, default: 0 },
        problemsSolved: { easy: { type: Number, default: 0 }, medium: { type: Number, default: 0 }, hard: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        contests: { type: Number, default: 0 },
        heatmapData: { type: Map, of: Number, default: {} },
        recentSubmissions: { type: Array, default: [] }
      },
      devarena: {
        rating: { type: Number, default: 0 },
        problemsSolved: { easy: { type: Number, default: 0 }, medium: { type: Number, default: 0 }, hard: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        contests: { type: Number, default: 0 },
        heatmapData: { type: Map, of: Number, default: {} },
        recentSubmissions: { type: Array, default: [] }
      }
    },
    solvedPotds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
    stats: {
      globalRating: { type: Number, default: 0 },
      problemsSolved: {
        easy: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        hard: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
      dailyStreak: { type: Number, default: 0 },
      maxStreak: { type: Number, default: 0 },
      totalContests: { type: Number, default: 0 },
      duels: {
        total: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
      },
      arenaRank: { type: String, default: 'Unranked' }
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    friendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{ type: String }],
    achievements: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        unlockedAt: { type: Date, default: Date.now },
      },
    ],
    activityFeed: [
      {
        type: { type: String, enum: ['duel_win', 'streak', 'badge', 'rating', 'achievement'], required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    heatmapData: {
      type: Map,
      of: Number,
      default: {},
    },
    recentSubmissions: [
      {
        platform: { type: String, required: true },
        title: { type: String, required: true },
        difficulty: { type: String, default: 'Unknown' },
        url: { type: String },
        timestamp: { type: Date, required: true },
      },
    ],
    lastActivityDate: { type: Date, default: null },
    aiRecommendations: {
      roadmap: [
        {
          topic: String,
          difficulty: String,
          estimatedTime: String,
          reason: String,
        },
      ],
      dailyChallenges: [
        {
          title: String,
          difficulty: String,
          reason: String,
        },
      ],
      lastGeneratedAt: { type: Date, default: null },
    },
    skillMastery: {
      type: Map,
      of: {
        masteryLevel: { type: Number, default: 0 },
        quizzesTaken: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
      },
      default: {},
    },
    quizStats: {
      totalQuizzes: { type: Number, default: 0 },
      totalQuestionsAnswered: { type: Number, default: 0 },
      totalPointsEarned: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
