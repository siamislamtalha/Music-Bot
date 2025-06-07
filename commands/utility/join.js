const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const UIHandler = require('../../handlers/uiHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Invite the bot to your voice channel'),

    async execute(bot, interaction) {
        try {
            const uiHandler = new UIHandler();

            // Check if user is in a voice channel
            if (!interaction.member.voice.channel) {
                const embed = uiHandler.createErrorEmbed(
                    'Voice Channel Required',
                    'You need to be in a voice channel for me to join!'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const voiceChannel = interaction.member.voice.channel;
            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            // Check if bot is already in a voice channel
            if (musicPlayer.connection && musicPlayer.voiceChannel) {
                if (musicPlayer.voiceChannel.id === voiceChannel.id) {
                    const embed = uiHandler.createInfoEmbed(
                        'Already Connected',
                        `I'm already in ${voiceChannel.name}! 🎵`
                    );
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    const embed = uiHandler.createErrorEmbed(
                        'Already in Voice Channel',
                        `I'm currently in **${musicPlayer.voiceChannel.name}**. Use \`/leave\` first or use music commands to switch channels.`
                    );
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }

            // Check bot permissions in the voice channel
            const permissions = voiceChannel.permissionsFor(bot.client.user);
            if (!permissions.has('Connect')) {
                const embed = uiHandler.createErrorEmbed(
                    'Missing Permissions',
                    `I don't have permission to join **${voiceChannel.name}**. Please check my permissions.`
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (!permissions.has('Speak')) {
                const embed = uiHandler.createErrorEmbed(
                    'Missing Permissions',
                    `I can join **${voiceChannel.name}** but I don't have permission to speak. Please check my permissions.`
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            try {
                // Join the voice channel
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

                // Handle connection events
                connection.on('stateChange', (oldState, newState) => {
                    logger.info(`Voice connection state changed from ${oldState.status} to ${newState.status}`);
                });

                connection.on('error', (error) => {
                    logger.error('Voice connection error:', error);
                });

                const embed = uiHandler.createSuccessEmbed(
                    'Successfully Joined',
                    `🎵 Successfully joined **${voiceChannel.name}**!\n\n` +
                    `👥 **Channel:** ${voiceChannel.name}\n` +
                    `🔊 **Members:** ${voiceChannel.members.size}\n\n` +
                    `Ready to play music! Use \`/play <song>\` to start.`
                );

                await interaction.reply({ embeds: [embed] });

                logger.info(`Joined voice channel ${voiceChannel.name} in guild ${interaction.guild.name}`);

            } catch (error) {
                logger.error('Failed to join voice channel:', error);
                
                let errorMessage = 'Failed to join the voice channel.';
                if (error.message.includes('VOICE_CONNECTION_TIMEOUT')) {
                    errorMessage = 'Connection timed out while trying to join the voice channel.';
                } else if (error.message.includes('VOICE_CHANNEL_FULL')) {
                    errorMessage = 'The voice channel is full.';
                }

                const embed = uiHandler.createErrorEmbed(
                    'Connection Failed',
                    errorMessage + ' Please try again.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            logger.error('Join command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while joining the voice channel.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
