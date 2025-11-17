const { SlashCommandBuilder } = require('discord.js');
const Currency = require('../models/Currency'); // ✅ MongoDBモデル

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leafcheck-all')
    .setDescription('このサーバー内の全ユーザーのはっぱ残高を表示します'),
  async execute(interaction) {
    const guildId = interaction.guildId;

    let records;
    try {
      records = await Currency.find({ guildId });
    } catch (err) {
      console.error('MongoDBからの残高取得に失敗:', err);
      return interaction.reply({
        content: '残高データの取得に失敗しました。',
        ephemeral: true
      });
    }

    if (!records || records.length === 0) {
      return interaction.reply({
        content: 'このサーバーには残高データがありません。',
        ephemeral: true
      });
    }

    const lines = [];
    for (const record of records) {
      const member = await interaction.guild.members.fetch(record.userId).catch(() => null);
      const name = member ? member.user.username : `ID:${record.userId}`;
      lines.push(`${name}: ${record.balance} はっぱ`);
    }

    const replyText = lines.join('\n').slice(0, 2000); // Discordの文字数制限対策

    await interaction.reply({
      content: `🌿 全ユーザーのはっぱ残高一覧:\n\n${replyText}`,
      ephemeral: false
    });
  },
};
