const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('ショップ埋め込みを送信します（管理者用）'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏪 はっぱショップ')
      .setDescription('はっぱを使用して称号を購入できるぜ')
      .addFields(
        { name: '人生終了初級', value: '価格: 100 はっぱ', inline: true },
        { name: '人生終了上級', value: '価格: 5000 はっぱ', inline: true }
      )
      .setColor(0x00AE86);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('buy_lifeendS').setLabel('人生終了初級').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('buy_lifeendL').setLabel('人生終了上級').setStyle(ButtonStyle.Success)
      );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'ショップを設置しました', ephemeral: true });
  },
};
