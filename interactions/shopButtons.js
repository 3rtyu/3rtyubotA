const { getBalance, addBalance } = require('../utils/currency');
const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

const titlesPath = path.join(__dirname, '../data/titles.json');

module.exports = async (interaction) => {
  try {
    const titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    const key = interaction.customId.replace('buy_', '');
    const item = titles[key];

    if (!item) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '指定された称号が見つかりません。',
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    const userId = interaction.user.id;
    const balance = getBalance(userId);

    if (balance < item.cost) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `残高不足です！${item.role} を購入するには ${item.cost} はっぱが必要です。`,
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    addBalance(userId, -item.cost);

    const role = interaction.guild.roles.cache.find(r => r.name === item.role);
    if (role) {
      await interaction.member.roles.add(role);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `${interaction.user.username} が ${item.role} を購入しました！`,
          flags: MessageFlags.Ephemeral
        });
      }
    } else {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'ロールが見つかりません。管理者に確認してください。',
          flags: MessageFlags.Ephemeral
        });
      }
    }

  } catch (err) {
    console.error('shopButtons.js エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '内部エラーが発生しました。',
          flags: MessageFlags.Ephemeral
        });
      } catch (e) {
        console.error('エラー応答に失敗:', e);
      }
    }
  }
};
