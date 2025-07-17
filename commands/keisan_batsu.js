// commands/keisan.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const games = new Map();

/** 1〜20のランダム整数を返す */
function randInt() {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * 計算問題と正解を生成する
 * 掛け算優先ルールを適用
 * @returns {{ question: string, answer: number }}
 */
function generateProblem() {
  const a = randInt();
  const b = randInt();
  const c = randInt();
  const ops = ['+', '-', '*'];
  const op1 = ops[Math.floor(Math.random() * ops.length)];
  const op2 = ops[Math.floor(Math.random() * ops.length)];
  const symbolMap = { '+': '+', '-': '-', '*': '×' };
  const question = `${a} ${symbolMap[op1]} ${b} ${symbolMap[op2]} ${c}`;

  let answer;
  // op2 が '*' かつ op1 が '+' or '-' の場合は a ± (b*c)
  if (op2 === '*' && (op1 === '+' || op1 === '-')) {
    const mult = b * c;
    answer = op1 === '+' ? a + mult : a - mult;
  } else {
    // 左から順に計算
    let interim = op1 === '*' ? a * b : op1 === '+' ? a + b : a - b;
    answer = op2 === '*'
      ? interim * c
      : op2 === '+'
      ? interim + c
      : interim - c;
  }

  return { question, answer };
}

/**
 * 正解とダミーを混ぜた三択を生成
 * @param {number} correct
 * @returns {number[]}
 */
function makeChoices(correct) {
  const set = new Set([correct]);
  while (set.size < 3) {
    const delta = Math.floor(Math.random() * 11) - 5; // -5〜+5
    const wrong = correct + (delta === 0 ? 1 : delta);
    if (wrong >= 0) set.add(wrong);
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

/** すべてのボタンを無効化 */
function disableAll(rows) {
  return rows.map(row => {
    const r = ActionRowBuilder.from(row);
    r.components = r.components.map(btn =>
      ButtonBuilder.from(btn).setDisabled(true)
    );
    return r;
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('keisan')
    .setDescription('計算早押しチャレンジ（罰ゲーム付き）')
    .addSubcommandGroup(group =>
      group
        .setName('batsu')
        .setDescription('罰ゲーム付きの早押しを開始')
        .addSubcommand(sub =>
          sub.setName('start').setDescription('ゲームを開始する')
        )
    ),

  async execute(_, interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(false);

    // /keisan batsu start のみ処理
    if (group !== 'batsu' || sub !== 'start') {
      return interaction.reply({
        content: '無効なサブコマンドです。',
        ephemeral: true
      });
    }

    const channelId = interaction.channelId;
    if (games.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルではすでにゲームが進行中です。',
        ephemeral: true
      });
    }
    games.set(channelId, true);

    // 問題と選択肢生成
    const { question, answer } = generateProblem();
    const choices = makeChoices(answer);

    // 回答者トラッカー
    const respondents = new Set();
    const wrongRespondents = new Set();

    const choiceRow = new ActionRowBuilder().addComponents(
      choices.map(num =>
        new ButtonBuilder()
          .setCustomId(`keisan_choice_${num}`)
          .setLabel(num.toString())
          .setStyle(ButtonStyle.Primary)
      )
    );

    // 出題
    const quizMsg = await interaction.reply({
      content:
        '🧮 罰ゲーム付き 計算早押しチャレンジ（三択）！\n' +
        `問題: **${question}** = ?\n` +
        '正解すればセーフ、外すと罰ゲーム！(5分 or 先着5回答)',
      components: [choiceRow],
      fetchReply: true
    });

    const collector = quizMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async btnInt => {
      const userId = btnInt.user.id;
      if (respondents.has(userId)) {
        return btnInt.reply({ content: 'すでに回答済みです。', ephemeral: true });
      }
      respondents.add(userId);

      const picked = Number(btnInt.customId.split('_').pop());
      if (picked === answer) {
        await btnInt.update({
          content: `🎉 正解！ ${btnInt.user} さんはセーフです！`,
          components: disableAll(quizMsg.components)
        });
        collector.stop('correct');
      } else {
        wrongRespondents.add(userId);
        await btnInt.reply({
          content: `❌ 外れ！ ${btnInt.user} さんは罰ゲーム対象です。`,
          ephemeral: false
        });
        if (respondents.size >= 5) collector.stop('limit');
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'correct') {
        games.delete(channelId);
        return;
      }

      const wrongList = Array.from(wrongRespondents)
        .map(id => `<@${id}>`)
        .join(' ') || 'なし';

      await quizMsg.edit({
        content:
          (reason === 'limit'
            ? '⌛ 先着5回答に達しました！\n'
            : '⌛ 制限時間終了！\n') +
          `答えは **${answer}** でした。\n` +
          `不正解者: ${wrongList}`,
        components: disableAll(quizMsg.components)
      });

      games.delete(channelId);
    });
  }
};
