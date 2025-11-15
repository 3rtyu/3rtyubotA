const { getBalance, addBalance } = require('../utils/currency');
const fs = require('fs');
const path = require('path');

const titlesPath = path.join(__dirname, '../data/titles.json');

module.exports = async (interaction) => {
  let titles = {};
  try {
    titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
  } catch (err) {
    console.error('titles.json の読み込みに失敗しました:', err);
    return interaction.reply({ content: '称号データの読み込みに失敗しました。', ephemeral: true });
  }

  const key = interaction.customId.replace('buy_', '');
  const item = titles[key];
  if (!item) return;

  const userId = interaction.user.id;
  const balance = getBalance(userId);

  if (balance < item.cost) {
    await interaction.reply({ content: `残高不足です！${item.role} を購入するには ${item.cost} はっぱが必要です。`, ephemeral: true });
    return;
  }

  addBalance(userId, -item.cost);

  const role = interaction.guild.roles.cache.find(r => r.name === item.role);
  if (role) {
    await interaction.member.roles.add(role);
    await interaction.reply({ content: `${interaction.user.username} が ${item.role} を購入しました！`, ephemeral: true });
  } else {
    await interaction.reply({ content: 'ロールが見つかりません。管理者に確認してください。', ephemeral: true });
  }
};
