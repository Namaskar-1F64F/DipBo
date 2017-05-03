console.log('Started WebDiplomacy Telegram Bot.')
var setup = require('./setup.js'), // Setting up objects
    webpage = require('./webpage.js'), // Webpage scraping 
    util = require('./util.js'),
    diplomacy = require('./diplomacy'),
    subscription = require('./subscription.js'),
    tg = require('./telegram'),
    telegram = tg.getBot(),
    jsdom = require('jsdom'), // used to create dom to navigate through jQuery
    fs = require('fs'), // storing json to disk
    hash = require('object-hash'), // hashing messages for quick lookups
    logger = util.logger;
    sanitizeHtml = require('sanitize-html');
    subscription.init();

logger.info('Loaded Dependencies');

telegram.on("text", function (message) {
    var cid = message.chat.id; // use chat id because it is unique to individual chats
    logger.verbose("Received command from %s: %s.", cid, message.text);
    if (message.text.toLowerCase().indexOf("/monitor") === 0) { // given monitor message
        var split = message.text.split(' ');
        if (split[2] != undefined) cid = split[2];
        subscription.start(cid, split[1], split[2]==undefined);
    }
    if (message.text.toLowerCase().indexOf("/stop") === 0) { // given monitor message
        subscription.stop(cid);
    }
});