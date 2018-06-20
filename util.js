var winston = require('winston'),
    sanitizeHtml = require('sanitize-html'),
    emoji = require('node-emoji'); // country flags

module.exports = {
    timeFormat: (new Date()).toLocaleTimeString(),
    logger: new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                timestamp: true,
                colorize: true
            })
        ]
    }),
    timeAllowed: function () {
        var date = new Date();
        return true;
    },
    formatMessageTelegram:function (message) {
        return sanitizeHtml(message
            .replace(/<br>/g, '\n') // Replace breaks with newlines
            .replace(/<strong>|<\/strong>/g, '*') // Replace strong with telegram bold markdown
            .replace(/\*/g, '')); // Replace any asterisks with nothing to not make things accidentally bold.
    },
    getEmoji: function (country) { // easier to lookup and return country flags so case doesn't mess us up
        switch (typeof country == 'string' && country.toLowerCase()) {
            case "new-york":
                return emoji.get('apple');
                break;
            case "heartland":
                return emoji.get('horse');
                break;
            case "california":
                return emoji.get('surfer');
                break;
            case "texas":
                return emoji.get('star');
                break;
            case "british-columbia":
                return emoji.get('field_hockey_stick_and_ball');
                break;
            case "peru":
                return emoji.get('mountain');
                break;
            case "florida":
                return emoji.get('palm_tree');
                break;
            case "cuba":
                return emoji.get('baseball');
                break;
            case "mexico":
                return emoji.get('taco');
                break;
            case "quebec":
                return emoji.get('ice_hockey_stick_and_puck');
                break;
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
            case "greece":
                return emoji.get('flag-gr');
                break;
            case "egypt":
                return emoji.get('flag-eg');
                break;
            case "rome":
                return emoji.get('flag-it');
                break;
            case "persia":
                return emoji.get('flag-ir');
                break;
            case "carthage":
                return emoji.get('flag-tn');
                break;
            default:
                return emoji.get('face_with_head_bandage');
        }
    }
};
