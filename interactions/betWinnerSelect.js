const { EmbedBuilder } = require('discord.js');
const Bet = require('../models/Bet');
const currencyManager = require('../currencyManager');

module.exports = {
  customIdStart: 'bet_winner_select_',

  async execute(interaction) {
    const customId = interaction.customId;
    const betId = customId.replace('bet_winner_select_', '');

    const bet = await Bet.findById(betId);
    if (!bet) {
      return interaction.reply({ content: '賭けが見つかりません。', ephemeral: true });
    }

    // 作成者以外は操作不可
    if (interaction.user.id !== bet.creatorId) {
      return interaction.reply({ content: '勝者を決められるのは作成者のみです。', ephemeral: true });
    }

    const winners = interaction.values; // 選ばれた userId の配列

    // 報酬計算
    const total = bet.amount * bet.participants.length;
    const reward = Math.floor(total / winners.length);

    // 配布
    for (const userId of winners) {
      await currencyManager.addBalance(interaction.guildId, userId, reward);
    }

    // 賭けを締め切り状態に
    bet.isClosed = true;
    bet.winner = winners;
    await bet.save();

    // 勝者の名前を取得
    const winnerNames = [];
    for (const userId of winners) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        winnerNames.push(member.displayName);
      } catch {
        winnerNames.push(`ユーザーID: ${userId}`);
      }
    }

    // Embed 作成
    const embed = new EmbedBuilder()
      .setTitle('🎉 賭けの結果発表 🎉')
      .setColor(0x00FF99)
      .addFields(
        { name: '賭け内容', value: bet.description },
        { name: '総額', value: `${total} はっぱ`, inline: true },
        { name: '勝者人数', value: `${winners.length} 人`, inline: true },
        { name: '1人あたりの報酬', value: `${reward} はっぱ`, inline: true },
        { name: '勝者一覧', value: winnerNames.join('\n') }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
