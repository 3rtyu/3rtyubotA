const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const games = new Map();

/** 5〜20のランダム整数を返す */
function randInt() {
  return Math.floor(Math.random() * 16) + 5; // 0..15 -> 5..20
}

/**
 * 計算問題と正解を生成する（掛け算を優先）
 * 答えは必ず3桁以上（>=100）になるようにループで生成
 * @returns {{ question: string, answer: number }}
 */
function generateProblem() {
  const symbolMap = { '+': '+', '-': '-', '*': '×' };

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
      // b × c を先に計算
      const mult = b * c;
      answer = op1 === '+' ? a + mult : a - mult;
    } else {
      // 左から順に処理
      let interim;
      if (op1 === '*') interim = a * b;
      else if (op1 === '+') interim = a + b;
      else interim = a - b;

      if (op2 === '*') answer = interim * c;
      else if (op2 === '+') answer = interim + c;
      else answer = interim - c;
    }

    // 条件2: 答えは必ず3桁以上（100以上）
    if (Number.isFinite(answer) && Math.abs(answer) >= 100) {
      // 正答が負になるケースを避けるため、負なら再生成
      if (answer >= 100) return { question, answer };
    }
    // 条件を満たさなければ再生成
  }
}

/**
 * 正解とダミーをシャッフルして返す
 * @param {number} correct
 * @returns {number[]}
 */
function makeChoices(correct) {
  const set = new Set([correct]);
  while (set.size < 3) {
    // ダミーは正解からのランダムなオフセット（-50〜+50）
    const delta = Math.floor(Math.random() * 101) - 50;
    const wrong = correct + (delta === 0 ? 1 : delta);
    // ダミーは3桁以上かつ正であることを保証
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

  async execute(client, interaction) {
    const channelId = interaction.channelId;
    const sub = interaction.options.getSubcommand();

    // サブコマンド: stop
    if (sub === 'stop') {
      if (!games.has(channelId)) {
        return interaction.reply({
          content: '進行中のゲームがありません。',
          ephemeral: true
        });
      }
      const game = games.get(channelId);
      if (game && game.collector) game.collector.stop('manual');
      return interaction.reply({
        content: 'ゲームを停止しました。',
        ephemeral: true
      });
    }

    // サブコマンド: start
    if (games.has(channelId)) {
      return interaction.reply({
        content: 'このチャンネルではすでにゲームが進行中です。',
        ephemeral: true
      });
    }
    games.set(channelId, null); // 一旦置いておく

    const { question, answer } = generateProblem();
    const choices = makeChoices(answer);

    // 回答管理
    const respondents = new Set();
    const correctRespondents = new Set();
    const wrongRespondents = new Set();

    // 選択肢ボタン（最大3つ）
    const choiceRow = new ActionRowBuilder().addComponents(
      choices.map(num =>
        new ButtonBuilder()
          .setCustomId(`keisan_choice_${num}`)
          .setLabel(num.toString())
          .setStyle(ButtonStyle.Primary)
      )
    );

    // クイズ開始メッセージ
    const quizMsg = await interaction.reply({
      content:
        '🧮 3分間の三択計算クイズスタート！\n' +
        `問題: **${question}** = ?\n` +
        'ボタンをクリックした瞬間に正誤を公開します。',
      components: [choiceRow],
      fetchReply: true
    });

    // 3分間のコレクターをセットアップ
    const collector = quizMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 3 * 60 * 1000
    });

    // games マップに必要情報を保存
    games.set(channelId, {
      collector,
      quizMsg,
      answer,
      respondents,
      correctRespondents,
      wrongRespondents
    });

    // ボタン押下時の処理
    collector.on('collect', async btnInt => {
      const userId = btnInt.user.id;
      if (respondents.has(userId)) {
        return btnInt.reply({
          content: 'すでに回答済みです。',
          ephemeral: true
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

    // 終了時の処理（タイムアップ or stop）
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
