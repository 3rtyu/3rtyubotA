// models/Currency.js
const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  balance: { type: Number, default: 0 }
});

module.exports = mongoose.model('Currency', currencySchema);
