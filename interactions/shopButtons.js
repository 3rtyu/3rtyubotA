const { getBalance, addBalance } = require('../utils/currency');
const fs = require('fs');
const path = require('path');

const titlesPath = path.join(__dirname, '../data/titles.json');

module.exports = async (interaction) => {
  if (!interaction.isButton()) {
    console.debug('shopButtons.js に非ボタンインタラクションが渡されました');
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    let titles;
    try {
      titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    } catch (readErr) {
      console.error('titles.json の読み込みに失敗:', readErr);
      await interaction.editReply({ content: '称号データの読み込みに失敗しました。' });
      return;
    }

    const key = interaction.customId.replace('buy_', '');
    const item = titles[key];

    if (!item) {
      await interaction.editReply({ content: '指定された称号が見つかりません。' });
      return;
    }

    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const balance = await getBalance(guildId, userId); // ✅ MongoDBから取得

    if (balance < item.cost) {
      await interaction.editReply({
        content: `残高不足です！${item.role} を購入するには ${item.cost} はっぱが必要です。`
      });
      return;
    }

    await addBalance(guildId, userId, -item.cost); // ✅ MongoDBに保存

    const role = interaction.guild.roles.cache.find(r => r.name === item.role);
    if (role) {
      try {
        await interaction.member.roles.add(role);
        await interaction.editReply({
          content: `${interaction.user.username} が ${item.role} を購入しました！`
        });
      } catch (roleErr) {
        console.warn('ロール付与に失敗:', roleErr);
        await interaction.editReply({
          content: 'ロールの付与に失敗しました。管理者に確認してください。'
        });
      }
    } else {
      await interaction.editReply({
        content: 'ロールが見つかりません。管理者に確認してください。'
      });
    }

  } catch (err) {
    console.error('shopButtons.js エラー:', err);
    try {
      if (!interaction.replied) {
        await interaction.editReply({ content: '内部エラーが発生しました。' });
      } else {
        console.warn('shopButtons 応答済みのため、再応答をスキップしました');
      }
    } catch (e) {
      console.error('エラー応答に失敗:', e);
    }
  }
};
