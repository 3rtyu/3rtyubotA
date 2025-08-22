// commands/rps.js
const { SlashCommandBuilder } = require('discord.js');

const games = new Map(); // channelId → GameSession

// 絵文字定義
const EMOJI = {
  JOIN: '➕',
  START: '▶️',
  ROCK: '✊',
  PAPER: '✋',
  SCISSORS: '✌️'
};

// 手の定義
const HANDS = [
  { key: 'rock',     label: 'グー',   emoji: EMOJI.ROCK,     beats: 'scissors' },
  { key: 'paper',    label: 'パー',   emoji: EMOJI.PAPER,    beats: 'rock'     },
  { key: 'scissors', label: 'チョキ', emoji: EMOJI.SCISSORS, beats: 'paper'    }
];
// 絵文字 → hand.key マッピング
const EMOJI_TO_KEY = HANDS.reduce((map, h) => {
  map[h.emoji] = h.key;
  return map;
}, {});

class GameSession {
  constructor(interaction) {
    this.interaction = interaction;
    this.channelId   = interaction.channelId;
    this.hostId      = interaction.user.id;
    this.players     = [this.hostId];    // 参加者 ID の配列
    this.picks       = new Map();        // userId → hand.key
    this.message     = null;             // 進行メッセージ
  }

  async run() {
    await this._sendJoinPrompt();
    const started = await this._collectJoins();

    if (!started) {
      await this._finalize('参加者が揃わなかったため、じゃんけんをキャンセルしました。');
      games.delete(this.channelId);
      return;
    }

    let winners;
    // あいこならループ
    do {
      this.picks.clear();
      winners = await this._playRound();
    } while (winners === null);

    await this._announceResult(winners);
    games.delete(this.channelId);
  }

  // 参加と開始待ち
  async _sendJoinPrompt() {
    this.message = await this.interaction.reply({
      content:
        `${this.interaction.user.username} さんがじゃんけんを開始しました！\n` +
        `参加 → ${EMOJI.JOIN}  開始 → ${EMOJI.START}\n` +
        '参加者が2人以上になったら主催者が開始絵文字をリアクションしてください。',
      fetchReply: true
    });

    // リアクションを追加
    try {
      await this.message.react(EMOJI.JOIN);
      await this.message.react(EMOJI.START);
    } catch (err) {
      console.error('リアクション追加失敗:', err);
    }
  }

  _collectJoins() {
    return new Promise(resolve => {
      const filter = (reaction, user) => {
        if (user.bot) return false;
        return [EMOJI.JOIN, EMOJI.START].includes(reaction.emoji.name);
      };
      const collector = this.message.createReactionCollector({ filter, time: 30_000 });

      collector.on('collect', (reaction, user) => {
        const name = reaction.emoji.name;
        if (name === EMOJI.JOIN) {
          if (!this.players.includes(user.id)) {
            this.players.push(user.id);
            this._updateJoinPrompt();
          }
        } else if (name === EMOJI.START && user.id === this.hostId) {
          if (this.players.length >= 2) {
            collector.stop('started');
          }
        }
      });

      collector.on('end', async (_, reason) => {
        // リアクションをクリア
        try { await this.message.reactions.removeAll(); }
        catch (err) { console.error('リアクション削除失敗:', err); }

        resolve(reason === 'started');
      });
    });
  }

  // 参加数更新
  async _updateJoinPrompt() {
    try {
      await this.message.edit({
        content:
          `${this.interaction.user.username} さんがじゃんけんを開始しました！\n` +
          `参加 → ${EMOJI.JOIN}  開始 → ${EMOJI.START}\n` +
          `現在の参加者: ${this.players.length}人\n` +
          '参加者が2人以上になったら主催者が開始絵文字をリアクションしてください。'
      });
    } catch (err) {
      console.error('参加数更新失敗:', err);
    }
  }

  // 1ラウンド分の手集め
  _playRound() {
    return new Promise(resolve => {
      // 手のリアクションを追加
      HANDS.forEach(h => this.message.react(h.emoji)).catch(console.error);
      // メッセージ更新
      this.message.edit({ content: '手を選んでください → ✊/✋/✌️' }).catch(console.error);

      const filter = (reaction, user) => {
        if (user.bot) return false;
        return this.players.includes(user.id) && Object.values(EMOJI).includes(reaction.emoji.name);
      };
      const collector = this.message.createReactionCollector({ filter, time: 30_000 });

      collector.on('collect', (reaction, user) => {
        const handKey = EMOJI_TO_KEY[reaction.emoji.name];
        if (!handKey) return;
        if (!this.picks.has(user.id)) {
          this.picks.set(user.id, handKey);
        }
        // 全員選択済みなら終了
        if (this.picks.size === this.players.length) {
          collector.stop('all_picked');
        }
      });

      collector.on('end', async (_, reason) => {
        // 反応クリア
        try { await this.message.reactions.removeAll(); }
        catch (err) { console.error('リアクション削除失敗:', err); }

        // 全員選択完了していなければキャンセル
        if (reason !== 'all_picked' || this.picks.size < this.players.length) {
          await this._finalize('時間切れか選択不足によりゲームを終了しました。');
          return resolve([]); // no winners
        }

        // あいこ判定: 手の種類カウント
        const counts = {};
        this.picks.forEach(key => counts[key] = (counts[key] || 0) + 1);
        const used = Object.keys(counts);
        if (used.length !== 2) {
          // 全員同じ or 3種 → あいこ
          await this.message.edit({ content: 'あいこです！もう一回…' }).catch(console.error);
          return resolve(null);
        }

        // 勝つ手を決定
        const winKey = HANDS.find(h =>
          used.includes(h.key) && used.includes(h.beats)
        ).key;

        // 勝者リスト
        const winners = [];
        for (const [uid, key] of this.picks) {
          if (key === winKey) winners.push(uid);
        }
        resolve(winners);
      });
    });
  }

  // 結果発表 or キャンセル
  async _finalize(text) {
    try {
      await this.message.edit({ content: text, components: [] });
    } catch (err) {
      console.error('最終メッセージ編集失敗:', err);
    }
  }

  // 勝者発表
  async _announceResult(winners) {
    let text = `結果発表！\n`;
    this.players.forEach(uid => {
      const key = this.picks.get(uid);
      const label = HANDS.find(h => h.key === key)?.label || '―';
      text += `<@${uid}>: ${label}\n`;
    });
    if (winners.length) {
      text += `\n勝者: ${winners.map(id => `<@${id}>`).join('、')}`;
    } else {
      text += `\n勝者なし`;
    }
    await this._finalize(text);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps2')
    .setDescription('3人以上でじゃんけんを開始します'),
  async execute(client, interaction) {
    if (games.has(interaction.channelId)) {
      return interaction.reply({
        content: 'このチャンネルでは既にゲームが進行中です。',
        ephemeral: true
      });
    }
    const session = new GameSession(interaction);
    games.set(interaction.channelId, session);
    session.run();
  }
};
