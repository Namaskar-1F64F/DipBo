import dotenv from 'dotenv';
dotenv.load();
import { initialize } from './interface/connection';

initialize().then(async success => {
  if (!success) throw new Error('Could not initialize database.');
  require('./interface/telegram');
  require('./interface/discord');
  require('./common');
});