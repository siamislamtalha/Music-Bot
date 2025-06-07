const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const UIHandler = require('../../handlers/uiHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('247mode')
        .setDescription('Toggle 24/7 mode - bot stays in voice channel permanently')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable 24/7 mode')),

    async execute(bot, interaction) {
        try {
            const uiHandler = new UIHandler();
            const enabled = interaction.options.getBoolean('enabled');
            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            // If no parameter provided, show current status
            if (enabled === null) {
                const status = musicPlayer.mode247 ? 'Enabled' : 'Disabled';
                const emoji = musicPlayer.mode247 ? '✅' : '❌';
                
                const embed = uiHandler.createInfoEmbed(
                    '24/7 Mode Status',
                    `${emoji} 24/7 mode is currently **${status}**`
                );
                return await interaction.reply({ embeds: [embed] });
            }

            // Check if user is in a voice channel when enabling
            if (enabled && !interaction.member.voice.channel) {
                const embed = uiHandler.createErrorEmbed(
                    'Voice Channel Required',
                    'You need to be in a voice channel to enable 24/7 mode!'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (enabled) {
                // Enable 24/7 mode
                musicPlayer.mode247 = true;
                bot.mode247Servers.add(interaction.guild.id);

                // Join voice channel if not already connected
                if (!musicPlayer.connection) {
                    try {
                        const voiceChannel = interaction.member.voice.channel;
                        const connection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: interaction.guild.id,
                            adapterCreator: interaction.guild.voiceAdapterCreator,
                            selfDeaf: false
                        });

                        musicPlayer.connection = connection;
                        musicPlayer.voiceChannel = voiceChannel;
                        musicPlayer.textChannel = interaction.channel;

                        bot.voiceConnections.set(interaction.guild.id, connection);
                    } catch (error) {
                        logger.error('Failed to join voice channel for 24/7 mode:', error);
                        const embed = uiHandler.createErrorEmbed(
                            'Connection Failed',
                            'Failed to join the voice channel. 24/7 mode not enabled.'
                        );
                        return await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                }

                const embed = uiHandler.createSuccessEmbed(
                    '24/7 Mode Enabled',
                    '✅ **24/7 mode is now active!**\n\n' +
                    '🎵 The bot will now stay in the voice channel permanently\n' +
                    '⏰ Music will continue playing even when the queue is empty\n' +
                    '🔧 Use `/247mode false` to disable this mode'
                );

                await interaction.reply({ embeds: [embed] });

            } else {
                // Disable 24/7 mode
                musicPlayer.mode247 = false;
                bot.mode247Servers.delete(interaction.guild.id);

                const embed = uiHandler.createSuccessEmbed(
                    '24/7 Mode Disabled',
                    '❌ **24/7 mode has been disabled.**\n\n' +
                    '🎵 The bot will now leave the voice channel when music stops\n' +
                    '⏰ Normal behavior restored\n' +
                    '🔧 Use `/247mode true` to re-enable this mode'
                );

                await interaction.reply({ embeds: [embed] });

                // If nothing is playing, leave the voice channel after a delay
                if (!musicPlayer.isPlaying && musicPlayer.connection) {
                    setTimeout(() => {
                        if (!musicPlayer.mode247 && !musicPlayer.isPlaying && musicPlayer.connection) {
                            musicPlayer.connection.destroy();
                            bot.voiceConnections.delete(interaction.guild.id);
                        }
                    }, 60000); // 1 minute delay
                }
            }

        } catch (error) {
            logger.error('247mode command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while setting 24/7 mode.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
