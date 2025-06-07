const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current music queue'),

    async execute(bot, interaction) {
        try {
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            if (musicPlayer.queue.length < 2) {
                const embed = uiHandler.createErrorEmbed(
                    'Cannot Shuffle',
                    'There must be at least 2 songs in the queue to shuffle.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const success = musicHandler.shuffleQueue(interaction.guild.id);

            if (success) {
                const embed = uiHandler.createSuccessEmbed(
                    'Queue Shuffled',
                    `🔀 Successfully shuffled **${musicPlayer.queue.length}** songs in the queue.`
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Shuffle Failed',
                    'Failed to shuffle the queue.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Shuffle command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while shuffling the queue.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
