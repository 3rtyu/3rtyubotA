// Node.js バージョン確認用ログ
console.log("Running Node.js version:", process.version);

const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

//--------------------スラッシュコマンド読み込み--------------------------
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  console.log(`-> [Loaded Command] ${file.split('.')[0]}`);
  client.commands.set(command.data.name, command);
}

//--------------------イベント読み込み--------------------------
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));

  if (event.once) {
    client.once(event.name, (...args) => {
      if (event.name === 'interactionCreate') {
        event.execute(...args);
      } else {
        event.execute(client, ...args);
      }
    });
  } else {
    client.on(event.name, (...args) => {
      if (event.name === 'interactionCreate') {
        event.execute(...args);
      } else {
        event.execute(client, ...args);
      }
    });
  }

  console.log(`-> [Loaded Event] ${file.split('.')[0]}`);
}

//--------------------スラッシュコマンド実行時のハンドラ--------------------------
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      await command.execute(interaction);
    }
  } catch (error) {
    console.error('Interaction handler error:', error);
    try {
      if (!interaction.replied) {
        await interaction.reply({
          content: 'コマンド実行中にエラーが発生しました',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.followUp({
          content: 'コマンド実行中にエラーが発生しました',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (e) {
      console.error('エラー応答に失敗:', e);
    }
  }
});

//--------------------グローバルエラーハンドラ（致命度判定付き）--------------------------
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);

  const fatalPatterns = [
    'ECONNREFUSED',
    'EADDRINUSE',
    'RangeError: Maximum call stack size exceeded',
    'SyntaxError',
    'DiscordAPIError: Missing Access'
  ];

  const isFatal = fatalPatterns.some(pattern =>
    reason && reason.toString().includes(pattern)
  );

  if (isFatal) {
    console.error('致命的なエラーのため、プロセスを終了します');
    process.exit(1);
  } else {
    console.warn('非致命的なエラー。Botは継続します');
  }
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);

  const fatalPatterns = [
    'ECONNREFUSED',
    'EADDRINUSE',
    'RangeError: Maximum call stack size exceeded',
    'SyntaxError',
    'DiscordAPIError: Missing Access'
  ];

  const isFatal = fatalPatterns.some(pattern =>
    err && err.toString().includes(pattern)
  );

  if (isFatal) {
    console.error('致命的な例外のため、プロセスを終了します');
    process.exit(1);
  } else {
    console.warn('非致命的な例外。Botは継続します');
  }
});

client.login(process.env.TOKEN);

//--------------------Render用ダミーサーバー（ポート監視対策）--------------------------
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is running'));

app.listen(process.env.PORT || 3000, () => {
  console.log(`Express server is running on port ${process.env.PORT || 3000}`);
});
