module.exports = async (interaction) => {
  if (!interaction.isButton()) {
    console.debug('shopButtons.js に非ボタンインタラクションが渡されました');
    return;
  }

  try {
    // ✅ deferReply を try-catch で囲む
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
    } catch (deferErr) {
      console.error('deferReply に失敗:', deferErr);
      return;
    }

    // 以下はそのまま
    const titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    const key = interaction.customId.replace('buy_', '');
    const item = titles[key];

    if (!item) {
      await interaction.editReply({ content: '指定された称号が見つかりません。' });
      return;
    }

    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const balance = await getBalance(guildId, userId);

    if (balance < item.cost) {
      await interaction.editReply({
        content: `残高不足です！${item.role} を購入するには ${item.cost} はっぱが必要です。`
      });
      return;
    }

    await addBalance(guildId, userId, -item.cost);

    const role = interaction.guild.roles.cache.find(r => r.name === item.role);
    if (role) {
      try {
        await interaction.member.roles.add(role);
        await interaction.editReply({
          content: `${interaction.user.username} が ${item.role} を購入しました！`
        });
      } catch (roleErr) {
        console.warn('ロール付与に失敗:', roleErr);
        await interaction.editReply({
          content: 'ロールの付与に失敗しました。管理者に確認してください。'
        });
      }
    } else {
      await interaction.editReply({
        content: 'ロールが見つかりません。管理者に確認してください。'
      });
    }

  } catch (err) {
    console.error('shopButtons.js エラー:', err);
    try {
      if (!interaction.replied && interaction.deferred) {
        await interaction.editReply({ content: '内部エラーが発生しました。' });
      } else {
        console.warn('shopButtons 応答済みのため、再応答をスキップしました');
      }
    } catch (e) {
      console.error('エラー応答に失敗:', e);
    }
  }
};
