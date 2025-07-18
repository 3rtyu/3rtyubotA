// commands/kurohige_reaction.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
const emojiToNumber = {
  '1️⃣': 1, '2️⃣': 2, '3️⃣': 3, '4️⃣': 4, '5️⃣': 5,
  '6️⃣': 6, '7️⃣': 7, '8️⃣': 8, '9️⃣': 9, '🔟': 10
};

const games = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kurohige')
    .setDescription('黒ひげ風ゲームを開始します！'),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (games.has(channelId)) {
      return interaction.reply({ content: 'このチャンネルでは既にゲームが進行中です。', ephemeral: true });
    }

    const game = {
      status: 'recruiting',
      players: [interaction.user.id],
      bomb: Math.floor(Math.random() * 10) + 1,
      used: new Set()
    };
    games.set(channelId, game);

    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary)
    );

    const joinMsg = await interaction.reply({
      content: `${interaction.user} さんが黒ひげゲームを開始しました！\n30秒間「参加する」ボタンで参加してください。`,
      components: [joinRow],
      fetchReply: true
    });

    const collector = joinMsg.createMessageComponentCollector({
      componentType: 2,
      time: 30_000
    });

    collector.on('collect', async btn => {
      const uid = btn.user.id;
      if (!game.players.includes(uid)) {
        game.players.push(uid);
        await btn.reply({ content: '参加しました！', ephemeral: true });
      } else {
        await btn.reply({ content: '既に参加しています。', ephemeral: true });
      }
    });

    collector.on('end', async () => {
      if (game.players.length < 2) {
        await joinMsg.edit({
          content: '参加者が2名未満だったため、ゲームは中止されました。',
          components: []
        });
        games.delete(channelId);
        return;
      }

      game.status = 'playing';
      game.order = [...game.players].sort(() => Math.random() - 0.5);
      game.turn = 0;

      const playMsg = await interaction.channel.send({
        content:
          `🎮 募集終了！順番: ${game.order.map(id => `<@${id}>`).join(' → ')}\n` +
          `🎯 地雷番号が1〜10のうちで設定されました！\n` +
          `最初のターン: <@${game.order[0]}>（3分以内にリアクションを押してください）`
      });

      for (const emoji of numberEmojis) {
        await playMsg.react(emoji);
      }

      startTurn(playMsg, game, channelId);
    });
  }
};

async function startTurn(msg, game, channelId) {
  const currentId = game.order[game.turn];

  const collector = msg.createReactionCollector({
    filter: (r, u) => !u.bot && numberEmojis.includes(r.emoji.name),
    time: 3 * 60 * 1000
  });

  collector.on('collect', async (reaction, user) => {
    const emoji = reaction.emoji.name;
    const number = emojiToNumber[emoji];
    const uid = user.id;

    if (game.used.has(number)) {
      await reaction.users.remove(uid);
      return;
    }

    if (uid !== currentId) {
      await reaction.users.remove(uid); // ターン外ユーザーのリアクション削除
      return;
    }

    game.used.add(number);

    if (number === game.bomb) {
      await msg.channel.send(`💥 <@${uid}> が ${emoji} を選んで爆発！地雷でした…`);
      collector.stop('boom');
      games.delete(channelId);
    } else {
      await msg.channel.send(`✅ <@${uid}> が ${emoji} を選択 → セーフ！`);
      game.turn = (game.turn + 1) % game.order.length;
      const nextPlayer = game.order[game.turn];
      await msg.channel.send(`🕹️ 次のターン: <@${nextPlayer}>（3分以内にリアクションを押してください）`);
      collector.stop('next');
      startTurn(msg, games.get(channelId), channelId);
    }
  });

  collector.on('end', async (_, reason) => {
    if (!games.has(channelId)) return;
    if (reason !== 'boom' && reason !== 'next') {
      const current = game.order[game.turn];
      await msg.channel.send(`⏱ <@${current}> が時間切れ！ゲーム終了。`);
      games.delete(channelId);
    }
  });
}
