var winston = require('winston'),
    util = require('./util.js');
module.exports = {
    getReadyStates: function (window) {
        // **** ready states
        var jElement,
            status,
            country,
            // The ready states are holding every group individually because we use no status as well as defeated status separately
            readyStates = {'status': {'ready':[],'notreceived':[],'completed':[],'none':[], 'defeated':[]}};
        // look through all countries status and check if the img is a green check.
        window.$.each(window.$('.memberCountryName'), function (idx, element) {
            var jElement = window.$(element); // need jQuery object
            var status = jElement.find('img').attr('alt'); // green check
            var country = jElement.text().trim(); // there are 2 spaces after img
            var defeated = jElement.find('span').hasClass('memberStatusDefeated');
            if(defeated){
                readyStates.status.defeated.push(country);
            }
            else if(status == "Ready")
                readyStates.status.ready.push(country);
            else if(status=="Completed")
                readyStates.status.completed.push(country);
            else if(status == "Not received")
                readyStates.status.notreceived.push(country);
            else
                readyStates.status.none.push(country.replace('- ', '')); // no status countries have a dash instead of an icon
        });
        return readyStates;
    },
    getPhase: function(window){
        return window.$('.gamePhase').text();
    },
    getYear: function(window){
        return window.$('.gameDate').text();
    },
    getTime: function(window){
        return window.$('.timeremaining').text();
    }
};