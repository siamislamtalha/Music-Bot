const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const MusicHandler = require('../../handlers/musicHandler');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { createOrUpdateUser, addSongToHistory } = require('../../database/database');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube, Spotify, or SoundCloud')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name, artist, or URL')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Platform to search on')
                .addChoices(
                    { name: 'Auto', value: 'auto' },
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'Spotify', value: 'spotify' },
                    { name: 'SoundCloud', value: 'soundcloud' }
                )),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const musicHandler = bot.musicHandler;
            const uiHandler = new UIHandler();

            if (!interaction.member.voice.channel) {
                return interaction.reply({ content: '❌ You need to be in a voice channel to play music.', ephemeral: true });
            }

            const query = interaction.options.getString('query');
            const platform = interaction.options.getString('platform') || 'auto';

            await interaction.deferReply();

            const song = await musicHandler.search(query, platform);
            if (!song) {
                return interaction.editReply({ content: '❌ No results found for that song. Please try a different query or URL.' });
            }

            const player = await musicHandler.kazagumo.createPlayer({
                guildId: interaction.guild.id,
                voiceId: interaction.member.voice.channel.id,
                textId: interaction.channel.id,
                deaf: true
            });

            if (player.state !== 'CONNECTED') await player.connect();
            player.queue.add(song.trackObject);
            if (!player.playing && !player.paused) player.play();

            await addSongToHistory(interaction.user.id, song.title, song.url, song.platform);

            return interaction.editReply({
                embeds: [uiHandler.createNowPlayingEmbed(song, interaction.user)]
            });
        } catch (error) {
            logger.error(`Play command error: ${error.message}`);
            return interaction.editReply({ content: '❌ Failed to play the song. Please try again later.' });
        }
    }
};
