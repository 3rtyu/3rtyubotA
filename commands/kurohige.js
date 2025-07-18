// commands/kurohige.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const gameStates = new Map(); // チャンネルID → ゲーム状態

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kurohige')
    .setDescription('黒ひげ危機一髪風ミニゲームを開始します'),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (gameStates.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルではすでに黒ひげゲームが進行中です。',
        ephemeral: true
      });
    }

    // ゲーム初期化
    const game = {
      players: [interaction.user.id],
      status: 'recruiting',
      usedNumbers: new Set(),
      bombNumber: Math.floor(Math.random() * 10) + 1
    };
    gameStates.set(channelId, game);

    // 参加ボタン
    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kurohige_join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary)
    );

    const joinMsg = await interaction.reply({
      content:
        `${interaction.user} さんが黒ひげゲームを開始しました！\n` +
        '30秒間「参加する」ボタンで参加できます！',
      components: [joinRow],
      fetchReply: true
    });

    // 参加収集器（30秒）
    const joinCollector = joinMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000
    });

    joinCollector.on('collect', async btn => {
      const uid = btn.user.id;
      if (game.players.includes(uid)) {
        return btn.reply({ content: 'すでに参加しています。', ephemeral: true });
      }
      game.players.push(uid);
      await btn.reply({ content: '参加登録しました！', ephemeral: true });
    });

    joinCollector.on('end', async () => {
      if (game.players.length < 2) {
        await joinMsg.edit({
          content: '参加者が2名未満だったため、ゲームを中止します。',
          components: []
        });
        gameStates.delete(channelId);
        return;
      }

      game.status = 'playing';
      game.turnOrder = [...game.players].sort(() => Math.random() - 0.5);
      game.turnIndex = 0;

      await joinMsg.edit({
        content:
          `💣 地雷番号（1〜10）が設定されました！\n` +
          `順番に数字ボタンを選びましょう。\n` +
          `地雷を押したら…爆発！\n\n` +
          `🌟 最初のターン: <@${game.turnOrder[0]}>（3分以内に選択してください）`,
        components: [makeNumberButtons(game.usedNumbers)]
      });

      startTurn(joinMsg, game);
    });
  }
};

/** 数字ボタン生成（使用済みは無効化） */
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

/** ターンを進める（個人ごとに3分の制限時間） */
function startTurn(msg, game) {
  const channelId = msg.channel.id;
  const currentPlayerId = game.turnOrder[game.turnIndex];

  const turnCollector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 3 * 60 * 1000 // 3分
  });

  turnCollector.on('collect', async btn => {
    const selected = Number(btn.customId.split('_').pop());
    const uid = btn.user.id;

    if (uid !== currentPlayerId) {
      return btn.reply({ content: 'あなたのターンではありません。', ephemeral: true });
    }
    if (game.usedNumbers.has(selected)) {
      return btn.reply({ content: 'この番号はすでに選ばれています。', ephemeral: true });
    }

    game.usedNumbers.add(selected);

    if (selected === game.bombNumber) {
      await btn.reply(`💥 ${selected} を選んで爆発！<@${uid}> の負けです…`);
      msg.edit({
        content:
          `💣 地雷は **${selected}** でした！\n` +
          `爆発したのは <@${uid}> さんです！`,
        components: []
      });
      turnCollector.stop('exploded');
      gameStates.delete(channelId);
    } else {
      await btn.reply(`✅ ${selected} はセーフです！`);

      // 次のプレイヤーへ
      game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
      const nextPlayer = game.turnOrder[game.turnIndex];

      msg.edit({
        content:
          `✅ <@${uid}> が ${selected} を選択 → セーフ！\n` +
          `次のターン: <@${nextPlayer}>（3分以内に選択してください）`,
        components: [makeNumberButtons(game.usedNumbers)]
      });

      turnCollector.stop('safe');
      startTurn(msg, game);
    }
  });

  turnCollector.on('end', async (_, reason) => {
    if (reason === 'exploded' || reason === 'safe') return;

    // ターン時間切れ
    await msg.edit({
      content:
        `⏱ <@${currentPlayerId}> が3分以内に選択しなかったため、ゲームは終了しました。`,
      components: []
    });
    gameStates.delete(channelId);
  });
}
