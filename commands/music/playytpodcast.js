const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const MusicHandler = require('../../handlers/musicHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playytpodcast')
        .setDescription('Play a podcast from YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Podcast name or YouTube URL')
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
                'playytpodcast'
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
                    'You need to be in a voice channel to play podcasts!'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const query = interaction.options.getString('query');
            
            await interaction.deferReply();

            try {
                // Search for podcast content on YouTube
                let searchQuery = query;
                if (!query.includes('podcast')) {
                    searchQuery = `${query} podcast`;
                }

                const song = await musicHandler.searchYouTube(searchQuery);
                
                if (!song) {
                    const embed = uiHandler.createErrorEmbed(
                        'Podcast Not Found',
                        'Could not find the requested podcast on YouTube.'
                    );
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Add podcast metadata
                song.isPodcast = true;
                song.requester = interaction.user;

                // Create voice connection if needed
                if (!bot.voiceConnections.has(interaction.guild.id)) {
                    await bot.createVoiceConnection(voiceChannel);
                }

                const musicPlayer = bot.getMusicPlayer(interaction.guild.id);
                musicPlayer.textChannel = interaction.channel;

                // Add to queue or play immediately
                if (musicPlayer.isPlaying) {
                    musicHandler.addToQueue(interaction.guild.id, song);
                    const embed = uiHandler.createSuccessEmbed(
                        'Podcast Added to Queue',
                        `**${song.title}** has been added to the queue.`
                    );
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await musicHandler.playAudio(interaction.guild.id, song);
                    
                    // Create now playing embed
                    const embed = await uiHandler.createNowPlayingEmbed(song, 0, interaction.user);
                    const buttons = uiHandler.createMusicControlButtons();

                    await interaction.editReply({ 
                        embeds: [embed], 
                        components: [buttons] 
                    });
                }

                // Increment usage for non-premium users
                if (canUse.reason !== 'Admin privileges' && canUse.reason !== 'Premium access') {
                    await permissionHandler.incrementUsage(interaction.user.id);
                }

                logger.logMusic('podcast_started', {
                    user: interaction.user.username,
                    guild: interaction.guild.name,
                    query: query,
                    title: song.title
                });

            } catch (error) {
                logger.error('Error playing YouTube podcast:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Playback Error',
                    'Failed to play the podcast. Please try again.'
                );
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in playytpodcast command:', error);
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