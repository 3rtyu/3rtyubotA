// utils/gacha.js
const rarityWeights = {
  '⭐️':     59.99,
  '⭐⭐':     30,
  '⭐⭐⭐':    7,
  '⭐⭐⭐⭐':   3,
  '✨SECRET✨': 0.01
};

const itemsByRarity = {
      '⭐️': ['想いの粉', 'クリスタルの破片', '壊れかけの普通のつるはし'],
      '⭐⭐': ['🦐', '不思議な芽', '魔法の繊維'],
      '⭐⭐⭐': ['ミラクルピース', 'スキルアップスコア(5級)', 'スタンプ割引券'],
      '⭐⭐⭐⭐': ['破れたボーカルカード交換チケット', '夢の宝玉(黒)', '願いの雨粒'],
      '✨SECRET✨': ['余ったレコード']
};

const colorMap = {
  '⭐️':      0xAAAAAA,
  '⭐⭐':      0x9ACD32,
  '⭐⭐⭐':     0x0000FF,
  '⭐⭐⭐⭐':    0xFF69B4,
  '✨SECRET✨': 0xFF0000
};

const roleNames = {
  '⭐️':      '星1を引き当てた!',
  '⭐⭐':      '星2を引き当てた!',
  '⭐⭐⭐':     '星3を引き当てた!',
  '⭐⭐⭐⭐':    '星4を引き当てた!',
  '✨SECRET✨':  'シークレットを引き当てた!'
};

const totalWeight = Object.values(rarityWeights).reduce((s, w) => s + w, 0);

/**
 * 1回ガチャを引く
 * @returns {{rarity: string, item: string}}
 */
function pullOnce() {
  let rand = Math.random() * totalWeight;
  let selected;
  for (const [rarity, weight] of Object.entries(rarityWeights)) {
    if (rand < weight) {
      selected = rarity;
      break;
    }
    rand -= weight;
  }
  const pool = itemsByRarity[selected];
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { rarity: selected, item };
}

/**
 * 複数回ガチャを引く
 * @param {number} count
 * @returns {Array<{rarity: string, item: string}>}
 */
function pullMany(count = 1) {
  return Array.from({ length: count }, () => pullOnce());
}

module.exports = { pullOnce, pullMany, colorMap, roleNames };
