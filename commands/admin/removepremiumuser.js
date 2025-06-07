const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { updateUserRole, getUser } = require('../../database/database');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removepremiumuser')
        .setDescription('Remove premium status from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to remove premium from')
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
                    'You do not have permission to manage premium users.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');

            // Check if target user exists and has premium
            const userData = await getUser(targetUser.id);
            if (!userData || userData.role !== permissionHandler.roles.PREMIUM) {
                const embed = uiHandler.createErrorEmbed(
                    'No Premium Status',
                    `${targetUser.username} does not have premium status.`
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Remove premium status (downgrade to normal user)
                await updateUserRole(targetUser.id, permissionHandler.roles.NORMAL, null);

                const embed = uiHandler.createSuccessEmbed(
                    'Premium User Removed',
                    `Successfully removed premium access from **${targetUser.username}**\n\n` +
                    `👤 **User:** <@${targetUser.id}>\n` +
                    `📅 **Removed by:** ${interaction.user.username}\n` +
                    `🔄 **New Role:** Normal User`
                );

                await interaction.editReply({ embeds: [embed] });

                // Log the action
                logger.info(`Premium user removed: ${targetUser.username} (${targetUser.id}) by ${interaction.user.username}`);

                // Try to notify the user
                try {
                    const notificationEmbed = uiHandler.createWarningEmbed(
                        '⚠️ Premium Access Removed',
                        `Your premium access to LyraBot has been removed.\n\n` +
                        `📋 **Changes:**\n` +
                        `• Daily command limits now apply\n` +
                        `• Limited to 5 advanced commands per day\n` +
                        `• Basic features remain available\n\n` +
                        `💡 Contact an admin if you believe this is an error.`
                    );

                    await targetUser.send({ embeds: [notificationEmbed] });
                    logger.info(`Premium removal notification sent to ${targetUser.username}`);
                } catch (dmError) {
                    logger.warn(`Could not notify ${targetUser.username}: ${dmError.message}`);
                }

            } catch (error) {
                logger.error('Database error in removepremiumuser:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to remove premium status from user. Please try again.'
                );
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in removepremiumuser command:', error);
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