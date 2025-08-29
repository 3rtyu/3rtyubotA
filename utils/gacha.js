// utils/gacha.js
const { EmbedBuilder } = require('discord.js');

const rarityWeights = {
  '⭐️':        59.9999,
  '⭐⭐':        30,
  '⭐⭐⭐':       7,
  '⭐⭐⭐⭐':      3,
  '✨SECRET✨': 0.0001
};

const itemsByRarity = {
  '⭐️':        ['想いのかけら0.1個', 'クリスタル-1個', '使用済みシリアルコード'],
  '⭐⭐':        ['🦐', '飲みかけのライブボーナス大', '魔法の繊維'],
  '⭐⭐⭐':       ['ミラクルピース', 'スキルアップスコア(初級)', 'スタンプ割引券'],
  '⭐⭐⭐⭐':      ['欠けた七色のメモリア', 'ネギ0.1個', '使用済みコネクトライブのチケット'],
  '✨SECRET✨': ['余ったレコード']
};

const colorMap = {
  '⭐️':        0xAAAAAA,
  '⭐⭐':        0x9ACD32,
  '⭐⭐⭐':       0x0000FF,
  '⭐⭐⭐⭐':      0xFF69B4,
  '✨SECRET✨': 0xFF0000
};

const roleNames = {
  '⭐️':        '星1を引き当てた!',
  '⭐⭐':        '星2を引き当てた!',
  '⭐⭐⭐':       '星3を引き当てた!',
  '⭐⭐⭐⭐':      '星4を引き当てた!',
  '✨SECRET✨': 'シークレットを引き当てた!'
};

/**
 * runGacha
 *  ・count 回ガチャを回し、結果をまとめて出力
 *  ・ロール付与に失敗しても処理を継続（エラーはコンソール出力）
 *  ・index.js ですでに deferReply() を呼んでいる前提 → ここでは editReply() のみ使用
 */
async function runGacha(interaction, count) {
  const results = [];

  for (let i = 0; i < count; i++) {
    // レアリティ選択
    const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
    let rnd = Math.random() * totalWeight;
    let selected;
    for (const [rarity, w] of Object.entries(rarityWeights)) {
      if (rnd < w) {
        selected = rarity;
        break;
      }
      rnd -= w;
    }

    // アイテム抽選
    const pool = itemsByRarity[selected];
    const item = pool[Math.floor(Math.random() * pool.length)];
    results.push(`${selected} … **${item}**`);

    // ロール付与（失敗はログ出力のみ）
    const roleName = roleNames[selected];
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (role) {
      try {
        await interaction.member.roles.add(role);
      } catch (err) {
        console.error('ロール付与エラー:', err);
      }
    } else {
      console.error(`ロール「${roleName}」が見つかりません`);
    }
  }

  // 結果をまとめた Embed を送信
  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${count}回ガチャ結果 🎉`)
    .setDescription(results.join('\n'))
    .setColor(colorMap['✨SECRET✨'])
    .setTimestamp();

  // deferReply の後は editReply で返却
  await interaction.editReply({ embeds: [embed] });
}

module.exports = { runGacha };
