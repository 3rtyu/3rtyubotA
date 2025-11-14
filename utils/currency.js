const fs = require('fs');
const path = './balances.json';

function loadBalances() {
  if (!fs.existsSync(path)) return {};
  return JSON.parse(fs.readFileSync(path));
}

function saveBalances(balances) {
  fs.writeFileSync(path, JSON.stringify(balances, null, 2));
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
