const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getBalance } = require('../currencyManager'); // MongoDB操作関数を読み込み

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leafcheck')
    .setDescription('自分の所持しているはっぱの数を表示します'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      const balance = await getBalance(guildId, userId);

      await interaction.reply({
        content: `🌿 ${interaction.user.username} さんの所持はっぱ：**${balance} はっぱ**`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('MongoDBからの残高取得に失敗しました:', error);
      await interaction.reply({
        content: '残高情報の取得に失敗しました。',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
