const { SlashCommandBuilder } = require('discord.js');
const UIHandler = require('../../handlers/uiHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Remove the bot from the voice channel'),

    async execute(bot, interaction) {
        try {
            const uiHandler = new UIHandler();
            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            // Check if bot is in a voice channel
            if (!musicPlayer.connection || !musicPlayer.voiceChannel) {
                const embed = uiHandler.createErrorEmbed(
                    'Not in Voice Channel',
                    'I\'m not currently in a voice channel!'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const voiceChannelName = musicPlayer.voiceChannel.name;
            const wasPlaying = musicPlayer.isPlaying;
            const currentSong = musicPlayer.currentSong;

            try {
                // Stop any playing music
                if (musicPlayer.isPlaying || musicPlayer.isPaused) {
                    if (musicPlayer.player) {
                        musicPlayer.player.stop();
                    }
                    
                    // Clear progress interval
                    if (musicPlayer.progressInterval) {
                        clearInterval(musicPlayer.progressInterval);
                        musicPlayer.progressInterval = null;
                    }
                }

                // Destroy the voice connection
                if (musicPlayer.connection) {
                    musicPlayer.connection.destroy();
                }

                // Clean up the music player state
                musicPlayer.connection = null;
                musicPlayer.voiceChannel = null;
                musicPlayer.textChannel = null;
                musicPlayer.isPlaying = false;
                musicPlayer.isPaused = false;
                musicPlayer.currentSong = null;
                musicPlayer.queue = [];
                musicPlayer.radioMode = false;
                musicPlayer.mode247 = false;

                // Remove from bot's voice connections
                bot.voiceConnections.delete(interaction.guild.id);
                bot.mode247Servers.delete(interaction.guild.id);

                let description = `🎵 Successfully left **${voiceChannelName}**!`;
                
                if (wasPlaying && currentSong) {
                    description += `\n\n⏹️ **Stopped playing:** ${currentSong.title}`;
                }

                if (musicPlayer.queue.length > 0) {
                    description += `\n🗑️ **Cleared queue:** ${musicPlayer.queue.length} songs removed`;
                }

                const embed = uiHandler.createSuccessEmbed(
                    'Left Voice Channel',
                    description
                );

                await interaction.reply({ embeds: [embed] });

                logger.info(`Left voice channel ${voiceChannelName} in guild ${interaction.guild.name}`);

            } catch (error) {
                logger.error('Error while leaving voice channel:', error);
                
                // Force cleanup even if there's an error
                musicPlayer.connection = null;
                musicPlayer.voiceChannel = null;
                musicPlayer.isPlaying = false;
                musicPlayer.isPaused = false;
                bot.voiceConnections.delete(interaction.guild.id);
                bot.mode247Servers.delete(interaction.guild.id);

                const embed = uiHandler.createSuccessEmbed(
                    'Left Voice Channel',
                    `🎵 Left **${voiceChannelName}** (with cleanup)`
                );
                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Leave command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while leaving the voice channel.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
