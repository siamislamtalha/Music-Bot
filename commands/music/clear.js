const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the music queue'),

    async execute(bot, interaction) {
        try {
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            if (musicPlayer.queue.length === 0) {
                const embed = uiHandler.createErrorEmbed(
                    'Queue Empty',
                    'The queue is already empty.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const queueSize = musicPlayer.queue.length;
            const success = musicHandler.clearQueue(interaction.guild.id);

            if (success) {
                const embed = uiHandler.createSuccessEmbed(
                    'Queue Cleared',
                    `🗑️ Cleared **${queueSize}** songs from the queue.`
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Clear Failed',
                    'Failed to clear the queue.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Clear command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while clearing the queue.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
