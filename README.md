# Welcome to WebDiplomacy Telegram Bot
>The bot to support all your telegram needs concerned with WebDiplomacy!

This bot is intended for use of monitoring one or multiple Webdiplomacy games by periodically taking a snapshot of the
page and detecting changes. This bot will send updates for:

- Global messages
- When players ready
- Phase changes

Running
```
npm install
node index.js
```

You will need to supply your own Telegram BOT API KEY in the util.js file

HOW?
1. Run Server
2. Add @WebDiplomacyTelegramBot to telegram
3. Send command "/monitor <game ID>" with the WebDiplomacy Game ID (can be found in the URL for your game)
4. Bask in the updates.