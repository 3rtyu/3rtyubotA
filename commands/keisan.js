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
 * 掛け算を先に、足し算・引き算はその後に計算します
 * @returns {{ question: string, answer: number }}
 */
function generateProblem() {
  const a = randInt();
  const b = randInt();
  const c = randInt();
  const ops = ['+', '-', '*'];
  const op1 = ops[Math.floor(Math.random() * ops.length)];
  const op2 = ops[Math.floor(Math.random() * ops.length)];

  // 見た目用に × を使う
  const symbolMap = { '+': '+', '-': '-', '*': '×' };
  const question = `${a} ${symbolMap[op1]} ${b} ${symbolMap[op2]} ${c}`;

  let answer;
  // op2 が掛け算かつ op1 が加減の場合 => a ± (b * c)
  if (op2 === '*' && (op1 === '+' || op1 === '-')) {
    const mult = b * c;
    answer = op1 === '+' ? a + mult : a - mult;

  // それ以外は左から順に計算
  } else {
    // まず op1
    let interim;
    if (op1 === '*') interim = a * b;
    else if (op1 === '+') interim = a + b;
    else interim = a - b;

    // 次に op2
    if (op2 === '*') answer = interim * c;
    else if (op2 === '+') answer = interim + c;
    else answer = interim - c;
  }

  return { question, answer };
}

/**
 * 正解とダミー選択肢を組み合わせてシャッフルして返す
 * @param {number} correct
 * @returns {number[]}
 */
function makeChoices(correct) {
  const choices = new Set([correct]);
  while (choices.size < 3) {
    const delta = Math.floor(Math.random() * 11) - 5; // -5〜+5
    const wrong = correct + (delta === 0 ? 1 : delta);
    if (wrong >= 0) choices.add(wrong);
  }
  return Array.from(choices).sort(() => Math.random() - 0.5);
}

/**
 * ActionRowBuilder[] を受け取り、全てのボタンを無効化して返す
 * @param {ActionRowBuilder[]} rows
 */
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
      sub
        .setName('start')
        .setDescription('ゲームを開始する')
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

    // 問題と選択肢を生成
    const { question, answer } = generateProblem();
    const choices = makeChoices(answer);

    // 選択肢ボタン
    const choiceRow = new ActionRowBuilder().addComponents(
      choices.map(num =>
        new ButtonBuilder()
          .setCustomId(`keisan_choice_${num}`)
          .setLabel(num.toString())
          .setStyle(ButtonStyle.Primary)
      )
    );

    // 出題メッセージ
    const quizMsg = await interaction.reply({
      content:
        '🧮 計算早押しチャレンジ（三択）！\n' +
        `問題: **${question}** = ?\n` +
        '正しい答えをボタンから選んでください。 (制限時間: 5分 or 先着5回答)',
      components: [choiceRow],
      fetchReply: true
    });

    // ユニーク回答者をカウント
    const respondents = new Set();

    // 回答ボタン収集器
    const collector = quizMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000 // 5分
    });

    collector.on('collect', async btnInt => {
      const userId = btnInt.user.id;
      respondents.add(userId);

      const picked = Number(btnInt.customId.split('_').pop());
      if (picked === answer) {
        // 正解者が出たらすぐ終了
        await btnInt.update({
          content: `🎉 正解！ ${btnInt.user} さんが **${answer}** を当てました！`,
          components: disableAll(quizMsg.components)
        });
        collector.stop('correct');
      } else {
        // 誤答
        await btnInt.reply({
          content: `❌ 残念！ ${picked} は違います。`,
          ephemeral: true
        });
        // 5人が回答(誤答含む)したら終了
        if (respondents.size >= 5) {
          collector.stop('limit');
        }
      }
    });

    collector.on('end', async (_, reason) => {
      // 正解時はすでに処理済み
      if (reason === 'correct') {
        games.delete(channelId);
        return;
      }

      // 期限切れ or 5回答到達時に答えを発表
      await quizMsg.edit({
        content:
          (reason === 'limit'
            ? '⌛ 先着5回答に達しました！\n'
            : '⌛ 制限時間終了！\n') +
          `答えは **${answer}** でした。`,
        components: disableAll(quizMsg.components)
      });

      games.delete(channelId);
    });
  }
};
