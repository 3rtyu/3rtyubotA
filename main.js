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

//--------------------インタラクション実行時のハンドラ--------------------------
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      await command.execute(interaction);
    } else if (interaction.isButton()) {
      const handler = require('./interactions/shopButtons.js');
      await handler(interaction);
    }
  } catch (error) {
    console.error(error);
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
