const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bet = require('../models/Bet');
const currencyManager = require('../currencyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bet')
    .setDescription('賭け機能')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('新しい賭けを作成します')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('賭けるはっぱの枚数')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('賭けの内容')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('join')
        .setDescription('賭けに参加します')
        .addStringOption(opt =>
          opt.setName('bet_id')
            .setDescription('参加する賭けのID')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('close')
        .setDescription('賭けを締め切り、勝者選択メニューを表示します')
        .addStringOption(opt =>
          opt.setName('bet_id')
            .setDescription('締め切る賭けのID')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('現在の賭け一覧を表示します')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // -------------------------
    // CREATE
    // -------------------------
    if (sub === 'create') {
      const amount = interaction.options.getInteger('amount');
      const description = interaction.options.getString('description');

      const balance = await currencyManager.getBalance(guildId, interaction.user.id);
      if (balance < amount) {
        return interaction.reply({ content: 'はっぱが足りません。', ephemeral: true });
      }

      await currencyManager.addBalance(guildId, interaction.user.id, -amount);

      const bet = await Bet.create({
        guildId,
        creatorId: interaction.user.id,
        amount,
        description,
        participants: [interaction.user.id]
      });

      return interaction.reply(`賭けを作成しました！ ID: **${bet._id}**`);
    }

    // -------------------------
    // JOIN
    // -------------------------
    if (sub === 'join') {
      const betId = interaction.options.getString('bet_id');
      const bet = await Bet.findById(betId);

      if (!bet) return interaction.reply('その賭けは存在しません。');
      if (bet.guildId !== guildId) return interaction.reply('このサーバーの賭けではありません。');
      if (bet.isClosed) return interaction.reply('この賭けはすでに締め切られています。');
      if (bet.participants.includes(interaction.user.id)) {
        return interaction.reply('すでに参加しています。');
      }

      const balance = await currencyManager.getBalance(guildId, interaction.user.id);
      if (balance < bet.amount) {
        return interaction.reply('はっぱが足りません。');
      }

      await currencyManager.addBalance(guildId, interaction.user.id, -bet.amount);
      bet.participants.push(interaction.user.id);
      await bet.save();

      return interaction.reply('賭けに参加しました！');
    }

// -------------------------
// CLOSE（勝者選択メニューを表示）
// -------------------------
if (sub === 'close') {
  const betId = interaction.options.getString('bet_id');
  const bet = await Bet.findById(betId);

  if (!bet) return interaction.reply('その賭けは存在しません。');
  if (bet.guildId !== guildId) return interaction.reply('このサーバーの賭けではありません。');
  if (bet.creatorId !== interaction.user.id) {
    return interaction.reply('賭けを締め切れるのは作成者のみです。');
  }
  if (bet.isClosed) return interaction.reply('この賭けはすでに締め切られています。');

  // 参加者のユーザー名を取得
  const options = [];
  for (const userId of bet.participants) {
    try {
      const member = await interaction.guild.members.fetch(userId);
      options.push({
        label: member.displayName, // ← ここがユーザー名
        value: userId
      });
    } catch (e) {
      // 取得できなかった場合はIDで代用
      options.push({
        label: `ユーザーID: ${userId}`,
        value: userId
      });
    }
  }

  const row = {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: `bet_winner_select_${bet._id}`,
        placeholder: '勝者を選択（複数選択可）',
        min_values: 1,
        max_values: bet.participants.length,
        options
      }
    ]
  };

  return interaction.reply({
    content: '勝者を選んでください。',
    components: [row]
  });
}


    // -------------------------
    // LIST
    // -------------------------
    if (sub === 'list') {
      const bets = await Bet.find({ guildId, isClosed: false });

      if (bets.length === 0) {
        return interaction.reply('現在進行中の賭けはありません。');
      }

      const embed = new EmbedBuilder()
        .setTitle('現在の賭け一覧')
        .setDescription(
          bets
            .map(b => `ID: **${b._id}**\n内容: ${b.description}\n参加者: ${b.participants.length}人`)
            .join('\n\n')
        );

      return interaction.reply({ embeds: [embed] });
    }
  }
};
