var winston = require('winston'),
    sanitizeHtml = require('sanitize-html'),
    emoji = require('node-emoji'); // country flags

module.exports = {
    token: "",
    timeAllowed: function () {
        var date = new Date();
        return (date.getHours() < 24 && date.getHours() > 7);
    },
    formatMessageTelegram:function (message) {
        return sanitizeHtml(message
            .replace(/<br>/g, '\n')
            .replace(/<strong>|<\/strong>/g, '*')
            .replace(/\*/g, ''));
    },
    getEmoji: function (country) {
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