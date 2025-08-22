// commands/rps.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const games = new Map(); // channelId → GameSession

// 定数化した手の情報
const HANDS = [
  { key: 'rock',     id: 'rps_rock',     label: 'グー',   beats: 'scissors' },
  { key: 'paper',    id: 'rps_paper',    label: 'パー',   beats: 'rock' },
  { key: 'scissors', id: 'rps_scissors', label: 'チョキ', beats: 'paper' }
];
// カスタムID から手オブジェクトを引くマップ
const ID_TO_HAND = HANDS.reduce((m, h) => m.set(h.id, h), new Map());

class GameSession {
  constructor(interaction) {
    this.interaction = interaction;
    this.channelId   = interaction.channelId;
    this.hostId      = interaction.user.id;
    this.players     = [];        // 参加者ユーザーID の順序を保持
    this.picks       = new Map(); // userId → hand.key
    this.joinMessage = null;      // 最初に送る参加メッセージ
    this.collectors  = [];        // 後で一括クリアのために保持
  }

  async run() {
    this.players.push(this.hostId);
    await this._sendJoinPrompt();
    const joined = await this._collectJoins();

    if (!joined) {
      await this._cleanup(`参加者が揃わなかったため、じゃんけんをキャンセルしました。`);
      games.delete(this.channelId);
      return;
    }

    // ラウンドをループ（あいこが出たら再度）
    let winnerIds;
    do {
      this.picks.clear();
      winnerIds = await this._playOneRound();
    } while (!winnerIds);

    await this._announceResult(winnerIds);
    games.delete(this.channelId);
  }

  // 参加受付メッセージを出して、開始ボタンを主催者から受け取る
  async _sendJoinPrompt() {
    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rps_join')
        .setLabel('参加する')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rps_start')
        .setLabel('開始する')
        .setStyle(ButtonStyle.Success)
    );

    this.joinMessage = await this.interaction.reply({
      content:
        `${this.interaction.user.username} さんがじゃんけんを開始しました！\n` +
        '参加したい人は「参加する」を押してください。\n' +
        '参加者が2人以上集まったら主催者が「開始する」を押してください。（30秒で自動終了）',
      components: [joinRow],
      fetchReply: true
    });
  }

  // 参加者を集める。成功なら true、失敗なら false
  _collectJoins() {
    return new Promise(resolve => {
      const collector = this.joinMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000
      });
      this.collectors.push(collector);

      collector.on('collect', async btnInt => {
        try {
          if (btnInt.customId === 'rps_join') {
            if (this.players.includes(btnInt.user.id)) {
              return btnInt.reply({ content: '既に参加済みです。', ephemeral: true });
            }
            this.players.push(btnInt.user.id);
            await btnInt.reply({
              content: `参加完了！現在の参加者数: ${this.players.length}`,
              ephemeral: true
            });
          } else if (btnInt.customId === 'rps_start') {
            if (btnInt.user.id !== this.hostId) {
              return btnInt.reply({ content: '開始できるのは主催者のみです。', ephemeral: true });
            }
            if (this.players.length < 2) {
              return btnInt.reply({ content: '参加者が2人以上必要です。', ephemeral: true });
            }
            collector.stop('started');
          }
        } catch (err) {
          console.error('参加収集エラー:', err);
        }
      });

      collector.on('end', async (_, reason) => {
        // ボタンを無効化
        const disabledRow = new ActionRowBuilder().addComponents(
          ...this.joinMessage.components[0].components.map(btn => btn.setDisabled(true))
        );
        try {
          await this.joinMessage.edit({ components: [disabledRow] });
        } catch (err) {
          console.error('参加メッセージ無効化失敗:', err);
        }
        resolve(reason === 'started');
      });
    });
  }

  // 1ラウンド分プレイし、勝者IDの配列を返す。あいこなら null
  _playOneRound() {
    return new Promise(resolve => {
      const pickRow = new ActionRowBuilder().addComponents(
        ...HANDS.map(h =>
          new ButtonBuilder()
            .setCustomId(h.id)
            .setLabel(h.label)
            .setStyle(ButtonStyle.Secondary)
        )
      );

      this.joinMessage.edit({
        content: '手を選んでください。',
        components: [pickRow]
      }).catch(err => console.error('ラウンド開始メッセージ編集失敗:', err));

      const collector = this.joinMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000
      });
      this.collectors.push(collector);

      collector.on('collect', async pickInt => {
        if (!this.players.includes(pickInt.user.id)) return;
        if (this.picks.has(pickInt.user.id)) {
          return pickInt.reply({ content: '既に選択済みです。', ephemeral: true });
        }

        const hand = ID_TO_HAND.get(pickInt.customId);
        if (!hand) return;

        this.picks.set(pickInt.user.id, hand.key);
        await pickInt.reply({ content: `あなたの手: ${hand.label}`, ephemeral: true });

        if (this.picks.size === this.players.length) {
          collector.stop('all_picked');
        }
      });

      collector.on('end', async (_, reason) => {
        // 選択ボタンを無効化
        const disabledRow = new ActionRowBuilder().addComponents(
          ...this.joinMessage.components[0].components.map(btn => btn.setDisabled(true))
        );
        await this.joinMessage.edit({ components: [disabledRow] }).catch(console.error);

        // 全員選択したかチェック
        if (reason !== 'all_picked' || this.picks.size < this.players.length) {
          // タイムアウト or 不足 → キャンセル
          await this.joinMessage.edit({
            content: '時間切れか選択不足のため、ゲームを終了します。',
            components: []
          });
          return resolve([]); // 勝者なし
        }

        // 判定
        const counts = {};
        this.picks.forEach(handKey => {
          counts[handKey] = (counts[handKey] || 0) + 1;
        });
        const usedHands = Object.keys(counts);
        if (usedHands.length !== 2) {
          // 全員同じ or ３種 → あいこ
          await this.joinMessage.edit({
            content: 'あいこです！もう一度手を選んでください。',
            components: []
          });
          return resolve(null);
        }

        // どの手が勝つかを決定
        const winKey = HANDS.find(h =>
          usedHands.includes(h.key) &&
          usedHands.includes(h.beats)
        )?.key;

        // 勝者リスト
        const winners = [];
        for (const [uid, handKey] of this.picks) {
          if (handKey === winKey) winners.push(uid);
        }

        resolve(winners);
      });
    });
  }

  // 最終結果を表示
  async _announceResult(winnerIds) {
    let text = '結果発表！\n';
    this.players.forEach(uid => {
      const handKey = this.picks.get(uid);
      const handLabel = HANDS.find(h => h.key === handKey)?.label || '―';
      text += `<@${uid}>: ${handLabel}\n`;
    });
    if (winnerIds.length) {
      const mentions = winnerIds.map(id => `<@${id}>`).join('、');
      text += `\n勝者: ${mentions}`;
    } else {
      text += `\n勝者なし（タイムアウトまたは全員パス）`;
    }

    try {
      await this.joinMessage.edit({ content: text, components: [] });
    } catch (err) {
      console.error('結果発表失敗:', err);
    }
  }

  // メッセージをキャンセル文言に置き換え＆コンポーネント削除
  async _cleanup(cancelText) {
    try {
      await this.joinMessage.edit({ content: cancelText, components: [] });
    } catch (err) {
      console.error('キャンセル編集失敗:', err);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps2')
    .setDescription('複数人でじゃんけんを開始します'),
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
