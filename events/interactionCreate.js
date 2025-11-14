const {
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { pullMany, colorMap, roleNames } = require('../utils/gacha');
const { getBalance, addBalance } = require('../utils/currency');
const fs = require('fs');
const path = require('path');

const titlesPath = path.join(__dirname, '../data/titles.json');
const titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));

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

    // 🏪 ショップ購入処理
    if (interaction.customId.startsWith('buy_')) {
      const key = interaction.customId.replace('buy_', '');
      const item = titles[key];

      if (!item) {
        return interaction.reply({
          content: 'そのアイテムは存在しません。',
          flags: MessageFlags.Ephemeral
        });
      }

      const balance = getBalance(userId);
      if (balance < item.cost) {
        return interaction.reply({
          content: `はっぱが足りません（必要: ${item.cost}）`,
          flags: MessageFlags.Ephemeral
        });
      }

      addBalance(userId, -item.cost);
      await interaction.reply({
        content: `🎖️ ${item.role} を購入しました！（-${item.cost} はっぱ）`,
        flags: MessageFlags.Ephemeral
      });

      const role = interaction.guild.roles.cache.find(r => r.name === item.role);
      if (role && !interaction.member.roles.cache.has(role.id)) {
        try {
          await interaction.member.roles.add(role);
        } catch (err) {
          console.error('称号ロール付与エラー:', err);
        }
      }

      return;
    }
  }
};
