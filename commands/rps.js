// commands/rps.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const games = new Map(); // channelId → ゲーム情報

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('2名でじゃんけんを開始します'),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (games.has(channelId)) {
      return interaction.reply({ content: '既にこのチャンネルではゲームが進行中です。', ephemeral: true });
    }

    // ゲーム初期化
    const game = {
      players: [interaction.user.id],
      picks: {}
    };
    games.set(channelId, game);

    // 「参加する」ボタンを表示
    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rps_join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary)
    );
    const joinMessage = await interaction.reply({
      content: `${interaction.user.username}さんがじゃんけんを開始しました！もう1人参加してください。`,
      components: [joinRow],
      fetchReply: true
    });

    // 参加ボタンの収集器
    const joinCollector = joinMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    joinCollector.on('collect', async btnInt => {
      if (btnInt.customId !== 'rps_join') return;
      if (game.players.includes(btnInt.user.id)) {
        return btnInt.reply({ content: 'あなたは既に参加しています。', ephemeral: true });
      }

      game.players.push(btnInt.user.id);
      await btnInt.reply({ content: '参加完了！じゃんけんを開始します。', ephemeral: true });
      joinCollector.stop('ready');
    });

    joinCollector.on('end', async (_, reason) => {
      if (reason !== 'ready' || game.players.length < 2) {
        // 2人揃わなかった
        await joinMessage.edit({
          content: '参加者が揃わなかったため、じゃんけんをキャンセルしました。',
          components: []
        });
        games.delete(channelId);
        return;
      }

      // 手を選ぶボタンを表示
      const pickRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rps_select_rock')
          .setLabel('グー')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rps_select_paper')
          .setLabel('パー')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rps_select_scissors')
          .setLabel('チョキ')
          .setStyle(ButtonStyle.Secondary)
      );

      await joinMessage.edit({
        content: '2名参加しました！手を選んでください。',
        components: [pickRow]
      });

      // 選択ボタンの収集器
      const pickCollector = joinMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });

      pickCollector.on('collect', async pickInt => {
        if (!game.players.includes(pickInt.user.id)) return;
        if (game.picks[pickInt.user.id]) {
          return pickInt.reply({ content: 'あなたは既に手を選択済みです。', ephemeral: true });
        }

        let choice;
        switch (pickInt.customId) {
          case 'rps_select_rock':
            choice = 'グー';
            break;
          case 'rps_select_paper':
            choice = 'パー';
            break;
          case 'rps_select_scissors':
            choice = 'チョキ';
            break;
          default:
            return;
        }

        game.picks[pickInt.user.id] = choice;
        await pickInt.reply({ content: `あなたの手: ${choice}`, ephemeral: true });

        // 両者選択済みなら終了
        if (Object.keys(game.picks).length === 2) {
          pickCollector.stop('done');
        }
      });

      pickCollector.on('end', async (_, reason) => {
        const [p1, p2] = game.players;
        const c1 = game.picks[p1] || '―';
        const c2 = game.picks[p2] || '―';

        // 勝敗判定
        let resultText;
        if (c1 === c2) {
          resultText = '引き分け！';
        } else if (
          (c1 === 'グー' && c2 === 'チョキ') ||
          (c1 === 'チョキ' && c2 === 'パー') ||
          (c1 === 'パー' && c2 === 'グー')
        ) {
          resultText = `<@${p1}> の勝ち！`;
        } else {
          resultText = `<@${p2}> の勝ち！`;
        }

        // 結果を表示しボタンを消す
        await joinMessage.edit({
          content:
            `結果発表！\n` +
            `<@${p1}>: ${c1}\n` +
            `<@${p2}>: ${c2}\n\n` +
            resultText,
          components: []
        });

        games.delete(channelId);
      });
    });
  }
};
