const logger = require('../utils/logger');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(bot, oldState, newState) {
        try {
            const guild = newState.guild;
            const musicPlayer = bot.getMusicPlayer(guild.id);

            // Check if the bot was moved, disconnected, or kicked
            if (oldState.id === bot.client.user.id) {
                // Bot was disconnected from voice
                if (oldState.channelId && !newState.channelId) {
                    logger.info(`Bot was disconnected from voice channel in ${guild.name}`);
                    
                    // Clean up music player state
                    if (musicPlayer.connection) {
                        try {
                            musicPlayer.connection.destroy();
                        } catch (error) {
                            logger.error('Error destroying connection on voice disconnect:', error);
                        }
                    }

                    // Reset music player state
                    musicPlayer.connection = null;
                    musicPlayer.voiceChannel = null;
                    musicPlayer.isPlaying = false;
                    musicPlayer.isPaused = false;
                    musicPlayer.currentSong = null;
                    
                    // Clear progress interval
                    if (musicPlayer.progressInterval) {
                        clearInterval(musicPlayer.progressInterval);
                        musicPlayer.progressInterval = null;
                    }

                    // Remove from bot's tracking
                    bot.voiceConnections.delete(guild.id);
                    
                    // Only clear 24/7 mode if not manually enabled
                    if (!musicPlayer.mode247) {
                        musicPlayer.queue = [];
                        musicPlayer.radioMode = false;
                        bot.mode247Servers.delete(guild.id);
                    }

                    logger.info(`Cleaned up music player state for ${guild.name}`);
                }
                
                // Bot was moved to a different channel
                else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                    logger.info(`Bot was moved from ${oldState.channel.name} to ${newState.channel.name} in ${guild.name}`);
                    
                    // Update the voice channel reference
                    musicPlayer.voiceChannel = newState.channel;
                }
            }

            // Check if the bot is alone in the voice channel (for auto-leave)
            if (musicPlayer.voiceChannel && !musicPlayer.mode247) {
                const members = musicPlayer.voiceChannel.members.filter(member => !member.user.bot);
                
                if (members.size === 0) {
                    logger.info(`Bot is alone in voice channel ${musicPlayer.voiceChannel.name} in ${guild.name}`);
                    
                    // Set a timeout to leave if still alone after 5 minutes
                    setTimeout(async () => {
                        const currentMembers = musicPlayer.voiceChannel?.members?.filter(member => !member.user.bot);
                        
                        if (currentMembers && currentMembers.size === 0 && !musicPlayer.mode247) {
                            logger.info(`Auto-leaving voice channel ${musicPlayer.voiceChannel.name} in ${guild.name} (alone for 5 minutes)`);
                            
                            try {
                                // Stop any playing music
                                if (musicPlayer.player) {
                                    musicPlayer.player.stop();
                                }

                                // Destroy connection
                                if (musicPlayer.connection) {
                                    musicPlayer.connection.destroy();
                                }

                                // Clean up state
                                musicPlayer.connection = null;
                                musicPlayer.voiceChannel = null;
                                musicPlayer.isPlaying = false;
                                musicPlayer.isPaused = false;
                                musicPlayer.currentSong = null;
                                musicPlayer.queue = [];
                                musicPlayer.radioMode = false;

                                if (musicPlayer.progressInterval) {
                                    clearInterval(musicPlayer.progressInterval);
                                    musicPlayer.progressInterval = null;
                                }

                                bot.voiceConnections.delete(guild.id);

                                // Optionally send a message to the text channel
                                if (musicPlayer.textChannel) {
                                    try {
                                        const { EmbedBuilder } = require('discord.js');
                                        const config = require('../config/config');
                                        
                                        const embed = new EmbedBuilder()
                                            .setColor(config.colors.info)
                                            .setTitle('🎵 Auto-Leave')
                                            .setDescription('Left the voice channel due to inactivity (no members for 5 minutes).')
                                            .setTimestamp()
                                            .setFooter({ text: config.footer.developer });

                                        await musicPlayer.textChannel.send({ embeds: [embed] });
                                    } catch (messageError) {
                                        logger.error('Error sending auto-leave message:', messageError);
                                    }
                                }

                            } catch (error) {
                                logger.error('Error during auto-leave:', error);
                            }
                        }
                    }, 5 * 60 * 1000); // 5 minutes
                }
            }

        } catch (error) {
            logger.error('Voice state update error:', error);
        }
    }
};
