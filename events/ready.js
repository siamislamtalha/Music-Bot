const logger = require('../utils/logger');
const { setSetting } = require('../database/database');
const MusicHandler = require('../handlers/musicHandler');

module.exports = {
    name: 'ready',
    once: true,
    async execute(bot, client) {
        try {
            logger.info(`🎵 LyraBot is ready! Logged in as ${client.user.tag}`);
            logger.info(`📊 Serving ${client.guilds.cache.size} servers with ${client.users.cache.size} users`);

            // Set bot status
            client.user.setPresence({
                activities: [{
                    name: '🎵 Music in multiple servers | /help',
                    type: 2 // LISTENING
                }],
                status: 'online'
            });

            // Initialize music handler with Lavalink now that client is ready
            if (!bot.musicHandler) {
                bot.musicHandler = new MusicHandler(bot);
                logger.info('🎵 Music handler initialized with Lavalink');
            }

            // Update bot status in database
            await setSetting('bot_status', 'online');
            await setSetting('last_startup', Math.floor(Date.now() / 1000).toString());

            // Log server information
            logger.info('🏠 Connected to servers:');
            client.guilds.cache.forEach(guild => {
                logger.info(`   - ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
            });

            // Initialize music players for servers that might have the bot in 24/7 mode
            // This would be restored from database in a production environment
            client.guilds.cache.forEach(guild => {
                const musicPlayer = bot.getMusicPlayer(guild.id);
                // Reset state on startup
                musicPlayer.isPlaying = false;
                musicPlayer.isPaused = false;
                musicPlayer.currentSong = null;
                musicPlayer.connection = null;
                musicPlayer.player = null;
            });

            logger.info('✅ LyraBot initialization complete');

        } catch (error) {
            logger.error('Error in ready event:', error);
        }
    }
};
