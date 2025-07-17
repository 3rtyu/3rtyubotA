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
 * 計算問題と正解を生成する（掛け算を優先）
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
  if (op2 === '*' && (op1 === '+' || op1 === '-')) {
    const mult = b * c;
    answer = op1 === '+' ? a + mult : a - mult;
  } else {
    let interim;
    if (op1 === '*') interim = a * b;
    else if (op1 === '+') interim = a + b;
    else interim = a - b;

    if (op2 === '*') answer = interim * c;
    else if (op2 === '+') answer = interim + c;
    else answer = interim - c;
  }

  return { question, answer };
}

/**
 * 正解とダミーをシャッフルして返す
 * @param {number} correct
 * @returns {number[]}
 */
function makeChoices(correct) {
  const set = new Set([correct]);
  while (set.size < 3) {
    const delta = Math.floor(Math.random() * 11) - 5;
    const wrong = correct + (delta === 0 ? 1 : delta);
    if (wrong >= 0) set.add(wrong);
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

/** ボタンを全て無効化する */
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
    .setDescription('5分の制限時間で三択計算早押しを開始します')
    .addSubcommand(sub =>
      sub.setName('start').setDescription('ゲームを開始する')
    ),

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    if (games.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルではすでにゲームが進行中です。',
        ephemeral: true
      });
    }

    games.set(channelId, true);

    const { question, answer } = generateProblem();
    const choices = makeChoices(answer);

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

    const quizMsg = await interaction.reply({
      content:
        '🧮 計算早押しチャレンジ（三択）！\n' +
        `問題: **${question}** = ?\n` +
        '正しい答えをボタンから選んでください。 (制限時間: 5分 or 先着5回答)',
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
        return btnInt.reply({
          content: 'すでに回答しています。',
          ephemeral: true
        });
      }

      respondents.add(userId);
      const picked = Number(btnInt.customId.split('_').pop());

      if (picked === answer) {
        await btnInt.update({
          content: `🎉 正解！ ${btnInt.user} さんが **${answer}** を当てました！`,
          components: disableAll(quizMsg.components)
        });
        collector.stop('correct');
      } else {
        wrongRespondents.add(userId);
        await btnInt.reply({
          content: `❌ 残念！ ${picked} は違います。`,
          ephemeral: true
        });
        if (respondents.size >= 5) {
          collector.stop('limit');
        }
      }
    });

    collector.on('end', async (_, reason) => {
      const wrongList = Array.from(wrongRespondents)
        .map(id => `<@${id}>`)
        .join(' ') || 'なし';

      let resultMsg = '';
      if (reason === 'correct') {
        resultMsg = `🎉 正解者が出ました！\n答えは **${answer}** でした。\n`;
      } else if (reason === 'limit') {
        resultMsg = `⌛ 先着5回答に達しました！\n答えは **${answer}** でした。\n`;
      } else {
        resultMsg = `⌛ 制限時間終了！\n答えは **${answer}** でした。\n`;
      }

      resultMsg += `不正解者: ${wrongList}`;

      await quizMsg.edit({
        content: resultMsg,
        components: disableAll(quizMsg.components)
      });

      games.delete(channelId);
    });
  }
};
