// commands/kurohige_reaction.js
const { SlashCommandBuilder } = require('discord.js');

const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
const emojiToNumber = {
  '1️⃣': 1, '2️⃣': 2, '3️⃣': 3, '4️⃣': 4, '5️⃣': 5,
  '6️⃣': 6, '7️⃣': 7, '8️⃣': 8, '9️⃣': 9, '🔟': 10
};

const games = new Map(); // channelId → game object

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kurohige')
    .setDescription('黒ひげ危機一髪風ゲームを開始します！'),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (games.has(channelId)) {
      return interaction.reply({ content: 'このチャンネルでは既にゲームが進行中です。', ephemeral: true });
    }

    // 初期ゲーム状態
    const game = {
      status: 'recruiting',
      players: [interaction.user.id],
      bomb: Math.floor(Math.random() * 10) + 1,
      used: new Set()
    };
    games.set(channelId, game);

    const joinMsg = await interaction.reply({
      content: `${interaction.user} さんが黒ひげリアクションゲームを開始！参加したい人は30秒以内に「参加」リアクションをしてください。`,
      fetchReply: true
    });

    await joinMsg.react('🖐️'); // 参加用リアクション

    // 参加者収集（🖐️）を30秒受け付け
    const joinCollector = joinMsg.createReactionCollector({
      filter: (r, u) => !u.bot && r.emoji.name === '🖐️',
      time: 30_000
    });

    joinCollector.on('collect', (reaction, user) => {
      if (!game.players.includes(user.id)) {
        game.players.push(user.id);
      }
    });

    joinCollector.on('end', async () => {
      if (game.players.length < 2) {
        await joinMsg.edit({ content: '参加者が2人未満だったため、ゲームを中止しました。' });
        games.delete(channelId);
        return;
      }

      // ゲーム開始
      game.status = 'playing';
      game.order = [...game.players].sort(() => Math.random() - 0.5);
      game.turn = 0;

      const playMsg = await interaction.channel.send({
        content:
          `🎯 地雷番号（1〜10）が設定されました！リアクションで数字を選択しましょう！\n` +
          `順番: ${game.order.map(id => `<@${id}>`).join(' → ')}\n` +
          `最初のターン: <@${game.order[0]}>（3分以内にリアクションを押してください）`
      });

      for (const emoji of numberEmojis) {
        await playMsg.react(emoji);
      }

      await startTurn(playMsg, game, channelId);
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
      games.delete(channelId);
      collector.stop();
    } else {
      await msg.channel.send(`✅ <@${uid}> が ${emoji} を選択 → セーフ！`);
      game.turn = (game.turn + 1) % game.order.length;
      const nextId = game.order[game.turn];
      await msg.channel.send(`🕹️ 次のターン: <@${nextId}>（3分以内にリアクションを押してください）`);
      collector.stop();
      await startTurn(msg, game, channelId);
    }
  });

  collector.on('end', async (_, reason) => {
    if (!games.has(channelId)) return;
    if (reason !== 'messageDelete' && reason !== 'userStop') {
      await msg.channel.send(`⏱ <@${currentId}> が時間切れ！ゲーム終了。`);
      games.delete(channelId);
    }
  });
}
