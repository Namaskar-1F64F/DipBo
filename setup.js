var util = require('./util.js'),
    logger = util.logger;
module.exports = {
    getPreviousState: function(cid){
        var previousState = {};
        logger.info("Getting previous state for user: %s", cid);
        var file = './' +  cid + '.json';
        try {  // get previous state from file
            previousState[cid] = require(file);
            logger.log("Successfully loaded %s.", file);
        }
        catch (err) { // if there is an error, start with a blank template
            logger.warn("File %s not found. Starting from scratch.", file);
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