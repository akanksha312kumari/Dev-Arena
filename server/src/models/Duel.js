const mongoose = require('mongoose');

const duelSchema = new mongoose.Schema({
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if draw
  problem: {
    platform: { type: String, required: true },
    problemId: { type: String, required: true },
    title: { type: String, required: true },
    difficulty: { type: String }
  },
  timeLimit: { type: Number, required: true }, // in minutes
  status: { type: String, enum: ['pending', 'active', 'finished', 'cancelled'], default: 'pending' },
  startTime: { type: Date },
  endTime: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Duel', duelSchema);
