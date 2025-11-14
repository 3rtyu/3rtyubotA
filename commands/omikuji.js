const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('omikuji')
    .setDescription('ランダムでおみくじを引きます'),
  async execute(interaction) { // ✅ client を削除して interaction のみに統一
    // おみくじ結果と色のマッピング（16進数カラーコード）
    const fortunes = [
      '大吉',
      '中吉',
      '小吉',
      '吉',
      '末吉',
      '凶',
      '大凶'
    ];
    const colorMap = {
      '大吉': 0x00FF00,   // 緑
      '中吉': 0x66FF66,   // ライトグリーン
      '小吉': 0x99FF99,   // ペールグリーン
      '吉' : 0xFFFF00,   // 黄色
      '末吉': 0xFFCC00,   // 金
      '凶' : 0xFF6600,   // オレンジ
      '大凶': 0xFF0000    // 赤
    };

    // ランダムでおみくじを引く
    const index  = Math.floor(Math.random() * fortunes.length);
    const result = fortunes[index];
    const color  = colorMap[result] || 0xFFFFFF;

    // Embed を作成
    const embed = new EmbedBuilder()
      .setTitle('🎴 おみくじの結果 🎴')
      .setDescription(`あなたの運勢は… **${result}** です！`)
      .setColor(color)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
