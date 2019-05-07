import Logger from './logger';
import { init, add, stop } from './subscription';
import { initialize } from './database';
import { interfaceEmitter, sendMessage } from '../interface';

initialize().then(async success => {
  if (success) {
    init();
    Logger.info('Started Diplomacy Telegram Bot.');

    interfaceEmitter.on("message", async (id, message) => {
      Logger.info(`Received message in diplomacy.`);
      const { text, username, title } = message;
      if (text.length > 1 && text[0] === "/") {
        const fullCommand = text.substring(1);
        const split = fullCommand.split(' ');
        const command = split[0].toLowerCase();
        const args = split.splice(1);
        Logger.info(`Received command from ${username} in chat ${title} (${id}): ${fullCommand}`);
        commandHandler(command, args, { id, title });
      }
    });

    const commandHandler = (command, args, context) => {
      if (command == null) {
        return;
      } else if (command == 'monitor') {
        const [gid] = args;
        monitorCommand({ ...context, gid });
      } else if (command == 'unsubscribe') {
        const [number] = args;
        stopCommand({ ...context, number });
      } else if (command == 'start' || command == 'help') {
        const [number] = args;
        helpCommand({ ...context, number });
      }
    }

    const monitorCommand = ({ id, gid }) => {
      if (gid == null) {
        const message = `Sorry, I can't monitor everything, ha!\n\`/monitor <Your game ID goes here, please :)>\``;
        Logger.verbose(message);
        sendMessage(id, message, { parse_mode: 'Markdown' });
        return;
      }
      add(id, gid);
    }

    const stopCommand = ({ id }) => {
      stop(id);
    }

    const helpCommand = ({ id }) => {
      const message = `*Hi, I'm DipBo, and I really appreciate you stopping by!*

I am able to watch a diplomacy game and give you updates on the game. To get started, find the game ID (found in the URL of a game). After that, send in this chat \`/monitor <GAME_ID>\` to start getting updates from me!

To stop monitoring, send the command \`/stop\` and I'll leave you alone :(

Questions? t.me/sveyn`;
      Logger.verbose(message);
      sendMessage(id, message, { parse_mode: "Markdown" });
    }
  }
});
