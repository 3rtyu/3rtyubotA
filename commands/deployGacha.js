// commands/deployGacha.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploy-gacha')
    .setDescription('ガチャボタン付きメッセージを設置します（管理者専用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(client, interaction) {
    // 1連/10連ボタン
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

    // Embed で排出率を「中央寄せ」っぽく表示
    const embed = new EmbedBuilder()
      .setTitle('**プロセカ(?)ガチャ！**')
      .addFields(
        // 左側を空白フィールドで埋める
        { name: '\u200B', value: '\u200B', inline: true },
        // 真ん中に並べたい排出率
        {
          name: '📊 排出率',
          value: [
            '⭐️: 59.99%',
            '⭐⭐: 30%',
            '⭐⭐⭐: 7%',
            '⭐⭐⭐⭐: 3%',
          ].join('\n'),
          inline: true
        },
        // 右側も空白で埋める
        { name: '\u200B', value: '\u200B', inline: true }
      )
      .setColor(0x00AE86);

    // 管理者への確認レスポンス（ephemeral）
    await interaction.reply({ content: 'ガチャボタンを設置しました！', ephemeral: true });

    // 実際のガチャメッセージをチャンネルに送信
    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
};
