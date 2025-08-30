// commands/deployGacha.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploy-gacha')
    .setDescription('ガチャボタン付きメッセージを設置します（管理者専用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(client, interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gacha_one')
        .setLabel('1連引く')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('gacha_ten')
        .setLabel('10連引く')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ content: 'ガチャボタンを設置しました！', ephemeral: true });

    await interaction.channel.send({
      content: '🔮 **誰でも何度でも引けるガチャ** 🔮',
      components: [row]
    });
  }
};
