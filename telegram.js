var util = require('./util.js'),
    logger = util.logger,
    diplomacy = require('./diplomacy'),
    telegramBot= require('node-telegram-bot-api');

    let bot;
    if(process.env.NODE_ENV === 'production') {
        bot = new telegramBot(process.env.TELEGRAM_API_KEY);
        bot.setWebHook(process.env.URL + bot.token);
      }
      else {
        bot = new telegramBot(process.env.TELEGRAM_API_KEY, { polling: true });
      }
module.exports = {
    telegram: bot,
    getBot: function(){
        return this.telegram;
    }
};
