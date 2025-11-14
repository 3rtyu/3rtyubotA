const { getBalance, addBalance } = require('../utils/currency');

const SHOP_ITEMS = {
  buy_vip: { roleId: 'ROLE_ID_lifeendS', cost: 100, name: '人生終了初級' },
  buy_champion: { roleId: 'ROLE_ID_lifeendL', cost: 200, name: '人生終了上級' }
};

module.exports = async (interaction) => {
  const item = SHOP_ITEMS[interaction.customId];
  if (!item) return;

  const userId = interaction.user.id;
  const balance = getBalance(userId);

  if (balance < item.cost) {
    await interaction.reply({ content: `残高不足です！${item.name} を購入するには ${item.cost} はっぱが必要です。`, ephemeral: true });
    return;
  }

  addBalance(userId, -item.cost);

  const role = interaction.guild.roles.cache.get(item.roleId);
  if (role) {
    await interaction.member.roles.add(role);
    await interaction.reply({ content: `${interaction.user.username} が ${item.name} を購入しました！`, ephemeral: true });
  } else {
    await interaction.reply({ content: 'ロールが見つかりません。管理者に確認してください。', ephemeral: true });
  }
};
