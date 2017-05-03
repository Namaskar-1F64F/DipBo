var util = require('./util.js'),
    logger = util.logger,
    diplomacy = require('./diplomacy'),
    telegramBot= require('node-telegram-bot-api');

module.exports = {
    telegram: new telegramBot("BOT KEY", {polling: true}),
    getBot: function(){
        return this.telegram;
    }
};