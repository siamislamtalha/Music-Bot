const PermissionHandler = require('../handlers/permissionHandler');
const UIHandler = require('../handlers/uiHandler');
const MusicHandler = require('../handlers/musicHandler');
const logger = require('../utils/logger');
const { createOrUpdateUser } = require('../database/database');

module.exports = {
    name: 'interactionCreate',
    async execute(bot, interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = bot.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                // Create or update user in database for tracking
                await createOrUpdateUser({
                    id: interaction.user.id,
                    username: interaction.user.username,
                    discriminator: interaction.user.discriminator
                });

                // Execute the command
                await command.execute(bot, interaction);

                // Log command usage
                logger.info(`Command ${interaction.commandName} used by ${interaction.user.username} in ${interaction.guild?.name || 'DM'}`);

            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}:`, error);

                const uiHandler = new UIHandler();
                const embed = uiHandler.createErrorEmbed(
                    'Command Error',
                    'There was an error while executing this command!'
                );

                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ embeds: [embed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                } catch (followUpError) {
                    logger.error('Error sending error message:', followUpError);
                }
            }
        }
        
        // Handle button interactions
        else if (interaction.isButton()) {
            try {
                const musicHandler = new MusicHandler(bot);
                const uiHandler = new UIHandler();
                const customId = interaction.customId;

                // Handle music control buttons
                if (customId.startsWith('music_')) {
                    const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

                    switch (customId) {
                        case 'music_pause':
                            if (musicPlayer.isPlaying && !musicPlayer.isPaused) {
                                musicHandler.pauseAudio(interaction.guild.id);
                                await interaction.reply({ 
                                    content: '⏸️ Music paused', 
                                    ephemeral: true 
                                });
                            } else {
                                await interaction.reply({ 
                                    content: '❌ Nothing is currently playing', 
                                    ephemeral: true 
                                });
                            }
                            break;

                        case 'music_resume':
                            if (musicPlayer.isPaused) {
                                musicHandler.resumeAudio(interaction.guild.id);
                                await interaction.reply({ 
                                    content: '▶️ Music resumed', 
                                    ephemeral: true 
                                });
                            } else {
                                await interaction.reply({ 
                                    content: '❌ Music is not paused', 
                                    ephemeral: true 
                                });
                            }
                            break;

                        case 'music_skip':
                            if (musicPlayer.isPlaying) {
                                // Check permissions for skip command
                                const permissionHandler = new PermissionHandler();
                                const canUse = await permissionHandler.canUseCommand(
                                    interaction.user.id,
                                    interaction.guild.id,
                                    'skip'
                                );

                                if (!canUse.allowed && canUse.reason === 'Daily limit reached') {
                                    const embed = uiHandler.createLimitReachedEmbed(canUse.resetTime);
                                    const contactButton = await uiHandler.createContactAdminButton();
                                    await interaction.reply({ 
                                        embeds: [embed], 
                                        components: [contactButton],
                                        ephemeral: true 
                                    });
                                } else {
                                    musicHandler.skipSong(interaction.guild.id);
                                    if (canUse.reason !== 'Admin privileges' && canUse.reason !== 'Premium access') {
                                        await permissionHandler.incrementUsage(interaction.user.id);
                                    }
                                    await interaction.reply({ 
                                        content: '⏭️ Song skipped', 
                                        ephemeral: true 
                                    });
                                }
                            } else {
                                await interaction.reply({ 
                                    content: '❌ Nothing is currently playing', 
                                    ephemeral: true 
                                });
                            }
                            break;

                        case 'music_stop':
                            if (musicPlayer.isPlaying || musicPlayer.isPaused) {
                                musicHandler.stopAudio(interaction.guild.id);
                                await interaction.reply({ 
                                    content: '⏹️ Music stopped and queue cleared', 
                                    ephemeral: true 
                                });
                            } else {
                                await interaction.reply({ 
                                    content: '❌ Nothing is currently playing', 
                                    ephemeral: true 
                                });
                            }
                            break;

                        case 'music_previous':
                            await interaction.reply({ 
                                content: '⏮️ Previous song feature coming soon!', 
                                ephemeral: true 
                            });
                            break;

                        case 'music_loop':
                            const currentLoop = musicPlayer.loop || 'none';
                            let nextLoop;
                            switch (currentLoop) {
                                case 'none': nextLoop = 'song'; break;
                                case 'song': nextLoop = 'queue'; break;
                                case 'queue': nextLoop = 'none'; break;
                                default: nextLoop = 'none';
                            }
                            
                            musicHandler.setLoopMode(interaction.guild.id, nextLoop);
                            const loopEmojis = { none: '🔄', song: '🔂', queue: '🔁' };
                            await interaction.reply({ 
                                content: `${loopEmojis[nextLoop]} Loop mode: ${nextLoop}`, 
                                ephemeral: true 
                            });
                            break;

                        case 'music_shuffle':
                            if (musicPlayer.queue.length >= 2) {
                                musicHandler.shuffleQueue(interaction.guild.id);
                                await interaction.reply({ 
                                    content: '🔀 Queue shuffled', 
                                    ephemeral: true 
                                });
                            } else {
                                await interaction.reply({ 
                                    content: '❌ Need at least 2 songs in queue to shuffle', 
                                    ephemeral: true 
                                });
                            }
                            break;

                        case 'music_queue':
                            const queueEmbed = uiHandler.createQueueEmbed(
                                musicPlayer.queue,
                                musicPlayer.currentSong
                            );
                            await interaction.reply({ 
                                embeds: [queueEmbed], 
                                ephemeral: true 
                            });
                            break;

                        case 'music_lyrics':
                            await interaction.reply({ 
                                content: '📝 Lyrics feature coming soon!', 
                                ephemeral: true 
                            });
                            break;

                        case 'music_volume':
                            await interaction.reply({ 
                                content: '🔊 Use `/volume <1-100>` to adjust volume', 
                                ephemeral: true 
                            });
                            break;

                        default:
                            await interaction.reply({ 
                                content: '❓ Unknown button interaction', 
                                ephemeral: true 
                            });
                    }
                }

                // Handle pagination buttons
                else if (customId.startsWith('page_')) {
                    await interaction.reply({ 
                        content: '📄 Pagination feature coming soon!', 
                        ephemeral: true 
                    });
                }

            } catch (error) {
                logger.error('Button interaction error:', error);
                try {
                    await interaction.reply({ 
                        content: '❌ An error occurred while processing the button', 
                        ephemeral: true 
                    });
                } catch (replyError) {
                    logger.error('Error replying to button interaction:', replyError);
                }
            }
        }
    }
};
