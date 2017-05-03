var util = require('./util.js'),
    logger = util.logger,
    fs = require('fs'), // storing json to disk
    tg = require('./telegram'),
    telegram = tg.getBot();

module.exports = {
    subscriptions: undefined,
    intervals: {},
    init: function(){
        this.subscriptions = this.readFromFile();
        this.autoStart();
    },
    diplomacy: require('./diplomacy.js'),
    start: function (cid, gid, notify, scope=this) {
        if(scope.addSubscription(cid, gid)) {
            if(notify)telegram.sendMessage(cid, "This chat is now subscribed to receive updates for game " + gid);
            logger.info("Chat %s subscribed for game %s.", cid, gid);
            if(util.timeAllowed()) {
                scope.diplomacy.checkWebsite(cid, gid);
                scope.intervals[cid] = setInterval(function () {
                    if (util.timeAllowed()) {
                        scope.diplomacy.checkWebsite(cid, gid);
                    }
                    else {
                        logger.warn("Tried to check website, but was not allowed.");
                    }
                }, 360000); // 6 minutes
            }
            else logger.warn("Tried to check website, but was not allowed.");

        }
        else{
            logger.warn("User %s already subscribed for chat %s", cid, this.intervals[cid]);
        }
    },
    autoStart: function () {
        for(var i = 0; i < this.subscriptions.subscribed.length; i++) {
            var cid = this.subscriptions.subscribed[i].cid;
            var gid = this.subscriptions.subscribed[i].gid;
            var sleep = (360000/this.subscriptions.subscribed.length)*i;
            var notify = false;
            logger.info("Auto starting game %s for chat %s at time t+%s", cid, gid, sleep);
            var scope = this;
            setTimeout(this.start, sleep, cid, gid, notify, scope);
        }
    },
    stop: function (cid) {
        clearInterval(this.intervals[cid]);
        this.deleteSubscription(cid);
    },
    addSubscription: function (cid, gid) {
        try {
            if(this.getSubscription(cid)==undefined) {
                this.subscriptions.subscribed.push({'gid': gid, 'cid': cid});
                this.writeToFile();
                return true;
            }
            else if(this.intervals[cid]==undefined){
                return true;
            }
            else {
                return false;
            }
        }
        catch (err) {
            logger.error(err);
            return false;
        }
    },
    deleteSubscription: function (cid) {
        try {
            var match = this.getSubscription(cid);
            if (match != undefined) {
                var idx = this.subscriptions.subscribed.indexOf(match);
                if (idx != -1) {
                    this.subscriptions.subscribed.splice(idx, 1);
                    this.writeToFile();
                }
            }
        }
        catch (err) {
            logger.error(err);
            return false;
        }
    },
    getSubscription: function (cid) {
        return this.subscriptions.subscribed.find(function (element) {
            return element.cid == cid;
        });
    },
    writeToFile: function(){

        fs.writeFileSync('subscription.json', JSON.stringify(this.subscriptions), "utf8");
    },
    readFromFile: function(){
        try {
            var subscriptions = require('./subscription.json');
            return subscriptions;
        }
        catch(err){
            //Theres an error, lets create file now
            fs.writeFileSync('subscription.json', JSON.stringify({'subscribed':[]}), "utf8");
            logger.error(err);
            return {'subscribed':[]};
        }
    }
};