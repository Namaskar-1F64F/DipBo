var TelegramBot = require('node-telegram-bot-api'),
    telegram = new TelegramBot("353368837:AAEO2RFkHE9lhKMeCpy8peGFxcftV4hLJ9M", {polling: true}),
    jsdom = require("jsdom"), // used to create dom to navigate through jQuery
    fs = require('fs'), // storing json to disk
    hash = require('object-hash'), // hashing messages for quick lookups
    setup = require('./setup.js'),
    webpage = require('./webpage.js'),
    util = require('./util.js'),
    winston = require('winston'),
    sanitizeHtml = require('sanitize-html'),
    countries = ["England", "France", "Italy", "Germany", "Austria", "Turkey", "Russia"];

var checkWebsite = function (cid, gid, wD_Code, wD_Key) {
    winston.info("Checking game: %s for user: %s.", gid, cid);
    if (subscribed[cid].running == true) {
        winston.info("User: %s subscribed for game %s", cid, gid);
        var previousState = setup.getPreviousState(cid);
        var currentState = setup.getCurrentState();
        jsdom.env(
            "http://webdiplomacy.net/board.php?gameID=" + gid,
            ["http://code.jquery.com/jquery.js"],
            function (err, window) {
                winston.info('Checking for updates.');
                // ***** Get all messages in global chatbox *****
                // For each message,
                var newMessages = window.$("#chatboxscroll>table>tbody>tr");
                //var newMessages = window.$('.variantClassic>table>tbody>tr');
                // For each message,
                for (var i = 0; i < newMessages.length; i++) {
                    var message = {
                        // countries are found by looking at what class they are -> country1, country2 ...
                        // so we are taking the substring up to the number
                        "country": newMessages.eq(i).find('td').eq(1).attr('class').substring(13),
                        // NEED to replace tags for correct line feeds, and telegram likes <b> not <strong>
                        "message": util.formatMessageTelegram(newMessages.eq(i).find('td').eq(1).html())
                    };
                    currentState.messages[i] = message;
                    // store message hash into current state hashtable
                    if (previousState[cid].hashedMessages != undefined) {
                        // if the hashed message isn't in the previous state, we need to send it
                        if (previousState[cid].hashedMessages[hash(message)] != true) {
                            previousState[cid].hashedMessages[hash(message)] = true;
                            if (!previousState[cid].initialRun && message.indexOf('Autumn, ') == -1 && message.indexOf('Spring, ') == -1) {
                                var formattedMessage = getEmoji(countries[currentState.messages[i].country - 1])
                                    + " " + currentState.messages[i].message;
                                winston.info('Sending global message to %s for %s:\n%s', cid, gid, formattedMessage);
                                telegram.sendMessage(cid, formattedMessage, {parse_mode: "HTML"});
                            }
                        }
                    }
                }

                // **** ready states
                var timeRemaining = window.$('.timeremaining').text();
                currentState.readyStates = webpage.getReadyStates(window);
                // ready count changed, send alert.
                if (previousState[cid].readyStates.readyCount != currentState.readyStates.readyCount
                   && currentState.readyStates.readyCount > 2
                   &&!previousState[cid].initialRun
                   && currentState.phase != undefined) {
                    var formattedMessage = currentState.phase + " - *" + currentState.year + "*\n_"
                        + timeRemaining + " remaining._\n*Ready*      "
                        + currentState.readyStates.readyCountries + "\n*Unready* "
                        + currentState.readyStates.unreadyCountries;
                    winston.info('Sending ready message to %s for %s:\n%s', cid, gid, formattedMessage);
                    telegram.sendMessage(cid, formattedMessage, {parse_mode: "Markdown"});
                }

                // **** get year
                currentState.phase = webpage.getPhase(window);
                currentState.year = webpage.getYear(window);
                if (previousState[cid].year != undefined
                    && previousState[cid].phase != undefined
                    && (previousState[cid].phase != currentState.phase || previousState[cid].year != currentState.year)
                    && !previousState[cid].initialRun) {
                    // send update if year changes
                    var formattedMessage = "The year is *" + currentState.year + "*, " + currentState.phase + "\n";
                    for( var i = 0; i < currentState.readyStates.countries.length; i++) {
                        if(!currentState.readyStates.countries[i].defeated)
                            formattedMessage += util.getEmoji(currentState.readyStates.countries[i].name);
                    }
                    winston.info('Sending ready message to %s for %s:\n%s', cid, gid, formattedMessage);
                    telegram.sendMessage(cid, formattedMessage, {parse_mode: "Markdown"});
                }

                // we need to now save current state to compare to next update.
                previousState[cid].year = currentState.year;
                previousState[cid].readyStates = currentState.readyStates;
                previousState[cid].initialRun = false;
                previousState[cid].phase = currentState.phase;
                fs.writeFileSync(cid + '.json', JSON.stringify(previousState[cid]), "utf8");
            }
        );
    }
};

