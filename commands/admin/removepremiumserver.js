const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { updateServerPremium, getServer } = require('../../database/database');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removepremiumserver')
        .setDescription('Remove premium status from a server')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('Server ID to remove premium from')
                .setRequired(true)),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const uiHandler = new UIHandler();

            // Check if user has appropriate privileges
            const userRole = await permissionHandler.getUserRole(interaction.user.id);
            const allowedRoles = [
                permissionHandler.roles.SUPER_ADMIN,
                permissionHandler.roles.ADMIN,
                permissionHandler.roles.MODERATOR
            ];

            if (!allowedRoles.includes(userRole)) {
                const embed = uiHandler.createErrorEmbed(
                    'Access Denied',
                    'You do not have permission to manage premium servers.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const serverId = interaction.options.getString('server_id');

            await interaction.deferReply();

            try {
                // Check if server exists in bot's cache
                const guild = bot.client.guilds.cache.get(serverId);
                const serverName = guild ? guild.name : `Server ${serverId}`;

                // Check if server has premium status
                const serverData = await getServer(serverId);
                if (!serverData || !serverData.premium_expires) {
                    const embed = uiHandler.createErrorEmbed(
                        'No Premium Status',
                        `Server **${serverName}** does not have premium status.`
                    );
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Remove premium status (set expires to null)
                await updateServerPremium(serverId, serverName, null);

                const embed = uiHandler.createSuccessEmbed(
                    'Premium Server Removed',
                    `Successfully removed premium access from **${serverName}**\n\n` +
                    `🆔 **Server ID:** ${serverId}\n` +
                    `📅 **Removed by:** ${interaction.user.username}`
                );

                await interaction.editReply({ embeds: [embed] });

                // Log the action
                logger.info(`Premium server removed: ${serverName} (${serverId}) by ${interaction.user.username}`);

                // Try to notify server owner if possible
                if (guild) {
                    try {
                        const owner = await guild.fetchOwner();
                        const notificationEmbed = uiHandler.createWarningEmbed(
                            '⚠️ Server Premium Removed',
                            `Premium access for **${serverName}** has been removed.\n\n` +
                            `📋 **Changes:**\n` +
                            `• Members now have daily command limits\n` +
                            `• Basic features only\n` +
                            `• Premium features disabled\n\n` +
                            `💡 Contact an admin to restore premium access.`
                        );

                        await owner.send({ embeds: [notificationEmbed] });
                        logger.info(`Premium removal notification sent to ${serverName} owner`);
                    } catch (dmError) {
                        logger.warn(`Could not notify ${serverName} owner: ${dmError.message}`);
                    }
                }

            } catch (error) {
                logger.error('Database error in removepremiumserver:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to remove premium status from server. Please try again.'
                );
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in removepremiumserver command:', error);
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