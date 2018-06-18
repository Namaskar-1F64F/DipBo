var util     = require('./util.js'),
    logger   = util.logger,
    setup    = require('./setup.js'),
    jsdom    = require('jsdom'), // used to create dom to navigate through jQuery
    hash     = require('object-hash'), // hashing messages for quick lookups
    webpage  = require('./webpage.js'),// Webpage scraping
    tg       = require('./telegram.js'),
    telegram = tg.getBot(),
    fs       = require('fs'); // storing json to disk

module.exports = {
    checkWebsite: function (cid, gid) {
        try {
            var countries = ["England", "France", "Italy", "Germany", "Austria", "Turkey", "Russia"];

            logger.info("Checking game: %s for user: %s.", gid, cid);

            var previousState = setup.getPreviousState(cid);
            var currentState  = setup.getCurrentState();
            var jquery = fs.readFileSync('jQuery.js').toString();
            jsdom.env(
                "http://webdiplomacy.net/board.php?gameID=" + gid,
                [jquery],
                function (err, window) {
                    logger.info('Checking for updates.');
                    // ***** Get all messages in global chatbox ****
                    var newMessages = window.$("#chatboxscroll>table>tbody>tr");
                    // For each message,
                    if (window.$('.gamePanelHome').length == 0) {
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
                                        var globalMessage = util.getEmoji(countries[message.country - 1])
                                            + " " + message.text;
                                        logger.verbose('Sending global message to %s for %s:\n%s', cid, gid, globalMessage);
                                        telegram.sendMessage(cid, globalMessage, {parse_mode: "HTML"});
                                    }
                                }
                            }
                        }
                    }
                    // **** get year and phase ****
                    currentState.phase = webpage.getPhase(window);
                    currentState.year  = webpage. getYear(window);

                    // **** ready states
                    var timeRemaining = webpage.getTime(window); // Used to display alongside ready status
                    currentState.readyStates = webpage.getReadyStates(window);
                    // Here we don't want to update every time a country is ready unless there are only a few countries that have ready status
                    var numWithOrders = 7 - currentState.readyStates.status.none.length - currentState.readyStates.status.defeated.length;
                    var numToDisplay = numWithOrders - 3 > 0 ? numWithOrders - 3 : 0;
                    /*logger.info("There are %s countries with orders and %s ready. Displaying at >%s",
                        numWithOrders, currentState.readyStates.status.ready.length, numToDisplay);*/
                    // phase changed, send alert
                    if     (previousState[cid].year  != undefined
                        &&  previousState[cid].phase != undefined
                        && (previousState[cid].phase != currentState.phase || previousState[cid].year != currentState.year) // This solves the problem of build/retreat phases not changing the current year
                        && !previousState[cid].initialRun) {
                        var phaseMessage = currentState.year + " - " + currentState.phase + "\n";
                        for (var i = 0; i < currentState.readyStates.status.ready.length; i++) {
                            phaseMessage += util.getEmoji(currentState.readyStates.status.ready[i]);
                        }
                        for (var i = 0; i < currentState.readyStates.status.notreceived.length; i++) {
                            phaseMessage += util.getEmoji(currentState.readyStates.status.notreceived[i]);
                        }
                        for (var i = 0; i < currentState.readyStates.status.completed.length; i++) {
                            phaseMessage += util.getEmoji(currentState.readyStates.status.completed[i]);
                        }
                        logger.verbose('Sending phase change to %s for %s:\n%s', cid, gid, phaseMessage);
                        webpage.download('http://webdiplomacy.net/map.php?mapType=large&gameID=' + gid + '&turn=500', './' + gid + '.png', function(err){
                            if(err==undefined)telegram.sendPhoto(cid, './' + gid + '.png', {caption:phaseMessage});
                        });
                    }
                    // ready count changed, send alert.
                    if   (!previousState[cid].initialRun // new run
                        && previousState[cid].readyStates.status.ready.length != currentState.readyStates.status.ready.length // status changed
                        && currentState.readyStates.status.ready.length > numToDisplay // we are above threashold to display
                        && currentState.phase != undefined) { // there is a phase to display just so nothing fails when displaying
                        var readyMessage = "*" + currentState.year + "* - [" + currentState.phase + "](http://webdiplomacy.net/board.php?gameID=" + gid + ")\n"
                            + "*Ready*        "; //asterisk and underscores are for formatting
                        // Add up all the non-(no status) countries
                        for (var i = 0; i < currentState.readyStates.status.ready.length; i++)
                            readyMessage += util.getEmoji(currentState.readyStates.status.ready[i]);
                        readyMessage += "\n*Not ready* ";
                        for (var i = 0; i < currentState.readyStates.status.completed.length; i++)
                            readyMessage += util.getEmoji(currentState.readyStates.status.completed[i]);
                        for (var i = 0; i < currentState.readyStates.status.notreceived.length; i++)
                            readyMessage += util.getEmoji(currentState.readyStates.status.notreceived[i]);
                        readyMessage +="\n_" + timeRemaining + " remaining._";
                        logger.verbose('Sending ready message to %s for %s:\n%s', cid, gid, readyMessage);
                        telegram.sendMessage(cid, readyMessage, {parse_mode: "Markdown", disable_web_page_preview:true});
                    }

                    // we need to now save current state to compare to next update.
                    // we aren't copying the whole object because the hashed messages wouldn't stay
                    previousState[cid].year        = currentState.year;
                    previousState[cid].phase       = currentState.phase;
                    previousState[cid].readyStates = currentState.readyStates;
                    previousState[cid].initialRun  = false;

                    fs.writeFileSync(cid + '.json', JSON.stringify(previousState[cid]), "utf8");
                }
            );
        } catch (err) {
            logger.error(err);
        }
    }
};
