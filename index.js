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
    // スラッシュコマンド処理
    if (interaction.isCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd) await cmd.execute(client, interaction);
      return;
    }

    // ボタン押下処理
    if (interaction.isButton()) {
      if (interaction.customId === 'gacha_1') {
        await runGacha(interaction, 1);
      } else if (interaction.customId === 'gacha_10') {
        await runGacha(interaction, 10);
      }
    }
  } catch (err) {
    console.error('interactionCreate エラー:', err);
  }
});

// ❺ 環境変数から一度だけログイン
client.login(process.env.DISCORD_TOKEN)
  .catch(err => console.error('Login エラー:', err));

