const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  platform: { type: String, required: true, enum: ['leetcode', 'codeforces', 'codechef', 'hackerrank', 'atcoder', 'gfg'] },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  url: { type: String, required: true },
  tags: [{ type: String }],
  isPOTD: { type: Boolean, default: false },
  potdDate: { type: Date, default: null },
  description: { type: String, default: '' },
  functionSignature: { type: String, default: '' },
  constraints: [{ type: String }],
  sampleTests: { type: Array, default: [] },
  hiddenTests: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Problem', problemSchema);
