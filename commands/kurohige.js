// commands/kurohige.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const gameStates = new Map(); // channelId → game

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kurohige')
    .setDescription('黒ひげ危機一髪風ゲーム（順番制・ターン時間制限あり）'),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (gameStates.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルでは既にゲームが進行中です。',
        ephemeral: true
      });
    }

    const game = {
      players: [interaction.user.id],
      used: new Set(),
      bomb: Math.floor(Math.random() * 10) + 1,
      status: 'recruiting'
    };
    gameStates.set(channelId, game);

    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kurohige_join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.reply({
      content:
        `${interaction.user} さんが黒ひげ危機一髪ゲームを開始しました！\n` +
        '参加する方は「参加する」ボタンを押してください。（30秒間募集）',
      components: [joinRow],
      fetchReply: true
    });

    const joinCollector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000
    });

    joinCollector.on('collect', async btn => {
      if (btn.customId !== 'kurohige_join') return;
      if (game.players.includes(btn.user.id)) {
        return btn.reply({ content: '既に参加済みです。', ephemeral: true });
      }
      game.players.push(btn.user.id);
      await btn.reply({ content: '参加登録しました！', ephemeral: true });
    });

    joinCollector.on('end', async () => {
      if (game.players.length < 2) {
        await msg.edit({
          content: '参加者が2名未満だったため、ゲームを中止しました。',
          components: []
        });
        gameStates.delete(channelId);
        return;
      }

      // プレイ開始
      game.status = 'playing';
      game.order = game.players.sort(() => Math.random() - 0.5);
      game.currentTurn = 0;

      await msg.edit({
        content:
          `💣 地雷番号が設定されました！（1〜10の中に1つ）\n` +
          `順番はランダムで決定されました。\n` +
          `最初のターン: <@${game.order[0]}>（3分以内に番号を選択してください）`,
        components: [createButtons(game.used)]
      });

      await startTurn(game, msg);
    });
  }
};

/** 1〜10 のボタン行を生成（使用済みは無効） */
function createButtons(usedSet) {
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

/** 現在のプレイヤーのターンを開始（3分制限） */
async function startTurn(game, msg) {
  const channelId = msg.channel.id;
  const currentId = game.order[game.currentTurn];

  const turnCollector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 3 * 60 * 1000 // 3分
  });

  turnCollector.on('collect', async btn => {
    const userId = btn.user.id;
    if (userId !== currentId) {
      return btn.reply({ content: '現在はあなたのターンではありません！', ephemeral: true });
    }

    const picked = Number(btn.customId.split('_').pop());
    if (game.used.has(picked)) {
      return btn.reply({ content: 'この番号はすでに選択されています。', ephemeral: true });
    }

    game.used.add(picked);

    if (picked === game.bomb) {
      await btn.reply(`💥 ${picked} を選んで爆発！<@${userId}> の負けです…`);
      await msg.edit({
        content:
          `💣 地雷は **${picked}** でした！\n` +
          `爆発したのは <@${userId}> さんです！`,
        components: []
      });
      turnCollector.stop('end');
      gameStates.delete(channelId);
    } else {
      await btn.reply(`✅ ${picked} はセーフです！`);

      game.currentTurn = (game.currentTurn + 1) % game.order.length;
      const nextId = game.order[game.currentTurn];

      await msg.edit({
        content:
          `✅ <@${userId}> が ${picked} を選択 → セーフ！\n` +
          `次のターン: <@${nextId}>（3分以内に番号を選択してください）`,
        components: [createButtons(game.used)]
      });

      turnCollector.stop('next');

      // 次ターン開始
      await startTurn(gameStates.get(channelId), msg);
    }
  });

  turnCollector.on('end', async (_, reason) => {
    if (reason === 'end' || reason === 'next') return;
    await msg.edit({
      content:
        `⏱ <@${currentId}> が時間切れ（3分）になりました。\n` +
        'ゲームを終了します。',
      components: []
    });
    gameStates.delete(channelId);
  });
}
