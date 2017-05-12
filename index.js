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
// Log debug and above messages to console.  wanted to differentiate info and message
// logger.verbose for telegram emits, logger.info for everything not scary, warn for kinda, err for errors
logger.transports.console.level = 'debug';
telegram.on("text", function (message) {
    var cid = message.chat.id; // use chat id because it is unique to individual chats
    logger.verbose("Received command from %s: %s.", cid, message.text);
    if (message.text.toLowerCase().indexOf("/monitor") === 0) { // given monitor message
        var split = message.text.split(' ');
        if (split.length == 1)telegram.sendMessage(cid, "Specify a game ID\n/monitor gameID");
        if (split[2] != undefined) cid = split[2];
        // start subscription for specific chat
        subscription.start(cid, split[1], split[2]==undefined);
    }
    else if (message.text.toLowerCase().indexOf("/stop") === 0) { // given monitor message
        subscription.stop(cid);
    }
    else if (message.text.toLowerCase().indexOf("/start") === 0||message.text.toLowerCase().indexOf("/help") === 0) {
        telegram.sendMessage(cid, "*Welcome to webDiplomacy bot!*\n"
        + "To get started, locate the  `gameID` (found in the URL of a webDiplomacy game) you want to monitor"
        + " and send the \n\n `/monitor \<GAME_ID\>` command to monitor a game.\n\n"
        + "To stop monitoring, send the command `/stop`.\n\n"
        + "[Visit the GitHub](https://github.com/Timone/WebDiplomacyTelegramBot)", {parse_mode: "Markdown"});
    }
});