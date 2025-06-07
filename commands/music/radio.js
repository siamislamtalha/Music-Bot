const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const MusicHandler = require('../../handlers/musicHandler');
const UIHandler = require('../../handlers/uiHandler');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription('Start continuous radio streaming')
        .addStringOption(option =>
            option.setName('genre')
                .setDescription('Radio genre')
                .addChoices(
                    { name: 'Pop', value: 'pop' },
                    { name: 'Rock', value: 'rock' },
                    { name: 'Jazz', value: 'jazz' },
                    { name: 'Classical', value: 'classical' },
                    { name: 'Electronic', value: 'electronic' },
                    { name: 'Chill', value: 'chill' },
                    { name: 'Lo-Fi', value: 'lofi' }
                )),

    async execute(bot, interaction) {
        try {
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            // Check if user is in a voice channel
            if (!interaction.member.voice.channel) {
                const embed = uiHandler.createErrorEmbed(
                    'Voice Channel Required',
                    'You need to be in a voice channel to start radio!'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            const genre = interaction.options.getString('genre') || 'pop';
            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);
            const voiceChannel = interaction.member.voice.channel;

            // Join voice channel if not already connected
            if (!musicPlayer.connection) {
                try {
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
                    logger.error('Failed to join voice channel:', error);
                    const embed = uiHandler.createErrorEmbed(
                        'Connection Failed',
                        'Failed to join the voice channel for radio.'
                    );
                    return await interaction.editReply({ embeds: [embed] });
                }
            }

            // Stop current music if playing
            if (musicPlayer.isPlaying) {
                musicHandler.stopAudio(interaction.guild.id);
            }

            // Start radio
            try {
                await musicHandler.playRandomRadio(interaction.guild.id, genre);

                const embed = uiHandler.createSuccessEmbed(
                    'Radio Started',
                    `📻 Now streaming **${genre.toUpperCase()}** radio!\n\n` +
                    `🎵 **Station:** ${genre.charAt(0).toUpperCase() + genre.slice(1)} Radio\n` +
                    `🔊 **Status:** Live streaming\n` +
                    `♾️ **Duration:** Continuous\n\n` +
                    `Use \`/stop\` to stop the radio.`
                );

                embed.setThumbnail('https://cdn.discordapp.com/attachments/123456789/123456789/radio-icon.png');

                await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                logger.error('Failed to start radio:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Radio Failed',
                    `Failed to start ${genre} radio. Please try again.`
                );
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Radio command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while starting the radio.'
            );
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};
