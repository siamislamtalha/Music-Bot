const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const MusicHandler = require('../../handlers/musicHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playytlive')
        .setDescription('Play a YouTube livestream')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube livestream URL')
                .setRequired(true)),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const uiHandler = new UIHandler();
            const musicHandler = new MusicHandler(bot);

            // Check permissions and usage limits
            const canUse = await permissionHandler.canUseCommand(
                interaction.user.id,
                interaction.guild.id,
                'playytlive'
            );

            if (!canUse.allowed) {
                if (canUse.reason === 'Daily limit reached') {
                    const embed = uiHandler.createLimitReachedEmbed(canUse.resetTime);
                    const contactButton = await uiHandler.createContactAdminButton();
                    return await interaction.reply({ 
                        embeds: [embed], 
                        components: [contactButton],
                        ephemeral: true 
                    });
                } else {
                    const embed = uiHandler.createErrorEmbed(
                        'Access Denied',
                        canUse.reason
                    );
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }

            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                const embed = uiHandler.createErrorEmbed(
                    'Voice Channel Required',
                    'You need to be in a voice channel to play music!'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const url = interaction.options.getString('url');
            
            // Validate YouTube URL
            const ytdl = require('ytdl-core');
            if (!ytdl.validateURL(url)) {
                const embed = uiHandler.createErrorEmbed(
                    'Invalid URL',
                    'Please provide a valid YouTube URL.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Get video info to check if it's a livestream
                const info = await ytdl.getInfo(url);
                
                if (!info.videoDetails.isLive && !info.videoDetails.isLiveContent) {
                    const embed = uiHandler.createErrorEmbed(
                        'Not a Livestream',
                        'This URL does not appear to be a YouTube livestream.'
                    );
                    return await interaction.editReply({ embeds: [embed] });
                }

                const song = {
                    title: info.videoDetails.title,
                    url: url,
                    duration: 0, // Livestreams don't have fixed duration
                    thumbnail: info.videoDetails.thumbnails[0]?.url,
                    platform: 'youtube',
                    isLive: true,
                    requester: interaction.user
                };

                // Create voice connection if needed
                if (!bot.voiceConnections.has(interaction.guild.id)) {
                    await bot.createVoiceConnection(voiceChannel);
                }

                const musicPlayer = bot.getMusicPlayer(interaction.guild.id);
                musicPlayer.textChannel = interaction.channel;

                // Play the livestream
                await musicHandler.playAudio(interaction.guild.id, song);

                // Create now playing embed
                const embed = await uiHandler.createNowPlayingEmbed(song, 0, interaction.user);
                const buttons = uiHandler.createMusicControlButtons();

                await interaction.editReply({ 
                    embeds: [embed], 
                    components: [buttons] 
                });

                // Increment usage for non-premium users
                if (canUse.reason !== 'Admin privileges' && canUse.reason !== 'Premium access') {
                    await permissionHandler.incrementUsage(interaction.user.id);
                }

                logger.logMusic('livestream_started', {
                    user: interaction.user.username,
                    guild: interaction.guild.name,
                    url: url,
                    title: song.title
                });

            } catch (error) {
                logger.error('Error playing YouTube livestream:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Playback Error',
                    'Failed to play the YouTube livestream. Please try again.'
                );
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in playytlive command:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while processing the command.'
            );
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};