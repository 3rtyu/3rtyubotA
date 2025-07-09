const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topic')
    .setDescription('会話のテーマをランダムで選びます'),
  async execute(client, interaction) {
    // 会話のテーマ候補
    const themes = [
      '好きなイベントストーリー',
      'イベランの思い出',
      '今ハマっている曲',
      'プロセカは始めたきっかけ',
      '次回のブルフェス予想',
      '最近のガチャ運',
      'あなたの推しを教えて！',
      'リアイベ行ったことある？',
      'マイセカイやってる？',
      'どっちが優先？課金orグッズ',
      '好きな星4メンバーのイラスト',
      '劇場版プロセカどうだった？',
      '次回のコネクトライブ行く？',
      '入学するならどっち？神高or宮女',
      'コイン足りてる？',
      '次は何のイベントを走る？',
      'はじめてのMASTERフルコン曲を教えて!',
      '好きなユニットを教えて！',
      'CM機能使ってる？',
      '今日のチャレライやった？',
      '一番好きなアナボ教えて！',
      '高難易度曲プレイする？',
      '飼うならどっち？サモちゃんとパール伯爵',
      'プロセカquiz! イカが嫌いなキャラクターは誰？',
      '好きなスタンプを教えて！',
      '好きな3DMVを教えて!',
      'わんだほーい！！',
      '前回のブルフェスどうだった？',
      '好きなプロセカグッズ教えて！',
      'ライブボーナス炊いてる？',
      '好きな2DMVを教えて!'
    ];

    // ランダムにテーマを選択
    const index = Math.floor(Math.random() * themes.length);
    const selected = themes[index];

    // 結果を返信
    await interaction.reply({
      content: `🗣 会話テーマは… **${selected}** です！`,
      ephemeral: false
    });
  },
};
