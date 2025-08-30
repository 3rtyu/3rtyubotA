// events/interactionCreate.js
const { EmbedBuilder } = require('discord.js');
const { pullMany, colorMap, roleNames } = require('../utils/gacha');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!['gacha_one', 'gacha_ten'].includes(interaction.customId)) return;

    const count = interaction.customId === 'gacha_ten' ? 10 : 1;
    await interaction.deferReply({ ephemeral: true });

    // ガチャ実行
    const results = pullMany(count);
    const lines = results.map((r, i) => `\`${i + 1}.\` ${r.rarity} **${r.item}**`);
    const highest = [...new Set(results.map(r => r.rarity))]
      .sort((a, b) =>
        Object.keys(colorMap).indexOf(b) -
        Object.keys(colorMap).indexOf(a)
      )[0];

    // 本人向けEmbed
    const embed = new EmbedBuilder()
      .setTitle(count === 10 ? '🎉 10連ガチャ結果 🎉' : '🎉 ガチャ結果 🎉')
      .setDescription(lines.join('\n'))
      .setColor(colorMap[highest])
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });

    // 星4以上を抽出 → 「ガチャ履歴」チャンネルへ通知
    const high = results.filter(r =>
      r.rarity === '⭐⭐⭐⭐' || r.rarity === '✨SECRET✨'
    );
    if (high.length > 0) {
      const historyChannel = interaction.guild.channels.cache
        .find(ch => ch.isTextBased() && ch.name === 'ガチャ履歴');

      if (historyChannel) {
        const formatted = high
          .map(r => `${r.rarity} **${r.item}**`)
          .join(', ');
        await historyChannel.send({
          content: `🎊 <@${interaction.user.id}> が ${formatted} を引き当てました！`,
          allowedMentions: { users: [interaction.user.id] }
        });
      } else {
        console.warn('「ガチャ履歴」チャンネルが見つかりませんでした。');
      }
    }

    // ロール付与（ユニークなレアリティのみ）
    const uniqueR = [...new Set(results.map(r => r.rarity))];
    for (const rarity of uniqueR) {
      const role = interaction.guild.roles.cache
        .find(r => r.name === roleNames[rarity]);
      if (!role) continue;
      try {
        await interaction.member.roles.add(role);
      } catch (err) {
        console.error('ロール付与エラー:', err);
      }
    }
  }
};
