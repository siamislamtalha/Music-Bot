const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the currently playing song'),

    async execute(bot, interaction) {
        try {
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            if (!musicPlayer.isPlaying) {
                const embed = uiHandler.createErrorEmbed(
                    'Nothing Playing',
                    'There is no song currently playing.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (musicPlayer.isPaused) {
                const embed = uiHandler.createErrorEmbed(
                    'Already Paused',
                    'The song is already paused.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const success = musicHandler.pauseAudio(interaction.guild.id);

            if (success) {
                const embed = uiHandler.createSuccessEmbed(
                    'Music Paused',
                    `⏸️ **${musicPlayer.currentSong?.title || 'Current song'}** has been paused.`
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Pause Failed',
                    'Failed to pause the music.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Pause command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while pausing the music.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
