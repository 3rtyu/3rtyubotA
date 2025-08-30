// main.js
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
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

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

//-----------commands------------

require("./deploy-commands.js");

//--------------------コマンドを読み込む--------------------------
// スラッシュコマンド
client.commands = new Collection();
const slashcommandsPath = path.join(__dirname, 'commands');
const slashcommandFiles = fs
  .readdirSync(slashcommandsPath)
  .filter(file => file.endsWith('.js'));

for (const file of slashcommandFiles) {
  const command = require(path.join(slashcommandsPath, file));
  console.log(`-> [Loaded Command] ${file.split('.')[0]}`);
  client.commands.set(command.data.name, command);
}

//--------------------イベントを読み込む--------------------------
const eventsPath = path.join(__dirname, 'events');
const eventsFiles = fs
  .readdirSync(eventsPath)
  .filter(file => file.endsWith('.js'));

for (const file of eventsFiles) {
  const event = require(path.join(eventsPath, file));

  // ↓ client を渡すように修正 ↓
  if (event.once) {
    client.once(event.name, (...args) => event.execute(client, ...args));
  } else {
    client.on(event.name, (...args) => event.execute(client, ...args));
  }

  console.log(`-> [Loaded Event] ${file.split('.')[0]}`);
}

// スラッシュコマンド実行時のハンドラ
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    // こちらはもともと client, interaction を正しく渡しています
    await command.execute(client, interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'コマンド実行中にエラーが発生しました', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
