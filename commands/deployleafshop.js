const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const titlesPath = path.join(__dirname, '../data/titles.json');
const titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploy-leafshop')
    .setDescription('ショップ埋め込みを送信します（管理者専用）'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏪 はっぱショップ')
      .setDescription('はっぱを使用して称号を購入できるぜ')
      .setColor(0x00AE86);

    const row = new ActionRowBuilder();

    for (const [key, item] of Object.entries(titles)) {
      embed.addFields({ name: item.role, value: `価格: ${item.cost} はっぱ`, inline: true });
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${key}`)
          .setLabel(item.role)
          .setStyle(ButtonStyle.Primary)
      );
    }

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'ショップを設置しました', ephemeral: true });
  },
};
