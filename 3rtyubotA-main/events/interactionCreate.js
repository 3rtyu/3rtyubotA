const {
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { pullMany, colorMap, roleNames } = require('../utils/gacha');
const shopButtons = require('../interactions/shopButtons');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) {
      console.debug('非ボタンインタラクションを無視しました');
      return;
    }

    const userId = interaction.user.id;

    // 🎰 ガチャ処理
    if (['gacha_one', 'gacha_ten'].includes(interaction.customId)) {
      try {
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
              console.warn('ロール付与エラー:', err);
            }
          }
        }
      } catch (err) {
        console.error('ガチャ処理エラー:', err);
        try {
          if (!interaction.replied) {
            await interaction.editReply({ content: 'ガチャ処理中にエラーが発生しました。' });
          } else {
            console.warn('ガチャ応答済みのため、再応答をスキップしました');
          }
        } catch (e) {
          console.error('ガチャエラー応答に失敗:', e);
        }
      }
      return;
    }

    // 🏪 ショップ購入処理
    if (interaction.customId.startsWith('buy_')) {
      try {
        await shopButtons(interaction);
      } catch (err) {
        console.error('shopButtons 呼び出しエラー:', err);
        try {
          if (!interaction.replied) {
            await interaction.editReply({ content: '購入処理中にエラーが発生しました。' });
          } else {
            console.warn('ショップ応答済みのため、再応答をスキップしました');
          }
        } catch (e) {
          console.error('ショップエラー応答に失敗:', e);
        }
      }
      return;
    }
  }
};
