// ❶ .env を読み込む
require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { runGacha } = require('./utils/gacha');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// ❷ commands フォルダ内を自動ロード
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const cmd = require(path.join(commandsPath, file));
    client.commands.set(cmd.data.name, cmd);
  });

// ❸ Bot 起動完了ログ
client.once('ready', () => {
  console.log(`${client.user.tag} でログインしました`);
});

// ❹ interactionCreate でスラッシュ＆ボタン両対応
client.on('interactionCreate', async interaction => {
  try {
    // ボタン以外はスルー
    if (!interaction.isButton()) return;

    // ←←← ここで最初に deferReply を呼ぶ
    await interaction.deferReply({ ephemeral: true });

    // 押されたボタンに応じてガチャ処理を呼び出し
    if (interaction.customId === 'gacha_1') {
      await runGacha(interaction, 1);    // runGacha は editReply を使う想定
    }
    else if (interaction.customId === 'gacha_10') {
      await runGacha(interaction, 10);
    }
    else {
      // 万一別の customId が来たときの保険
      await interaction.editReply('不明な操作です');
    }
  }
  catch (err) {
    console.error('ボタンハンドラでエラー:', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: '内部エラーが発生しました', ephemeral: true });
    } else {
      await interaction.reply({ content: '内部エラーが発生しました', ephemeral: true });
    }
  }
});

// ❺ 環境変数から一度だけログイン
client.login(process.env.DISCORD_TOKEN)
  .catch(err => console.error('Login エラー:', err));

