const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),

    async execute(bot, interaction) {
        try {
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            if (!musicPlayer.isPlaying && !musicPlayer.isPaused) {
                const embed = uiHandler.createErrorEmbed(
                    'Nothing Playing',
                    'There is no music currently playing.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const success = musicHandler.stopAudio(interaction.guild.id);

            if (success) {
                // Clear progress interval
                if (musicPlayer.progressInterval) {
                    clearInterval(musicPlayer.progressInterval);
                    musicPlayer.progressInterval = null;
                }

                const embed = uiHandler.createSuccessEmbed(
                    'Music Stopped',
                    '⏹️ Music has been stopped and queue has been cleared.'
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Stop Failed',
                    'Failed to stop the music.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Stop command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while stopping the music.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
