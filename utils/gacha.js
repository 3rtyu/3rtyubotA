// utils/gacha.js
const { EmbedBuilder } = require('discord.js');

const rarityWeights = {
  '⭐️':       59.9999,
  '⭐⭐':       30,
  '⭐⭐⭐':      7,
  '⭐⭐⭐⭐':     3,
  '✨SECRET✨': 0.0001
};

const itemsByRarity = {
  '⭐️':       ['想いのかけら0.1個', 'クリスタル-1個', '使用済みシリアルコード'],
  '⭐⭐':       ['🦐', '飲みかけのライブボーナス大', '魔法の繊維'],
  '⭐⭐⭐':      ['ミラクルピース', 'スキルアップスコア(初級)', 'スタンプ割引券'],
  '⭐⭐⭐⭐':     ['欠けた七色のメモリア', 'ネギ0.1個', '使用済みコネクトライブのチケット'],
  '✨SECRET✨': ['余ったレコード']
};

const colorMap = {
  '⭐️':       0xAAAAAA,
  '⭐⭐':       0x9ACD32,
  '⭐⭐⭐':      0x0000FF,
  '⭐⭐⭐⭐':     0xFF69B4,
  '✨SECRET✨': 0xFF0000
};

const roleNames = {
  '⭐️':       '星1を引き当てた!',
  '⭐⭐':       '星2を引き当てた!',
  '⭐⭐⭐':      '星3を引き当てた!',
  '⭐⭐⭐⭐':     '星4を引き当てた!',
  '✨SECRET✨': 'シークレットを引き当てた!'
};

/**
 * runGacha:
 *   ・interactionCreate で deferReply を行ったあとに呼び出す前提
 *   ・ガチャを count 回実行し、結果をまとめた Embed を editReply で返却
 *   ・ロール付与に失敗しても処理を継続し、エラーはコンソールに出力
 */
async function runGacha(interaction, count) {
  // Interaction を ACK して 3 秒ルールをクリア
  // ※index.js で deferReply を呼んでいない場合はここで deferReply してもOK
  await interaction.deferReply({ ephemeral: true });

  const results = [];

  for (let i = 0; i < count; i++) {
    // 1) レアリティ選択
    const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
    let rnd = Math.random() * totalWeight;
    let selectedRarity;
    for (const [rarity, weight] of Object.entries(rarityWeights)) {
      if (rnd < weight) {
        selectedRarity = rarity;
        break;
      }
      rnd -= weight;
    }

    // 2) アイテム抽選
    const pool = itemsByRarity[selectedRarity];
    const item = pool[Math.floor(Math.random() * pool.length)];

    results.push(`${selectedRarity} … **${item}**`);

    // 3) ロール付与（失敗はログにのみ出力）
    const roleName = roleNames[selectedRarity];
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

  // 4) Embed にまとめて送信
  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${count}回ガチャ結果 🎉`)
    .setDescription(results.join('\n'))
    .setColor(0x00AE86)
    .setTimestamp();

  // deferReply の後は editReply で結果を返す
  await interaction.editReply({ embeds: [embed] });
}

module.exports = { runGacha };
