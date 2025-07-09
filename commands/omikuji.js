const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('omikuji')
    .setDescription('ランダムでおみくじを引きます'),
  async execute(client, interaction) {
    // おみくじ結果の候補
    const fortunes = [
      '大吉',
      '中吉',
      '小吉',
      '吉',
      '末吉',
      '凶',
      '大凶'
    ];

    // 乱数でインデックスを取得
    const index = Math.floor(Math.random() * fortunes.length);
    const result = fortunes[index];

    // 結果を返信
    await interaction.reply({
      content: `あなたの運勢は… **${result}** です！`,
      ephemeral: false
    });
  },
};
