const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sendgachabuttons')
    .setDescription('このコマンドは使用しないでください!!'),
  async execute(client, interaction) {
    // 1回引き用ボタン
    const buttonOnce = new ButtonBuilder()
      .setCustomId('gacha_1')
      .setLabel('1回ガチャ')
      .setStyle(ButtonStyle.Primary);

    // 10連引き用ボタン
    const buttonTen = new ButtonBuilder()
      .setCustomId('gacha_10')
      .setLabel('10連ガチャ')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(buttonOnce, buttonTen);

    await interaction.reply({
      content: '以下のボタンからガチャを引けます！',
      components: [row]
    });
  }
};
