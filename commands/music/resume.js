const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),

    async execute(bot, interaction) {
        try {
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            if (!musicPlayer.isPlaying && !musicPlayer.isPaused) {
                const embed = uiHandler.createErrorEmbed(
                    'Nothing to Resume',
                    'There is no paused song to resume.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (!musicPlayer.isPaused) {
                const embed = uiHandler.createErrorEmbed(
                    'Already Playing',
                    'The song is already playing.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const success = musicHandler.resumeAudio(interaction.guild.id);

            if (success) {
                const embed = uiHandler.createSuccessEmbed(
                    'Music Resumed',
                    `▶️ **${musicPlayer.currentSong?.title || 'Current song'}** has been resumed.`
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Resume Failed',
                    'Failed to resume the music.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Resume command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while resuming the music.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
