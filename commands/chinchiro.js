// commands/chinchiro.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const games = new Map(); // channelId → ゲーム中フラグ

/**
 * サイコロを3つ振って役とランクを返す
 * @returns {{ dice: number[], label: string, rank: number }}
 */
function rollDice() {
  const dice = Array.from({ length: 3 }, () => Math.floor(Math.random() * 6) + 1);
  const [a, b, c] = dice;
  const sorted = [...dice].sort((x, y) => x - y);
  let label, rank;

  // シゴロ (4-5-6)
  if (sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6) {
    label = 'シゴロ (4-5-6)';
    rank = 100;

  // ヒフミ (1-2-3)
  } else if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
    label = 'ヒフミ (1-2-3)';
    rank = 0;

  // ゾロ目 (三つ同じ)
  } else if (a === b && b === c) {
    label = `ゾロ目 (${a}のゾロ目)`;
    rank = 50 + a;

  // ポイント (一対＋余り1つ)
  } else if (a === b || a === c || b === c) {
    const pair = a === b || a === c ? a : b;
    const point = [a, b, c].filter(x => x !== pair)[0];
    label = `${point}点`;
    rank = 10 + point;

  // 役なし
  } else {
    label = '役なし';
    rank = 0;
  }

  return { dice, label, rank };
}

/** ダイスの数字を絵文字に変換 */
function emojify(n) {
  return ['⚀','⚁','⚂','⚃','⚄','⚅'][n - 1];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chinchiro')
    .setDescription('チンチロリンを2名で行います'),
  
  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (games.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルでは既にチンチロリンが進行中です。',
        ephemeral: true
      });
    }
    games.set(channelId, true);

    // 参加待ち
    const game = { players: [interaction.user.id] };
    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('chinchiro_join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.reply({
      content: `${interaction.user} さんがチンチロリンを開始しました！もう1人参加してください。`,
      components: [joinRow],
      fetchReply: true
    });

    // 参加ボタン収集 (30秒)
    const joinCollector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000
    });

    joinCollector.on('collect', async btnInt => {
      if (btnInt.customId !== 'chinchiro_join') return;
      if (game.players.includes(btnInt.user.id)) {
        return btnInt.reply({ content: '既に参加しています。', ephemeral: true });
      }

      game.players.push(btnInt.user.id);
      await btnInt.reply({ content: '参加完了！結果を生成します…', ephemeral: true });
      joinCollector.stop('ready');
    });

    joinCollector.on('end', async (_, reason) => {
      if (reason !== 'ready' || game.players.length < 2) {
        // 2人揃わなかった
        await msg.edit({
          content: '参加者が揃わなかったため、チンチロリンを中止しました。',
          components: []
        });
        games.delete(channelId);
        return;
      }

      // 2人そろったので連続ロール開始
      const [p1, p2] = game.players;
      let round = 1;
      let log = '🎲 チンチロリン開始！ 🎲\n';
      let winner = null;

      // 同点でない結果が出るまでループ
      while (!winner) {
        const r1 = rollDice();
        const r2 = rollDice();
        const d1 = r1.dice.map(emojify).join('');
        const d2 = r2.dice.map(emojify).join('');

        log += `\n**${round}戦目**\n` +
               `<@${p1}>: ${d1} → ${r1.label}\n` +
               `<@${p2}>: ${d2} → ${r2.label}\n`;

        if (r1.rank > r2.rank) {
          winner = p1;
          log += `\n🏆 **<@${p1}> の勝ち！**\n`;
        } else if (r1.rank < r2.rank) {
          winner = p2;
          log += `\n🏆 **<@${p2}> の勝ち！**\n`;
        } else {
          log += `\n🤝 引き分けです！再戦します…\n`;
          round++;
        }
      }

      // 最終結果を編集して表示
      await msg.edit({
        content: log,
        components: []
      });

      games.delete(channelId);
    });
  }
};
