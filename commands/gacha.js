const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('ガチャを引きます！！'),
  async execute(client, interaction) {
    const rarityWeights = {
      '⭐️':    59.9999,
      '⭐⭐':    30,
      '⭐⭐⭐':   7,
      '⭐⭐⭐⭐':  3,
      '✨SECRET✨': 0.0001
    };

    const itemsByRarity = {
      '⭐️': ['想いのかけら0.1個', 'クリスタル-1個', '使用済みシリアルコード'],
      '⭐⭐': ['🦐', '飲みかけのライブボーナス大', '魔法の繊維'],
      '⭐⭐⭐': ['ミラクルピース', 'スキルアップスコア(初級)', 'スタンプ割引券'],
      '⭐⭐⭐⭐': ['欠けた七色のメモリア', 'ネギ0.1個', '使用済みコネクトライブのチケット'],
      '✨SECRET✨': ['余ったレコード']
    };

    const colorMap = {
      '⭐️':    0xAAAAAA,  // グレー
      '⭐⭐':    0x9ACD32,  // 黄緑
      '⭐⭐⭐':   0x0000FF,  // 青
      '⭐⭐⭐⭐':  0xFF69B4,  // ピンク
      '✨SECRET✨': 0xFF0000 // 赤
    };

    const roleNames = {
      '⭐️':    '星1を引き当てた!',
      '⭐⭐':    '星2を引き当てた!',
      '⭐⭐⭐':   '星3を引き当てた!',
      '⭐⭐⭐⭐':  '星4を引き当てた!',
      '✨SECRET✨': 'シークレットを引き当てた!'
    };

    // ガチャ処理
    const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    let selectedRarity;
    for (const [rarity, weight] of Object.entries(rarityWeights)) {
      if (rand < weight) {
        selectedRarity = rarity;
        break;
      }
      rand -= weight;
    }

    const pool = itemsByRarity[selectedRarity];
    const pulledItem = pool[Math.floor(Math.random() * pool.length)];

    // 結果を埋め込みで送信
    const embed = new EmbedBuilder()
      .setTitle('🎉 ガチャ結果 🎉')
      .setDescription(`あなたは **${selectedRarity}** を引き当てた！\n\n**${pulledItem}** を手に入れたよ！`)
      .setColor(colorMap[selectedRarity])
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // ロール付与処理（フィードバックメッセージは一切送らない）
    const guild = interaction.guild;
    const member = interaction.member;
    const roleName = roleNames[selectedRarity];
    const role = guild.roles.cache.find(r => r.name === roleName);

    if (role) {
      try {
        await member.roles.add(role);
      } catch (error) {
        console.error('ロール付与エラー:', error);
      }
    } else {
      console.error(`ロール「${roleName}」が見つかりませんでした。`);
    }
  },
};
