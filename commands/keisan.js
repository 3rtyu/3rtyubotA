const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} = require('discord.js');

const games = new Map();

/** 5〜20のランダム整数を返す */
function randInt() {
  return Math.floor(Math.random() * 16) + 5; // 0..15 -> 5..20
}

const symbolMap = { '+': '+', '-': '-', '*': '×' };

/**
 * 計算問題と正解を生成する（掛け算を優先）
 * 答えは必ず3桁以上（>=100）になるようにループで生成
 * @returns {{ question: string, answer: number }}
 */
function generateProblem() {
  while (true) {
    const a = randInt();
    const b = randInt();
    const c = randInt();
    const ops = ['+', '-', '*'];
    const op1 = ops[Math.floor(Math.random() * ops.length)];
    const op2 = ops[Math.floor(Math.random() * ops.length)];
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

    if (Number.isFinite(answer) && Math.abs(answer) >= 100) {
      if (answer >= 100) return { question, answer };
    }
  }
}

/**
 * 正解とダミーをシャッフルして返す
 */
function makeChoices(correct) {
  const str = String(correct);
  if (str.length < 3) {
    const set = new Set([correct]);
    while (set.size < 3) {
      const delta = Math.floor(Math.random() * 101) - 50;
      const wrong = correct + (delta === 0 ? 1 : delta);
      if (wrong >= 100) set.add(wrong);
    }
    return Array.from(set).sort(() => Math.random() - 0.5);
  }

  const hundreds = Math.floor(correct / 100);
  const units = correct % 10;
  const origTens = Math.floor((correct % 100) / 10);

  const tensCandidates = [];
  for (let t = 0; t <= 9; t++) {
    if (t === origTens) continue;
    tensCandidates.push(t);
  }

  for (let i = tensCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tensCandidates[i], tensCandidates[j]] = [tensCandidates[j], tensCandidates[i]];
  }

  const set = new Set([correct]);
  let idx = 0;
  while (set.size < 3 && idx < tensCandidates.length) {
    const t = tensCandidates[idx++];
    const wrong = hundreds * 100 + t * 10 + units;
    if (wrong >= 100 && wrong !== correct) set.add(wrong);
  }

  while (set.size < 3) {
    const delta = Math.floor(Math.random() * 101) - 50;
    const wrong = correct + (delta === 0 ? 1 : delta);
    if (wrong >= 100) set.add(wrong);
  }

  return Array.from(set).sort(() => Math.random() - 0.5);
}

/** 全ボタンを無効化する */
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
    .setDescription('3択計算クイズを開始します！')
    .addSubcommand(sub =>
      sub.setName('start').setDescription('ゲームを開始する')
    )
    .addSubcommand(sub =>
      sub.setName('stop').setDescription('ゲームを途中で終了する')
    ),

  async execute(interaction) { // ✅ client を削除して interaction のみ
    const channelId = interaction.channelId;
    const sub = interaction.options.getSubcommand();

    if (sub === 'stop') {
      if (!games.has(channelId)) {
        return interaction.reply({
          content: '進行中のゲームがありません。',
          flags: MessageFlags.Ephemeral
        });
      }
      const game = games.get(channelId);
      if (game && game.collector) game.collector.stop('manual');
      return interaction.reply({
        content: 'ゲームを停止しました。',
        flags: MessageFlags.Ephemeral
      });
    }

    if (games.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルではすでにゲームが進行中です。',
        flags: MessageFlags.Ephemeral
      });
    }
    games.set(channelId, null);

    const { question, answer } = generateProblem();
    const choices = makeChoices(answer);

    const respondents = new Set();
    const correctRespondents = new Set();
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
        '🧮 3分間の三択計算クイズスタート！\n' +
        `問題: **${question}** = ?\n` +
        'ボタンをクリックした瞬間に正誤を公開します。',
      components: [choiceRow],
      fetchReply: true
    });

    const collector = quizMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 3 * 60 * 1000
    });

    games.set(channelId, {
      collector,
      quizMsg,
      answer,
      respondents,
      correctRespondents,
      wrongRespondents
    });

    collector.on('collect', async btnInt => {
      const userId = btnInt.user.id;
      if (respondents.has(userId)) {
        return btnInt.reply({
          content: 'すでに回答済みです。',
          flags: MessageFlags.Ephemeral
        });
      }
      respondents.add(userId);

      const picked = Number(btnInt.customId.split('_').pop());
      if (picked === answer) {
        correctRespondents.add(userId);
        await btnInt.reply({ content: `🎉 <@${userId}> さん、正解！` });
      } else {
        wrongRespondents.add(userId);
        await btnInt.reply({ content: `❌ <@${userId}> さん、不正解…` });
      }
    });

    collector.on('end', async () => {
      const game = games.get(channelId);
      if (!game) return;

      const { quizMsg, answer, correctRespondents, wrongRespondents } = game;

      const correctList = correctRespondents.size
        ? Array.from(correctRespondents).map(id => `<@${id}>`).join(' ')
        : 'なし';
      const wrongList = wrongRespondents.size
        ? Array.from(wrongRespondents).map(id => `<@${id}>`).join(' ')
        : 'なし';

      const result = [
        `⌛ クイズ終了！答えは **${answer}** でした。`,
        `正解者: ${correctList}`,
        `不正解者: ${wrongList}`
      ].join('\n');

      await quizMsg.edit({
        content: result,
        components: disableAll(quizMsg.components)
      });

      games.delete(channelId);
    });
  }
};
