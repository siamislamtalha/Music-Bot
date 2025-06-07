const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { resetUserUsage, getUser } = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetlimits')
        .setDescription('Reset daily usage limits for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to reset limits for')
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
                    'You do not have permission to reset user limits.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');

            try {
                // Get current user data
                const userData = await getUser(targetUser.id);
                if (!userData) {
                    const embed = uiHandler.createErrorEmbed(
                        'User Not Found',
                        'User not found in the database. They need to use a command first.'
                    );
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const currentUsage = userData.daily_usage || 0;

                // Reset user usage
                await resetUserUsage(targetUser.id);

                const embed = uiHandler.createSuccessEmbed(
                    'Limits Reset',
                    `Successfully reset daily limits for ${targetUser}.\n\n` +
                    `📊 **Previous Usage:** ${currentUsage}/5 commands\n` +
                    `🔄 **New Usage:** 0/5 commands\n` +
                    `⏰ **Reset Time:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                    `The user can now use advanced commands again.`
                );

                await interaction.reply({ embeds: [embed] });

                // Log the action
                console.log(`Limits reset for ${targetUser.username} by ${interaction.user.username}`);

                // Try to notify the user
                try {
                    const dmEmbed = uiHandler.createSuccessEmbed(
                        'Usage Limits Reset',
                        `🔄 Your daily command limits have been reset by an admin!\n\n` +
                        `🎵 You can now use advanced music commands again.\n` +
                        `📊 **Available Uses:** 5/5 commands\n\n` +
                        `Enjoy using LyraBot! 🎶`
                    );

                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    // User has DMs disabled, ignore
                    console.log(`Could not DM limit reset notification to ${targetUser.username}`);
                }

            } catch (error) {
                console.error('Database error in resetlimits:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to reset limits due to database error.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Resetlimits command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while resetting user limits.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
