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
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  });

// ❸ Bot 起動完了ログ
client.once('ready', () => {
  console.log(`${client.user.tag} でログインしました`);
});

// ❹ interactionCreate でスラッシュコマンドとボタン両対応
client.on('interactionCreate', async interaction => {
  try {
    // スラッシュコマンド処理
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({ content: 'コマンドが見つかりません', ephemeral: true });
      }
      return command.execute(client, interaction);
    }

    // ボタン押下処理
    if (interaction.isButton()) {
      // deferReply を一度だけ呼び出して 3 秒ルールをクリア
      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId;
      if (id === 'gacha_1') {
        await runGacha(interaction, 1);
      }
      else if (id === 'gacha_10') {
        await runGacha(interaction, 10);
      }
      else {
        await interaction.editReply({ content: '不明な操作です' });
      }
    }
  } catch (error) {
    console.error('interactionCreate エラー:', error);

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
