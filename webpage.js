var winston = require('winston'),
    util = require('./util.js');
module.exports = {
    getReadyStates: function (window) {
        // **** ready states
        var jElement,
            status,
            country,
            readyStates = {'countries': [], 'readyCount': 0, 'readyCountries':[], 'unreadyCountries':[]};
        // look through all countries status and check if the img is a green check.
        window.$.each(window.$('.memberCountryName'), function (idx, element) {
            var jElement = window.$(element); // need jQuery object
            var status = jElement.find('img').attr('alt'); // green check
            var country = jElement.text().substring(2); // there are 2 spaces after img
            var defeated = jElement.hasClass('memberStatusDefeated');
            readyStates.countries.push({name:country,status:status, defeated: defeated});
            if (status == "Ready") { // add up all ready countries and put their flags into a string
                readyStates.readyCount++;
                readyStates.readyCountries += " " + util.getEmoji(country);
            }
            else // add up all unready countries into a string
                readyStates.unreadyCountries += " " + util.getEmoji(country);
        });
        return readyStates;
    },
    getPhase: function(window){
        return window.$('.gamePhase').text();
    },
    getYear: function(window){
        return window.$('.gameDate').text();
    }
};