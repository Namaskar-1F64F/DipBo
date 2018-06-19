var util = require('./util.js'),
    logger = util.logger,
    diplomacy = require('./diplomacy'),
    telegramBot= require('node-telegram-bot-api');

module.exports = {
    telegram: new telegramBot("353368837:AAEO2RFkHE9lhKMeCpy8peGFxcftV4hLJ9M", {polling: true}),
    getBot: function(){
        return this.telegram;
    }
};
