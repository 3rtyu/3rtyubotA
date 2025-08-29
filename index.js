// index.js
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

// ❹ interactionCreate でスラッシュコマンドとボタン両対応
client.on('interactionCreate', async interaction => {
  try {
    // 1) スラッシュコマンドの場合
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(client, interaction);
      return;
    }

    // 2) ボタン押下の場合
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'gacha_1') {
        await runGacha(interaction, 1);

      } else if (id === 'gacha_10') {
        await runGacha(interaction, 10);

      } else {
        // 想定外の customId が来た場合
        await interaction.reply({ content: '不明な操作です', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('interactionCreate エラー:', err);
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
