// commands/random.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('ランダムに曲を選びます')
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('希望の曲数を入力してください(1～13)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(13)
    ),

  async execute(client, interaction) {
    // 13個の集合を定義
    const allSets = [
      ['A1', 'A2', 'A3'],
      ['B1', 'B2', 'B3'],
      ['C1', 'C2', 'C3'],
      ['D1', 'D2', 'D3'],
      ['E1', 'E2', 'E3'],
      ['F1', 'F2', 'F3'],
      ['G1', 'G2', 'G3'],
      ['H1', 'H2', 'H3'],
      ['I1', 'I2', 'I3'],
      ['J1', 'J2', 'J3'],
      ['K1', 'K2', 'K3'],
      ['L1', 'L2', 'L3'],
      ['M1', 'M2', 'M3'],
    ];

    // オプションから個数を取得（デフォルト1）
    const count = interaction.options.getInteger('count') ?? 1;

    // 配列からランダムに1つ取る
    const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

    // 0～allSets.length-1 のインデックスをシャッフルして先頭count個を返す
    const sampleIndices = (total, num) => {
      const idx = Array.from({ length: total }, (_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      return idx.slice(0, num);
    };

    // ランダムに「count」個の集合インデックスを取得
    const indices = sampleIndices(allSets.length, count);

    // 返信メッセージを組み立て
    let reply;
    if (count === 1) {
      const setIdx = indices[0];
      const element = pickRandom(allSets[setIdx]);
      reply = ` **${element}** が選ばれました！！`;
    } else {
      const lines = indices.map(i => {
        const elem = pickRandom(allSets[i]);
        return `- ${i + 1}曲目 **${elem}**`;
      });
      reply = `\n${lines.join('\n')} が選ばれました！！`;
    }

    await interaction.reply({ content: reply, ephemeral: false });
  },
};
