var winston = require('winston');
module.exports = {
    getPreviousState: function(cid){
        var previousState = {};
        winston.info("Getting previous state for user: %s", cid);
        var file = './' +  cid + '.json';
        try {  // get previous state from file
            previousState[cid] = require(file);
            winston.log("Successfully loaded %s.", file);
        }
        catch (err) { // if there is an error, start with a blank template
            winston.info("File %s not found. Starting from scratch.", file);
            // Plaintext messages
            previousState[cid] = {};
            // Hashed message objects
            previousState[cid].hashedMessages = {};
            // Game year
            previousState[cid].year = "";
            previousState[cid].phase = "";
            // Object to store individual country status
            previousState[cid].readyStates = {};
            previousState[cid].readyStates.countries = {};
            previousState[cid].readyStates.readyCount = 0;
            previousState[cid].initialRun = true;
        }
        return previousState;
    },
    getCurrentState: function(){
        var currentState = {};
        currentState.messages = [];
        currentState.hashedMessages = {};
        currentState.year = "";
        currentState.phase = "";
        currentState.readyStates = {};
        currentState.readyStates.countries = {};
        currentState.readyStates.readyCount = 0;
        return currentState;
    }
};