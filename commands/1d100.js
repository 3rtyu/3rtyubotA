const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('1d100')
    .setDescription('100面ダイスを振ります'),

  async execute(client, interaction) {
    // ダイスの結果（1〜100）
    const result = Math.floor(Math.random() * 100) + 1;

    // 判定メッセージ
    let judgment = '';
    if (result >= 96) {
      judgment = '😱 ファンブル！';
    } else if (result <= 5) {
      judgment = '🎯 クリティカル！';
    }

    // 結果を返信
    await interaction.reply({
      content: `🎲 あなたの100面ダイスの結果は… **${result}** です！\n${judgment}`,
      ephemeral: false
    });
  },
};
