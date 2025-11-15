const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploy-leafshop')
    .setDescription('ショップ埋め込みを送信します（管理者専用）'),
  async execute(interaction) {
    const titlesPath = path.join(__dirname, '../data/titles.json');
    let titles = {};
    try {
      titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    } catch (err) {
      console.error('titles.json の読み込みに失敗しました:', err);
      return interaction.reply({
        content: '称号データの読み込みに失敗しました。',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🏪 はっぱショップ')
      .setDescription('はっぱを使用して称号を購入できます')
      .setColor(0x00AE86);

    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (const [key, item] of Object.entries(titles)) {
      embed.addFields({ name: item.role, value: `価格: ${item.cost} はっぱ`, inline: true });

      if (currentRow.components.length === 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }

      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${key}`)
          .setLabel(item.role)
          .setStyle(ButtonStyle.Primary)
      );
    }
    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    if (interaction.channel) {
      await interaction.channel.send({ embeds: [embed], components: rows });
    }

    await interaction.reply({
      content: 'ショップを設置しました',
      flags: MessageFlags.Ephemeral
    });
  },
};
