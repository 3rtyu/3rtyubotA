const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('1d100')
    .setDescription('100面ダイスを振ります'),

  async execute(interaction) { // ✅ client を削除して interaction のみ
    // ダイスの結果（1〜100）
    const result = Math.floor(Math.random() * 100) + 1;

    // 結果のみを返信
    await interaction.reply({
      content: `**${result}**`,
      ephemeral: false
    });
  },
};
