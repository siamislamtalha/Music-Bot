const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { updateServerPremium, getServer } = require('../../database/database');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addpremiumserver')
        .setDescription('Add premium status to a server')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('Server ID to grant premium to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Number of days for premium access')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(365)),

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
            const days = interaction.options.getInteger('days');

            await interaction.deferReply();

            try {
                // Check if server exists in bot's cache
                const guild = bot.client.guilds.cache.get(serverId);
                const serverName = guild ? guild.name : `Server ${serverId}`;

                // Calculate expiry date
                const now = Math.floor(Date.now() / 1000);
                const expiresAt = now + (days * 24 * 60 * 60);

                // Update server premium status in database
                await updateServerPremium(serverId, serverName, expiresAt);

                const embed = uiHandler.createSuccessEmbed(
                    'Premium Server Added',
                    `Successfully granted premium access to **${serverName}**\n\n` +
                    `📅 **Duration:** ${days} days\n` +
                    `⏰ **Expires:** <t:${expiresAt}:F>\n` +
                    `🆔 **Server ID:** ${serverId}`
                );

                await interaction.editReply({ embeds: [embed] });

                // Log the action
                logger.info(`Premium server added: ${serverName} (${serverId}) for ${days} days by ${interaction.user.username}`);

                // Try to notify server owner if possible
                if (guild) {
                    try {
                        const owner = await guild.fetchOwner();
                        const notificationEmbed = uiHandler.createSuccessEmbed(
                            '🏆 Server Premium Activated',
                            `Your server **${serverName}** has been granted premium access!\n\n` +
                            `✨ **Benefits:**\n` +
                            `• Unlimited commands for all members\n` +
                            `• Premium features enabled\n` +
                            `• Priority support\n\n` +
                            `📅 **Expires:** <t:${expiresAt}:F>\n` +
                            `💝 Enjoy your premium experience!`
                        );

                        await owner.send({ embeds: [notificationEmbed] });
                        logger.info(`Premium notification sent to ${serverName} owner`);
                    } catch (dmError) {
                        logger.warn(`Could not notify ${serverName} owner: ${dmError.message}`);
                    }
                }

            } catch (error) {
                logger.error('Database error in addpremiumserver:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to add premium status to server. Please try again.'
                );
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in addpremiumserver command:', error);
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