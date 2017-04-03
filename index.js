var setup = require('./setup.js'), // Setting up objects
    webpage = require('./webpage.js'), // Webpage scraping 
    util = require('./util.js'),
    TelegramBot = require('node-telegram-bot-api'),
    telegram = new TelegramBot(util.token, {polling: true}),
    jsdom = require("jsdom"), // used to create dom to navigate through jQuery
    fs = require('fs'), // storing json to disk
    hash = require('object-hash'), // hashing messages for quick lookups
    winston = require('winston'),
    sanitizeHtml = require('sanitize-html'),
    subscribed = {}, // ensure multiple check intervals for same cid don't happen (reset every run)
    countries = ["England", "France", "Italy", "Germany", "Austria", "Turkey", "Russia"];

var checkWebsite = function (cid, gid) {
    try {
        winston.info("Checking game: %s for user: %s.", gid, cid);
        if (subscribed[cid].running != true) {
        } else {
            winston.info("User: %s subscribed for game %s", cid, gid);
            var previousState = setup.getPreviousState(cid);
            var currentState = setup.getCurrentState();
            jsdom.env(
                "http://webdiplomacy.net/board.php?gameID=" + gid,
                ["http://code.jquery.com/jquery.js"],
                function (err, window) {
                    winston.info('Checking for updates.');
                    // ***** Get all messages in global chatbox ****
                    var newMessages = window.$("#chatboxscroll>table>tbody>tr");
                    // For each message,
                    if (window.$('.notice').length == 0) {
                        for (var i = 0; i < newMessages.length; i++) {
                            var message = {
                                // countries are found by looking at what class they are -> country1, country2 ...
                                // so we are taking the substring up to the number
                                "country": newMessages.eq(i).find('td').eq(1).attr('class').substring(13),
                                // NEED to replace tags for correct line feeds, and telegram likes <b> not <strong>
                                "text": util.formatMessageTelegram(newMessages.eq(i).find('td').eq(1).html())
                            };
                            // store message hash into current state hashtable
                            if (previousState[cid].hashedMessages != undefined) {
                                // if the hashed message isn't in the previous state, we need to send it
                                if (previousState[cid].hashedMessages[hash(message)] != true) {
                                    previousState[cid].hashedMessages[hash(message)] = true;
                                    if (!previousState[cid].initialRun && message.text.indexOf('Autumn, ') == -1 && message.text.indexOf('Spring, ') == -1) {
                                        var formattedMessage = util.getEmoji(countries[message.country - 1])
                                            + " " + message.text;
                                        winston.info('Sending global message to %s for %s:\n%s', cid, gid, formattedMessage);
                                        telegram.sendMessage(cid, formattedMessage, {parse_mode: "HTML"});
                                    }
                                }
                            }
                        }
                    }
                    // **** get year and phase ****
                    currentState.phase = webpage.getPhase(window);
                    currentState.year = webpage.getYear(window);

                    // **** ready states
                    var timeRemaining = webpage.getTime(window); // Used to display alongside ready status
                    currentState.readyStates = webpage.getReadyStates(window);
                    // Here we don't want to update every time a country is ready unless there are only a few countries that have ready status
                    var numWithOrders = 7 - currentState.readyStates.status.none.length - currentState.readyStates.status.defeated.length;
                    var numToDisplay = numWithOrders - 3 > 0 ? numWithOrders - 3 : 0;
                    winston.info("There are %s current countries with no status, %s defeated. " +
                        " The number with orders is %s so we are going to display when >%s countries are ready.",
                        currentState.readyStates.status.none.length, currentState.readyStates.status.defeated.length, numWithOrders, numToDisplay);
                    // ready count changed, send alert.
                    if (!previousState[cid].initialRun // new run
                        && previousState[cid].readyStates.status.ready.length != currentState.readyStates.status.ready.length // status changed
                        && currentState.readyStates.status.ready.length > numToDisplay // we are above threashold to display
                        && currentState.phase != undefined) { // there is a phase to display just so nothing fails when displaying
                        var formattedMessage = "*"+currentState.year + "* - " + currentState.phase + "\n_"
                            + timeRemaining + " remaining._\n*Ready*        "; //asterisk and underscores are for formatting
                        // Add up all the non-(no status) countries
                        for (var i = 0; i < currentState.readyStates.status.ready.length; i++)
                            formattedMessage += util.getEmoji(currentState.readyStates.status.ready[i]);
                        formattedMessage += "\n*Not ready* ";
                        for (var i = 0; i < currentState.readyStates.status.completed.length; i++)
                            formattedMessage += util.getEmoji(currentState.readyStates.status.completed[i]);
                        for (var i = 0; i < currentState.readyStates.status.notreceived.length; i++)
                            formattedMessage += util.getEmoji(currentState.readyStates.status.notreceived[i]);
                        winston.info('Sending ready message to %s for %s:\n%s', cid, gid, formattedMessage);
                        telegram.sendMessage(cid, formattedMessage, {parse_mode: "Markdown"});
                    }


                    if (previousState[cid].year != undefined
                        && previousState[cid].phase != undefined
                        && (previousState[cid].phase != currentState.phase || previousState[cid].year != currentState.year) // This solves the problem of build/retreat phases not changing the current year
                        && !previousState[cid].initialRun) {
                        var formattedMessage = "*" + currentState.year + "* - " + currentState.phase + "\n";
                        for (var i = 0; i < currentState.readyStates.status.ready.length; i++) {
                            formattedMessage += util.getEmoji(currentState.readyStates.status.ready[i]);
                        }
                        for (var i = 0; i < currentState.readyStates.status.notreceived.length; i++) {
                            formattedMessage += util.getEmoji(currentState.readyStates.status.notreceived[i]);
                        }
                        for (var i = 0; i < currentState.readyStates.status.completed.length; i++) {
                            formattedMessage += util.getEmoji(currentState.readyStates.status.completed[i]);
                        }
                        for (var i = 0; i < currentState.readyStates.status.none.length; i++) {
                            if (!currentState.readyStates.status.defeated.includes(currentState.readyStates.status.none[i].toLowerCase()))
                                formattedMessage += util.getEmoji(currentState.readyStates.status.none[i]);
                        }
                        winston.info('Sending ready message to %s for %s:\n%s', cid, gid, formattedMessage);
                        telegram.sendMessage(cid, formattedMessage, {parse_mode: "Markdown"});
                    }

                    // we need to now save current state to compare to next update.
                    // we aren't copying the whole object because the hashed messages wouldn't stay
                    previousState[cid].year = currentState.year;
                    previousState[cid].phase = currentState.phase;
                    previousState[cid].readyStates = currentState.readyStates;
                    previousState[cid].initialRun = false;
                    fs.writeFileSync(cid + '.json', JSON.stringify(previousState[cid]), "utf8");
                }
            );
        }
    }catch (err){winston.info(err);}
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
                            if (!previousState[cid].initialRun && currentState.messages[i].message.indexOf(", from you")==-1&&currentState.messages[i].message.indexOf('To: Global,')==-1)
                                telegram.sendMessage(cid, getEmoji(countries[currentState.messages[i].country - 1])
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

telegram.on("text", function (message) {
    var cid = message.chat.id; // use chat id because it is unique to individual chats
    winston.info("Received command from %s: %s.",cid, message.text);
    if (message.text.toLowerCase().indexOf("/gsubscribe") === 0) { // given monitor message
        var split = message.text.split(' ');
        if(split[2]!=undefined)cid = split[2];
        if (subscribed[cid] == undefined) subscribed[cid] = {'running': false, 'interval': -1, 'gid':-1};
        if (subscribed[cid].running != true) {
            subscribed[cid].running = true;
            subscribed[cid].gid = split[1];
            //if(split[2]==undefined)telegram.sendMessage(cid, "This chat is now subscribed to receive updates for game " + subscribed[cid].gid);
            winston.info("Chat %s subscribed for game %s.", cid, split[1]);

            if(util.timeAllowed()) {
                checkWebsite(cid, split[1]);
            }
            else{
                winston.info("Tried to check website, but was not allowed.");
            }
            subscribed[cid].interval = setInterval(function () {
                if(util.timeAllowed()) {
                    checkWebsite(cid, split[1]);
                }
                else{
                    winston.info("Tried to check website, but was not allowed.");
                }
            }, 360000); // 6 minutes
        }
        else {
            //if(split[2]!=undefined)telegram.sendMessage(cid, "This chat is already subscribed to receive updates for game " + subscribed[cid].gid);
            winston.info("Request for chat %s to subscribe for game %s denied.", cid, split[1]);
        }
    }
    else if (message.text.toLowerCase().indexOf("/stop") === 0) {
        if(subscribed[cid]!=undefined && subscribed[cid].running==true){
            winston.info("Stopping subscription for %s", cid);
            telegram.sendMessage(cid, "This chat will no longer receive updates for game " + subscribed[cid].gid);
            clearInterval(subscribed[cid].interval);
            subscribed[cid].running = false;
        }
        else{
            winston.info("No subscription for %s", cid);
            telegram.sendMessage(cid, "This chat is not monitoring any games.");
        }
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
            }, 360000);
        }
        else {
            checkWebsiteP(cid, split[1], split[2], split[3]);
        }
    }
});