var checkWebsiteP = function (cid, gid, wD_Code, wD_Key) {
    if (subscribed[cid].running == true) {
        try {  // get previous state from file
            previousState[cid] = require('./' + cid + '.json');
        }
        catch (err) { // if there is an error, start with a blank template
            console.log(err);
            // Plaintext messages
            previousState[cid] = {};
            // Hashed message objects
            previousState[cid].hashedMessages = {};
            // Game year
            previousState[cid].year = "";
            // Object to store individual country status
            previousState[cid].readyStates = {};
            previousState[cid].readyStates.countries = {};
            previousState[cid].readyStates.readyCount = 0;
            previousState[cid].page = 0;
            previousState[cid].initialRun = true;
        }
        if (previousState[cid].initialRun) console.log("initial run");
        var currentState = {};
        currentState.messages = [];
        currentState.hashedMessages = {};
        currentState.year = "";
        currentState.readyStates = {};
        currentState.readyStates.countries = {};
        currentState.readyStates.readyCount = 0;
        console.log("checking " + gid + " for " + cid);
        var config = {};
        config.headers = {};
        config.headers.Cookie = 'wD_Code=' + wD_Code + ';wD-Key=' + wD_Key + ';';
        jsdom.env(
            "http://webdiplomacy.net/board.php?gameID=" + gid + "&viewArchive=Messages&page-archive=" + previousState[cid].page,
            ["http://code.jquery.com/jquery.js"],
            config,
            function (err, window) {
                console.log("http://webdiplomacy.net/board.php?gameID=" + gid + "&viewArchive=Messages&page-archive=" + previousState[cid].page);
                // First we need to check if this is the first page,
                if (window.$('img[src$="Backward.png"]').length > 0) {
                    previousState[cid].page++;
                    currentState.page = previousState[cid].page;
                    console.log('new page');
                }
                // ***** Get all messages in global chatbox *****
                // For each message,
                var newMessages = window.$('.variantClassic>table>tbody>tr');
                // For each message,
                console.log('checking for new messages');
                console.log(window.document.cookie);
                console.log(window.$("#header-welcome").text());
                for (var i = 0; i < newMessages.length; i++) {
                    currentState.messages[i] = {
                        // countries are found by looking at what class they are -> country1, country2 ...
                        // so we are taking the substring up to the number
                        "country": newMessages.eq(i).find('td').eq(1).attr('class').substring(13),
                        // NEED to replace tags for correct line feeds, and telegram likes <b> not <strong>
                        "message": util.formatMessageTelegram(newMessages.eq(i).find('td').eq(1).html())
                    };
                    // store message hash into current state hashtable
                    currentState.hashedMessages[hash(currentState.messages[i])] = true;
                    if (previousState[cid].hashedMessages != undefined) {
                        // if the hashed message isn't in the previous state, we need to send it
                        if (previousState[cid].hashedMessages[hash(currentState.messages[i])] != true) {
                            previousState[cid].hashedMessages[hash(currentState.messages[i])] = true;
                            console.log("sending global message to " + cid + " for " + gid);
                            if (!previousState[cid].initialRun && currentState.messages[i].message.indexOf(", from you")==-1&&currentState.messages[i].message.indexOf('To: Global,')==-1) telegram.sendMessage(cid, getEmoji(countries[currentState.messages[i].country - 1])
                                + " " + currentState.messages[i].message, {parse_mode: "HTML"});
                        }
                    }
                }
                // save to json file in case server shuts down
                // we need to now save current state to compare to next update.
                previousState[cid].year = currentState.year;
                previousState[cid].readyStates = currentState.readyStates;
                previousState[cid].initialRun = false;
                fs.writeFileSync(cid + '.json', JSON.stringify(previousState[cid]), "utf8");
            }
        );
    }
};

// use node-emoji to get flags

// use subscribed object to ensure multiple check intervals for same cid don't happen
var subscribed = {};
telegram.on("text", function (message) {
    var cid = message.chat.id;
    if (message.text.toLowerCase().indexOf("/gsubscribe") === 0) { // given monitor message
        if (subscribed[cid] == undefined) subscribed[cid] = {'running': false, 'interval': -1};
        if (subscribed[cid].running != true) {
            subscribed[cid].running = true;
            var split = message.text.split(' ');
            checkWebsite(cid, split[1]);
            subscribed[cid].interval = setInterval(function () {
                if(util.timeAllowed()) {
                    checkWebsite(cid, split[1]);
                }
                else{
                    winston.info("Tried to check website, but was not allowed.");
                }
            }, 300000);
        }
        else {
            checkWebsite(cid, "194050");
        }
    }
    else if (message.text.toLowerCase().indexOf("/stop") === 0) {
        clearInterval(subscribed[cid].interval);
        subscribed[cid].running = false;
    }
    else if (message.text.toLowerCase().indexOf("/psubscribe") === 0) { // given monitor message
        if (subscribed[cid] == undefined) subscribed[cid] = {'running': false, 'interval': -1};
        var split = message.text.split(' ');
        if (subscribed[cid].running != true) {
            subscribed[cid].running = true;
            subscribed[cid].interval = setInterval(function () {
                if(timeAllowed()) {
                    checkWebsiteP(cid, split[1], split[2], split[3]);
                }
            }, 300000);
        }
        else {
            checkWebsiteP(cid, split[1], split[2], split[3]);
        }
    }
});