// index.js
require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { runGacha } = require('./utils/gacha');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// ─── commands フォルダ内を自動ロード ───
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const cmd = require(path.join(commandsPath, file));
    client.commands.set(cmd.data.name, cmd);
  });

// ─── Bot 起動完了ログ ───
client.once('ready', () => {
  console.log(`${client.user.tag} でログインしました`);
});

// ─── interactionCreate でスラッシュコマンドとボタン押下を一元ハンドル ───
client.on('interactionCreate', async interaction => {
  try {
    // 1) スラッシュコマンド処理
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          content: 'コマンドが見つかりません',
          ephemeral: true
        });
      }
      return command.execute(client, interaction);
    }

    // 2) ボタン押下処理
    if (interaction.isButton()) {
      // 3秒ルール回避のため一度だけ defer
      await interaction.deferReply({ ephemeral: true });

      if (interaction.customId === 'gacha_1') {
        await runGacha(interaction, 1);
      }
      else if (interaction.customId === 'gacha_10') {
        await runGacha(interaction, 10);
      }
      else {
        await interaction.editReply({ content: '不明な操作です' });
      }
    }
  } catch (err) {
    console.error('interactionCreate エラー:', err);

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: '内部エラーが発生しました',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '内部エラーが発生しました',
        ephemeral: true
      });
    }
  }
});

// ─── Botログインは一度だけ ───
client.login(process.env.DISCORD_TOKEN)
  .catch(err => console.error('Login エラー:', err));
