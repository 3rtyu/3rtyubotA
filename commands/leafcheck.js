const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leafcheck')
    .setDescription('自分の所持しているはっぱの数を表示します'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const balancesPath = path.join(__dirname, '../data/balances.json'); // ✅ 修正

    let balances = {};
    try {
      balances = JSON.parse(fs.readFileSync(balancesPath, 'utf8'));
    } catch (err) {
      console.error('残高ファイルの読み込みに失敗しました:', err);
      return interaction.reply({
        content: '残高情報の取得に失敗しました。',
        flags: MessageFlags.Ephemeral
      });
    }

    const balance = balances[userId] || 0;
    await interaction.reply({
      content: `🌿 ${interaction.user.username} さんの所持はっぱ：**${balance} はっぱ**`,
      flags: MessageFlags.Ephemeral
    });
  }
};
