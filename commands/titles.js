const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('titles')
    .setDescription('交換可能な称号一覧を表示します'),
  async execute(interaction) {
    const titlesPath = path.join(__dirname, '../data/titles.json'); // ✅ data フォルダを明示

    let titles = {};
    try {
      titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    } catch (err) {
      console.error('titles.json の読み込みに失敗しました:', err);
      return interaction.reply({
        content: '称号一覧の取得に失敗しました。',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎖️ 交換可能な称号一覧')
      .setDescription('以下の称号は「はっぱ」で交換できます')
      .setColor(0x00AE86);

    for (const [key, item] of Object.entries(titles)) {
      embed.addFields({
        name: item.role,
        value: `価格: ${item.cost} はっぱ`,
        inline: true
      });
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
};
