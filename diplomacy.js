var winston = require('winston'),
    util = require('./util.js'),
    setup = require('./setup.js'),
    jsdom = require('jsdom'), // used to create dom to navigate through jQuery
    hash = require('object-hash'), // hashing messages for quick lookups
    webpage = require('./webpage.js'),// Webpage scraping
    tg = require('./telegram.js'),
    telegram = tg.getBot(),
    fs = require('fs'); // storing json to disk

module.exports = {
    countries: ["England", "France", "Italy", "Germany", "Austria", "Turkey", "Russia"],
    checkWebsite: function (cid, gid) {
        try {
            winston.info("Checking game: %s for user: %s.", gid, cid);
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
                        var formattedMessage = "*" + currentState.year + "* - " + currentState.phase + "\n_"
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
                        /* don't show people without orders
                         for (var i = 0; i < currentState.readyStates.status.none.length; i++) {
                         if (!currentState.readyStates.status.defeated.includes(currentState.readyStates.status.none[i].toLowerCase()))
                         formattedMessage += util.getEmoji(currentState.readyStates.status.none[i]);
                         }*/
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
        } catch (err) {
            winston.info(err);
        }
    }
};