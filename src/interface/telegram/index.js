import TelegramBot from 'node-telegram-bot-api';
import Logger from '../../common/logger';
import { receiveMessage } from '..';
import InterfaceMessage from '../interfaces/message';
import Connection from '../interfaces/connection';

Logger.info('Starting telegram interface.');
const telegram = new TelegramBot(process.env.DIPLOMACY_TELEGRAM_TOKEN, { polling: true });
Logger.info('Started telegram interface succesfully.');

export const sendTelegramMessage = ({ id }, { text }) => {
  telegram.sendMessage(id, text, { parse_mode: 'Markdown' });
}

telegram.on("text", async (message) => {
  const { chat: { id, title }, text, from: { first_name: firstName, last_name: lastName, username } } = message;
  const interfaceMessage = new InterfaceMessage({ title, text, username, firstName, lastName });
  const connection = new Connection(id, 'telegram');
  receiveMessage(connection, interfaceMessage);
});