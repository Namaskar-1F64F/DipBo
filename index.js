var TelegramBot = require('node-telegram-bot-api'),
    jsdom = require("jsdom"), // used to create dom to navigate through jQuery
    fs = require('fs'), // storing json to disk
    hash = require('object-hash'), // hashing messages for quick lookups
    emoji = require('node-emoji'), // country flags
    sanitizeHtml = require('sanitize-html'),
    previousState = {},
    countries = ["England", "France", "Italy", "Germany", "Austria", "Turkey", "Russia"];

var checkWebsite = function (cid, gid, wD_Code, wD_Key) {
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
            previousState[cid].initialRun = true;
        }
        subscribed[cid].running = true;
        var currentState = {};
        currentState.messages = [];
        currentState.hashedMessages = {};
        currentState.year = "";
        currentState.readyStates = {};
        currentState.readyStates.countries = {};
        currentState.readyStates.readyCount = 0;
        console.log("checking " + gid + " for " + cid);
        jsdom.env(
            "http://webdiplomacy.net/board.php?gameID=" + gid,
            //"http://webdiplomacy.net/board.php?gameID=" + gid + "&viewArchive=Messages",
            ["http://code.jquery.com/jquery.js"],
            function (err, window) {
                // ***** Get all messages in global chatbox *****
                // For each message,
                var newMessages = window.$("#chatboxscroll>table>tbody>tr");
                //var newMessages = window.$('.variantClassic>table>tbody>tr');
                // For each message,
                console.log('checking for new messages');
                for (var i = 0; i < newMessages.length; i++) {
                    currentState.messages[i] = {
                        // countries are found by looking at what class they are -> country1, country2 ...
                        // so we are taking the substring up to the number
                        "country": newMessages.eq(i).find('td').eq(1).attr('class').substring(13),
                        // NEED to replace tags for correct line feeds, and telegram likes <b> not <strong>
                        "message": formatMessageTelegram(newMessages.eq(i).find('td').eq(1).html())
                    };
                    // store message hash into current state hashtable
                    if (previousState[cid].hashedMessages != undefined) {
                        // if the hashed message isn't in the previous state, we need to send it
                        if (previousState[cid].hashedMessages[hash(currentState.messages[i])] != true) {
                            previousState[cid].hashedMessages[hash(currentState.messages[i])] = true;
                            if (!previousState[cid].initialRun) {
                                telegram.sendMessage(cid, getEmoji(countries[currentState.messages[i].country - 1])
                                    + " " + currentState.messages[i].message, {parse_mode: "HTML"});
                                console.log("sending global message to " + cid + " for " + gid);
                            }
                        }
                    }
                }

                // **** get year
                currentState.year = window.$('.gameDate').text();
                if (previousState[cid].year != undefined) {
                    // send update if year changes
                    if (previousState[cid].year != currentState.year) {
                        if (!previousState[cid].initialRun) {
                            telegram.sendMessage(cid, "The year is now *" + currentState.year + "*\n"
                                + getEmoji('russia') + getEmoji('france') + getEmoji('england') + getEmoji('italy')
                                + getEmoji('turkey') + getEmoji('austria') + getEmoji('germany'), {parse_mode: "Markdown"});
                            console.log("sending year update to " + cid + " for " + gid);
                        }
                    }
                }

                // **** ready states
                var unreadyCountries = "",
                    readyCountries = "",
                    jElement,
                    status,
                    country,
                    timeRemaining = window.$('.timeremaining').text();
                // look through all countries status and check if the img is a green check.
                window.$.each(window.$('.memberCountryName'), function (idx, element) {
                    var jElement = window.$(element); // need jQuery object
                    var status = jElement.find('img').attr('alt'); // green check
                    var country = jElement.text().substring(2); // there are 2 spaces after img
                    currentState.readyStates.countries[country] = status; // store country status (not in use yet)
                    if (status == "Ready") { // add up all ready countries and put their flags into a string
                        currentState.readyStates.readyCount++;
                        readyCountries += " " + getEmoji(country);
                    }
                    else // add up all unready countries into a string
                        unreadyCountries += " " + getEmoji(country);
                });
                // ready count changed, send alert.
                if (previousState[cid].readyStates.readyCount != currentState.readyStates.readyCount
                    && currentState.readyStates.readyCount > 2 && currentState.readyStates.readyCount != 7) {
                    if (!previousState[cid].initialRun) {
                        telegram.sendMessage(cid, "*" + currentState.year + "*\n_"
                            + timeRemaining + " remaining._\n*Ready*      "
                            + readyCountries.substring(1) + "\n*Unready* "
                            + unreadyCountries.substring(1), {parse_mode: "Markdown"}
                        );
                        console.log("sending ready update message to " + cid + " for " + gid);
                    }
                    }

                // save to json file in case server shuts down
                // if previousState != currentState ?
                //fs.writeFileSync("state.json", JSON.stringify(currentState), "utf8");

                // we need to now save current state to compare to next update.
                previousState[cid].year = currentState.year;
                previousState[cid].readyStates = currentState.readyStates;
                previousState[cid].initialRun = false;
                fs.writeFileSync(cid + '.json', JSON.stringify(previousState[cid]), "utf8");
            }
        );
    }
};
var formatMessageTelegram = function (message) {
    return sanitizeHtml(message.replace(/<br>/g, '\n').replace(/<strong>|<\/strong>/g, '*').replace(/\*/g, ''));
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
                        "message": formatMessageTelegram(newMessages.eq(i).find('td').eq(1).html())
                    };
                    // store message hash into current state hashtable
                    currentState.hashedMessages[hash(currentState.messages[i])] = true;
                    if (previousState[cid].hashedMessages != undefined) {
                        // if the hashed message isn't in the previous state, we need to send it
                        if (previousState[cid].hashedMessages[hash(currentState.messages[i])] != true) {
                            previousState[cid].hashedMessages[hash(currentState.messages[i])] = true;
                            console.log("sending global message to " + cid + " for " + gid);
                            if (!previousState[cid].initialRun) telegram.sendMessage(cid, getEmoji(countries[currentState.messages[i].country - 1])
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
var getEmoji = function (country) {
    switch (country.toLowerCase()) {
        case "russia":
            return emoji.get('flag-ru');
            break;
        case "turkey":
            return emoji.get('flag-tr');
            break;
        case "italy":
            return emoji.get('flag-it');
            break;
        case "england":
            return emoji.get('flag-gb');
            break;
        case "france":
            return emoji.get('flag-fr');
            break;
        case "austria":
            return emoji.get('flag-at');
            break;
        case "germany":
            return emoji.get('flag-de');
            break;
        default:
            return emoji.get('face_with_head_bandage');
    }
};

// use subscribed object to ensure multiple check intervals for same cid don't happen
var subscribed = {};
telegram.on("text", function (message) {
    var cid = message.chat.id;
    if (message.text.toLowerCase().indexOf("/subscribe") === 0) { // given monitor message
        if (subscribed[cid] == undefined) subscribed[cid] = {'running': false, 'interval': -1};
        if (subscribed[cid].running != true) {
            subscribed[cid].running = true;
            checkWebsite(cid, "194050");
            subscribed[cid] = setInterval(function () {
                checkWebsite(cid, "194050");
            }, Math.floor(Math.random()*(450000-250000+1)+250000));
        }
        else {
            checkWebsite(cid, split[1], split[2], split[3]);
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
            checkWebsiteP(cid, split[1], split[2], split[3]);
            subscribed[cid].interval = setInterval(function () {
                checkWebsiteP(cid, split[1], split[2], split[3]);
            }, Math.floor(Math.random()*(450000-250000+1)+250000));
        }
        else {
            checkWebsiteP(cid, split[1], split[2], split[3]);
        }
    }
});
