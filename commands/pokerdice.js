// commands/pokerdice.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder
} = require('discord.js');

const games = new Map(); // channelId → ゲーム状態

/**
 * 5つのサイコロを振る
 * @returns {number[]}
 */
function rollDice() {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
}

/**
 * サイコロの出目から役と強さ（ランク）を評価する
 * @param {number[]} dice
 * @returns {{ label: string, rank: number }}
 */
function evaluateHand(dice) {
  const counts = {};
  dice.forEach(d => (counts[d] = (counts[d] || 0) + 1));
  const freqs = Object.values(counts).sort((a, b) => b - a);
  const faces = Object.keys(counts)
    .map(n => parseInt(n, 10))
    .sort((a, b) => a - b);
  const isStraight =
    faces.length === 5 &&
    (faces.join(',') === '1,2,3,4,5' || faces.join(',') === '2,3,4,5,6');

  let label, rank;
  if (freqs[0] === 5) {
    label = 'Five of a Kind';
    rank = 7;
  } else if (freqs[0] === 4) {
    label = 'Four of a Kind';
    rank = 6;
  } else if (freqs[0] === 3 && freqs[1] === 2) {
    label = 'Full House';
    rank = 5;
  } else if (isStraight) {
    label = 'Straight';
    rank = 4;
  } else if (freqs[0] === 3) {
    label = 'Three of a Kind';
    rank = 3;
  } else if (freqs[0] === 2 && freqs[1] === 2) {
    label = 'Two Pair';
    rank = 2;
  } else if (freqs[0] === 2) {
    label = 'One Pair';
    rank = 1;
  } else {
    label = 'Nothing';
    rank = 0;
  }
  return { label, rank };
}

/**
 * 数字 → サイコロ絵文字
 * @param {number[]} dice
 * @returns {string}
 */
function emojify(dice) {
  const map = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  return dice.map(d => map[d - 1]).join('');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pokerdice')
    .setDescription('参加ボタンを押した人数でポーカーダイスを行います'),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (games.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルではすでにポーカーダイスが進行中です。',
        ephemeral: true
      });
    }

    // ゲーム状態を登録
    const game = { players: [interaction.user.id] };
    games.set(channelId, game);

    // 「参加する」ボタン
    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pokerdice_join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.reply({
      content:
        `${interaction.user} さんがポーカーダイスを開始しました！\n` +
        '参加する人は「参加する」ボタンを押してください。（30秒間）',
      components: [joinRow],
      fetchReply: true
    });

    // 30秒間、参加ボタンを受付
    const joinCollector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000
    });

    joinCollector.on('collect', async btn => {
      if (btn.customId !== 'pokerdice_join') return;

      if (game.players.includes(btn.user.id)) {
        return btn.reply({ content: 'すでに参加しています。', ephemeral: true });
      }
      game.players.push(btn.user.id);
      await btn.reply({ content: '参加登録しました！', ephemeral: true });
    });

    joinCollector.on('end', async () => {
      // 参加者が2人未満なら中止
      if (game.players.length < 2) {
        await msg.edit({
          content: '参加者が2名未満のため、ポーカーダイスを中止しました。',
          components: []
        });
        games.delete(channelId);
        return;
      }

      // 参加者全員でダイスを振って評価
      const results = game.players.map(uid => {
        const dice = rollDice();
        const { label, rank } = evaluateHand(dice);
        return { uid, dice, label, rank };
      });

      // ランク順にソート（高い順）
      results.sort((a, b) => b.rank - a.rank);

      // 勝者判定（同一rankは引き分け）
      const topRank = results[0].rank;
      const winners = results.filter(r => r.rank === topRank);

      // 結果をEmbedで作成
      const embed = new EmbedBuilder()
        .setTitle('🎲 ポーカーダイス 結果 🎲')
        .setColor('#00AAFF')
        .setDescription(
          winners.length > 1
            ? `👑 引き分け: ${winners.map(w => `<@${w.uid}>`).join(' ')}`
            : `🏆 勝者: <@${winners[0].uid}>`
        );

      results.forEach(r => {
        embed.addFields({
          name: `<@${r.uid}>`,
          value: `${emojify(r.dice)} → ${r.label}`,
          inline: false
        });
      });

      // メッセージを更新
      await msg.edit({ content: null, embeds: [embed], components: [] });
      games.delete(channelId);
    });
  }
};
