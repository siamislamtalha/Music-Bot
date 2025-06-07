const { SlashCommandBuilder } = require('discord.js');
const UIHandler = require('../../handlers/uiHandler');
const PermissionHandler = require('../../handlers/permissionHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setMinValue(1)),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const uiHandler = new UIHandler();

            // Check permissions and usage limits
            const canUse = await permissionHandler.canUseCommand(
                interaction.user.id,
                interaction.guild.id,
                'queue'
            );

            if (!canUse.allowed && canUse.reason === 'Daily limit reached') {
                const embed = uiHandler.createLimitReachedEmbed(canUse.resetTime);
                const contactButton = await uiHandler.createContactAdminButton();
                return await interaction.reply({ 
                    embeds: [embed], 
                    components: [contactButton],
                    ephemeral: true 
                });
            }

            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);
            const page = interaction.options.getInteger('page') || 1;
            const itemsPerPage = 10;

            // Increment usage for normal users
            if (canUse.reason !== 'Admin privileges' && canUse.reason !== 'Premium access') {
                await permissionHandler.incrementUsage(interaction.user.id);
            }

            const queueEmbed = uiHandler.createQueueEmbed(
                musicPlayer.queue,
                musicPlayer.currentSong,
                page,
                itemsPerPage
            );

            const totalPages = Math.ceil(musicPlayer.queue.length / itemsPerPage);
            const components = [];

            if (totalPages > 1) {
                const paginationButtons = uiHandler.createPaginationButtons(page, totalPages);
                if (paginationButtons) {
                    components.push(paginationButtons);
                }
            }

            await interaction.reply({ 
                embeds: [queueEmbed], 
                components: components 
            });

        } catch (error) {
            console.error('Queue command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while showing the queue.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
