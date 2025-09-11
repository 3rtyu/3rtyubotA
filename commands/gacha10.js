// gacha10.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha10')
    .setDescription('ts10連ガチャを引きます！！'),

  async execute(client, interaction) {
    // レアリティの重み
    const rarityWeights = {
      '⭐️': 59,
      '⭐⭐': 30,
      '⭐⭐⭐': 7,
      '⭐⭐⭐⭐': 3,
      '✨SECRET✨': 1
    };

    // レアリティごとのアイテムプール
    const itemsByRarity = {
      '⭐️': ['想いのかけら0.1個', 'クリスタル-1個', '使用済みシリアルコード'],
      '⭐⭐': ['🦐', '飲みかけのライブボーナス大', '魔法の繊維'],
      '⭐⭐⭐': ['ミラクルピース', 'スキルアップスコア(初級)', 'スタンプ割引券'],
      '⭐⭐⭐⭐': ['欠けた七色のメモリア', 'ネギ0.1個', '使用済みコネクトライブのチケット'],
      '✨SECRET✨': ['余ったレコード']
    };

    // レアリティ→Embedカラー
    const colorMap = {
      '⭐️':   0xAAAAAA,
      '⭐⭐':   0x9ACD32,
      '⭐⭐⭐':  0x0000FF,
      '⭐⭐⭐⭐': 0xFF69B4,
      '✨SECRET✨': 0xFF0000
    };

    // レアリティ→付与するロール名
    const roleNames = {
      '⭐️': '星1を引き当てた!',
      '⭐⭐': '星2を引き当てた!',
      '⭐⭐⭐': '星3を引き当てた!',
      '⭐⭐⭐⭐': '星4を引き当てた!',
      '✨SECRET✨': 'シークレットを引き当てた!'
    };

    // 重みの合計を計算
    const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);

    // 10回分のガチャ実行
    const results = [];
    for (let i = 0; i < 10; i++) {
      let rand = Math.random() * totalWeight;
      let selectedRarity;

      // レアリティを重みで選択
      for (const [rarity, weight] of Object.entries(rarityWeights)) {
        if (rand < weight) {
          selectedRarity = rarity;
          break;
        }
        rand -= weight;
      }

      // アイテムをランダムに一つ引く
      const pool = itemsByRarity[selectedRarity];
      const pulledItem = pool[Math.floor(Math.random() * pool.length)];
      results.push({ rarity: selectedRarity, item: pulledItem });
    }

    // Embed作成
    const embed = new EmbedBuilder()
      .setTitle('🎉 10連ガチャ結果 🎉')
      .setDescription(
        results
          .map((r, i) => `\`${i + 1}.\` ${r.rarity} **${r.item}**`)
          .join('\n')
      )
      // 色は最高レアリティに合わせる例
      .setColor(
        colorMap[
          results
            .map(r => r.rarity)
            .sort((a, b) =>
              Object.keys(colorMap).indexOf(b) - Object.keys(colorMap).indexOf(a)
            )[0]
        ]
      )
      .setTimestamp();

    // 公開メッセージとして一度だけ返信
    await interaction.reply({ embeds: [embed] });

    // ユニークなレアリティだけロール付与（重複を避ける）
    const uniqueRarities = [...new Set(results.map(r => r.rarity))];
    const guild = interaction.guild;
    const member = interaction.member;

    for (const rarity of uniqueRarities) {
      const roleName = roleNames[rarity];
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        // ロールがなければ何も表示せず次へ
        continue;
      }
      try {
        await member.roles.add(role);
      } catch (error) {
        console.error('ロール付与エラー:', error);
      }
    }
  }
};
