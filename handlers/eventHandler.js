const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function loadEvents(bot) {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            
            if (event.once) {
                bot.client.once(event.name, (...args) => event.execute(bot, ...args));
            } else {
                bot.client.on(event.name, (...args) => event.execute(bot, ...args));
            }
            
            logger.info(`Loaded event: ${event.name}`);
        } catch (error) {
            logger.error(`Error loading event ${file}:`, error);
        }
    }
}

module.exports = { loadEvents };
