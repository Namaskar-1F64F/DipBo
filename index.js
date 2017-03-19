var TelegramBot = require('node-telegram-bot-api'),
    telegram = new TelegramBot("353368837:AAHAvtUHRpWxcdb8ABYzJ0FpTcgT9b3dej8", {polling: true}),
    jsdom = require("jsdom"), // used to create dom to navigate through jQuery
    fs = require('fs'), // storing json to disk
    hash = require('object-hash'), // hashing messages for quick lookups
    emoji = require('node-emoji'), // country flags
    previousState = {},
    countries = ["England", "France", "Italy", "Germany", "Austria", "Turkey", "Russia"];
try {  // get previous state from file
    previousState = require('./state.json');
}
catch (err) { // if there is an error, start with a blank template
    console.log(err);
    // Plaintext messages
    previousState.messages = [];
    // Hashed message objects
    previousState.hashedMessages = {};
    // Game year
    previousState.year = "";
    // Object to store individual country status
    previousState.readyStates = {};
    previousState.readyStates.countries = {};
    previousState.readyStates.readyCount = 0;
}
// Given a group chat id, and a diplomacy game id, monitor website for changes
function checkWebsite(cid, gid) {
    var currentState = {};
    currentState.messages = [];
    currentState.hashedMessages = {};
    currentState.year = "";
    currentState.readyStates = {};
    currentState.readyStates.countries = {};
    currentState.readyStates.readyCount = 0;
    jsdom.env(
        "http://webdiplomacy.net/board.php?gameID=" + gid,
        ["http://code.jquery.com/jquery.js"],
        function (err, window) {
            // ***** Get all messages in global chatbox *****
            var newMessages = window.$("#chatboxscroll>table>tbody>tr");
            // For each message,
            for (var i = 0; i < newMessages.length; i++) {
                currentState.messages[i] = {
                    // countries are found by looking at what class they are -> country1, country2 ...
                    // so we are taking the substring up to the number
                    "country": newMessages.eq(i).find('td').eq(1).attr('class').substring(13),
                    // NEED to replace tags for correct line feeds, and telegram likes <b> not <strong>
                    "message": newMessages.eq(i).find('td').eq(1).html().replace(/<br>/g, '\n').replace(/<strong>/, '<b>').replace(/<\/strong>/, '</b>')
                };
                // store message hash into current state hashtable
                currentState.hashedMessages[hash(currentState.messages[i])] = true;
                if (previousState.hashedMessages != undefined) {
                    // if the hashed message isn't in the previous state, we need to send it
                    if (previousState.hashedMessages[hash(currentState.messages[i])] != true) {
                        telegram.sendMessage(cid, getEmoji(countries[currentState.messages[i].country - 1])
                            + " " + currentState.messages[i].message, {parse_mode: "HTML"});
                    }
                }
                else { // Nothing stored and no previous state, send all messages?
                    //telegram.sendMessage(cid, countries[currentState.messages[i].country - 1] + ": " + currentState.messages[i].message);
                }
            }

            // **** get year
            currentState.year = window.$('.gameDate').text();
            if (previousState.year != undefined) {
                // send update if year changes
                if (previousState.year != currentState.year) {
                    telegram.sendMessage(cid, "The year is now *" + currentState.year + "*", {parse_mode: "Markdown"});
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
            if (previousState.readyStates.readyCount != currentState.readyStates.readyCount
                && currentState.readyStates.readyCount > 2 && currentState.readyStates.readyCount != 7) {
                telegram.sendMessage(cid, "*" + currentState.year + "*\n_"
                    + timeRemaining + " remaining._\n*Ready*      "
                    + readyCountries.substring(1) + "\n*Unready* "
                    + unreadyCountries.substring(1), {parse_mode: "Markdown"}
                );
            }

            // save to json file in case server shuts down
            // if previousState != currentState ?
            fs.writeFileSync("state.json", JSON.stringify(currentState), "utf8");

            // we need to now save current state to compare to next update.
            previousState = currentState;
        }
    );
}

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

// use sid to ensure multiple check intervals don't happen
var sid = 0;
telegram.on("text", (message) => {
    if(message.text.toLowerCase().indexOf("/monitor") === 0 && sid == 0){ // given monitor message
    var cid = message.chat.id,
        gid = message.text.substring(8);
    checkWebsite(cid, gid);
    sid = setInterval(function () {
        checkWebsite(cid, gid);
    }, 300000);
    }
    else if(message.text.toLowerCase().indexOf("/stop") === 0) {
    clearInterval(sid);
    sid=0;
    }
});