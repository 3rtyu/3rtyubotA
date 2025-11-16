const { getBalance, addBalance } = require('../utils/currency');
const fs = require('fs');
const path = require('path');

const titlesPath = path.join(__dirname, '../data/titles.json');

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    // ✅ 応答予約（3秒制限を回避）
    await interaction.deferReply({ ephemeral: true });

    // ✅ 称号データの読み込み
    const titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    const key = interaction.customId.replace('buy_', '');
    const item = titles[key];

    if (!item) {
      await interaction.editReply({ content: '指定された称号が見つかりません。' });
      return;
    }

    // ✅ 残高チェック
    const userId = interaction.user.id;
    const balance = getBalance(userId);

    if (balance < item.cost) {
      await interaction.editReply({
        content: `残高不足です！${item.role} を購入するには ${item.cost} はっぱが必要です。`
      });
      return;
    }

    // ✅ 通貨減算
    addBalance(userId, -item.cost);

    // ✅ ロール付与
    const role = interaction.guild.roles.cache.find(r => r.name === item.role);
    if (role) {
      await interaction.member.roles.add(role);
      await interaction.editReply({
        content: `${interaction.user.username} が ${item.role} を購入しました！`
      });
    } else {
      await interaction.editReply({
        content: 'ロールが見つかりません。管理者に確認してください。'
      });
    }

  } catch (err) {
    console.error('shopButtons.js エラー:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '内部エラーが発生しました。', ephemeral: true });
      } else {
        await interaction.editReply({ content: '内部エラーが発生しました。' });
      }
    } catch (e) {
      console.error('エラー応答に失敗:', e);
    }
  }
};
