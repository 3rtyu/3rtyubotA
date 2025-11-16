const {
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { pullMany, colorMap, roleNames } = require('../utils/gacha');
const shopButtons = require('../interactions/shopButtons'); // ✅ ショップ処理を分離
const { getBalance, addBalance } = require('../utils/currency');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;

    // 🎰 ガチャ処理
    if (['gacha_one', 'gacha_ten'].includes(interaction.customId)) {
      const count = interaction.customId === 'gacha_ten' ? 10 : 1;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const results = pullMany(count);
      const lines = results.map((r, i) => `\`${i + 1}.\` ${r.rarity} **${r.item}**`);
      const highest = [...new Set(results.map(r => r.rarity))]
        .sort((a, b) =>
          Object.keys(colorMap).indexOf(b) -
          Object.keys(colorMap).indexOf(a)
        )[0];

      const embed = new EmbedBuilder()
        .setTitle(count === 10 ? '🎉 10連ガチャ結果 🎉' : '🎉 ガチャ結果 🎉')
        .setDescription(lines.join('\n'))
        .setColor(colorMap[highest])
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], components: [] });

      const high = results.filter(r =>
        r.rarity === '⭐⭐⭐⭐' || r.rarity === '✨SECRET✨'
      );
      if (high.length > 0) {
        const historyChannel = interaction.guild.channels.cache
          .find(ch => ch.isTextBased() && ch.name === 'ガチャ履歴');
        if (historyChannel) {
          const formatted = high.map(r => `${r.rarity} **${r.item}**`).join(', ');
          await historyChannel.send({
            content: `🎊 <@${userId}> が ${formatted} を引き当てました！`,
            allowedMentions: { users: [userId] }
          });
        }
      }

      const uniqueR = [...new Set(results.map(r => r.rarity))];
      for (const rarity of uniqueR) {
        const roleName = roleNames[rarity];
        if (!roleName) continue;

        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role && !interaction.member.roles.cache.has(role.id)) {
          try {
            await interaction.member.roles.add(role);
          } catch (err) {
            console.error('ロール付与エラー:', err);
          }
        }
      }

      return;
    }

    // 🏪 ショップ購入処理（分離）
    if (interaction.customId.startsWith('buy_')) {
      await shopButtons(interaction); // ✅ shopButtons.js に委譲
      return;
    }
  }
};
