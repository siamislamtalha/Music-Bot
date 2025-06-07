const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function loadCommands(bot) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    bot.commands.set(command.data.name, command);
                    logger.info(`Loaded command: ${command.data.name}`);
                } else {
                    logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
                }
            } catch (error) {
                logger.error(`Error loading command ${file}:`, error);
            }
        }
    }

    logger.info(`Loaded ${bot.commands.size} commands`);
}

module.exports = { loadCommands };
