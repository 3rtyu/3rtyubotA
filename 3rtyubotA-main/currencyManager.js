// currencyManager.js
const Currency = require('./models/Currency');

async function getBalance(guildId, userId) {
  const entry = await Currency.findOne({ guildId, userId });
  return entry ? entry.balance : 0;
}

async function addBalance(guildId, userId, amount) {
  const entry = await Currency.findOneAndUpdate(
    { guildId, userId },
    { $inc: { balance: amount } },
    { upsert: true, new: true }
  );
  return entry.balance;
}

module.exports = { getBalance, addBalance };
