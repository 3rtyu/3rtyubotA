const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  guildId: String,
  creatorId: String,
  amount: Number,
  description: String,
  participants: [String],
  isClosed: { type: Boolean, default: false },
  winner: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bet', betSchema);
