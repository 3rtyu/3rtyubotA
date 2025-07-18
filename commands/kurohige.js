// commands/kurohige.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const gameStates = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kurohige')
    .setDescription('黒ひげ危機一髪ゲームを開始します'),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (gameStates.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルではゲームが進行中です。',
        ephemeral: true
      });
    }

    const game = {
      initiator: interaction.user.id,
      players: [interaction.user.id],
      status: 'recruiting',
      usedNumbers: new Set(),
      bombNumber: Math.floor(Math.random() * 10) + 1
    };
    gameStates.set(channelId, game);

    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kurohige_join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary)
    );

    const joinMsg = await interaction.reply({
      content:
        `${interaction.user} さんが黒ひげ危機一髪ゲームを開始しました！\n` +
        '30秒間参加可能です。「参加する」ボタンを押して参加してください。',
      components: [joinRow],
      fetchReply: true
    });

    const joinCollector = joinMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000
    });

    joinCollector.on('collect', async btn => {
      const uid = btn.user.id;
      if (game.players.includes(uid)) {
        return btn.reply({ content: '既に参加しています。', ephemeral: true });
      }
      game.players.push(uid);
      await btn.reply({ content: '参加しました！', ephemeral: true });
    });

    joinCollector.on('end', async () => {
      const players = game.players;
      if (!players || players.length < 2) {
        await joinMsg.edit({
          content: '参加者が2名未満だったため、ゲームは中止されました。',
          components: []
        });
        gameStates.delete(channelId);
        return;
      }

      game.status = 'playing';
      game.turnOrder = [...players].sort(() => Math.random() - 0.5);
      game.turnIndex = 0;

      await joinMsg.edit({
        content:
          `🎮 募集終了！参加者: ${players.map(id => `<@${id}>`).join(' ')}\n` +
          '地雷番号が1〜10のうち1つ決まりました！順番に数字を選んでください。\n' +
          `🎯 最初のターン: <@${game.turnOrder[0]}>（3分以内に選択）`,
        components: [makeNumberButtons(game.usedNumbers)]
      });

      await startTurn(joinMsg, gameStates.get(channelId));
    });
  }
};

function makeNumberButtons(usedSet) {
  const row = new ActionRowBuilder();
  for (let i = 1; i <= 10; i++) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`kurohige_pick_${i}`)
        .setLabel(`${i}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(usedSet.has(i))
    );
  }
  return row;
}

function startTurn(msg, game) {
  const channelId = msg.channel.id;
  const currentPlayer = game.turnOrder[game.turnIndex];

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 3 * 60 * 1000 // 3分
  });

  collector.on('collect', async btn => {
    const uid = btn.user.id;
    const selected = Number(btn.customId.split('_').pop());

    if (uid !== currentPlayer) {
      return btn.reply({ content: '今はあなたのターンではありません！', ephemeral: true });
    }

    if (game.usedNumbers.has(selected)) {
      return btn.reply({ content: 'その番号はすでに選ばれています。', ephemeral: true });
    }

    game.usedNumbers.add(selected);

    if (selected === game.bombNumber) {
      await btn.reply(`💥 ${selected} を選んで爆発！<@${uid}> の負けです！`);
      await msg.edit({
        content:
          `💣 地雷は **${selected}** でした！\n爆発したのは <@${uid}> さんです！`,
        components: []
      });
      collector.stop('end');
      gameStates.delete(channelId);
    } else {
      await btn.reply(`✅ ${selected} はセーフ！`);
      game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
      const nextPlayer = game.turnOrder[game.turnIndex];

      await msg.edit({
        content:
          `✅ <@${uid}> が ${selected} を選びました → セーフ！\n` +
          `次のターン: <@${nextPlayer}>（3分以内に選択してください）`,
        components: [makeNumberButtons(game.usedNumbers)]
      });

      collector.stop('continue');
      startTurn(msg, gameStates.get(channelId));
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'end' || reason === 'continue') return;
    await msg.edit({
      content: `⏱ <@${currentPlayer}> が時間切れ（3分）となったため、ゲームは終了しました。`,
      components: []
    });
    gameStates.delete(channelId);
  });
}
