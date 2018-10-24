var util = require('./util.js'),
    logger = util.logger,
    diplomacy = require('./diplomacy'),
    telegramBot= require('node-telegram-bot-api');

module.exports = {
    telegram: new telegramBot("process.env.TELEGRAM_API_KEY", {polling: true}),
    getBot: function(){
        return this.telegram;
    }
};
