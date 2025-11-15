const fs = require('fs');
const path = require('path');

const balancesPath = path.join(__dirname, '../data/balances.json');

function loadBalances() {
  if (!fs.existsSync(balancesPath)) return {};
  return JSON.parse(fs.readFileSync(balancesPath, 'utf8'));
}

function saveBalances(balances) {
  fs.writeFileSync(balancesPath, JSON.stringify(balances, null, 2));
}

function getBalance(userId) {
  const balances = loadBalances();
  return balances[userId] || 0;
}

function addBalance(userId, amount) {
  const balances = loadBalances();
  balances[userId] = (balances[userId] || 0) + amount;
  saveBalances(balances);
}

module.exports = { getBalance, addBalance };
