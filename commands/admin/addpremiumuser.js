const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { createOrUpdateUser, updateUserRole } = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addpremiumuser')
        .setDescription('Add premium role to a user with time limit')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to grant premium access')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Duration in days')
                .setMinValue(1)
                .setMaxValue(365)
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
                    'You do not have permission to grant premium access.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');
            const days = interaction.options.getInteger('days');

            // Calculate expiry time
            const expiresAt = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);

            try {
                // Create or update user in database
                await createOrUpdateUser({
                    id: targetUser.id,
                    username: targetUser.username,
                    discriminator: targetUser.discriminator
                });

                // Update user role to premium with expiry
                await updateUserRole(targetUser.id, permissionHandler.roles.PREMIUM, expiresAt);

                const embed = uiHandler.createSuccessEmbed(
                    'Premium Access Granted',
                    `Successfully granted **💎 Premium** access to ${targetUser}.\n\n` +
                    `⏰ **Duration:** ${days} day${days > 1 ? 's' : ''}\n` +
                    `📅 **Expires:** <t:${expiresAt}:F>\n` +
                    `⏳ **Relative:** <t:${expiresAt}:R>\n\n` +
                    `🎵 They now have unlimited access to all music features!`
                );

                await interaction.reply({ embeds: [embed] });

                // Log the action
                console.log(`Premium access granted to ${targetUser.username} for ${days} days by ${interaction.user.username}`);

                // Try to DM the user about their premium access
                try {
                    const dmEmbed = uiHandler.createSuccessEmbed(
                        'Premium Access Granted!',
                        `🎉 You have been granted **💎 Premium** access to LyraBot!\n\n` +
                        `⏰ **Duration:** ${days} day${days > 1 ? 's' : ''}\n` +
                        `📅 **Expires:** <t:${expiresAt}:F>\n\n` +
                        `🎵 **Premium Benefits:**\n` +
                        `• Unlimited music commands\n` +
                        `• Access to advanced features\n` +
                        `• Playlist management\n` +
                        `• Priority support\n\n` +
                        `Enjoy your premium experience! 🎶`
                    );

                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    // User has DMs disabled, ignore
                    console.log(`Could not DM premium notification to ${targetUser.username}`);
                }

            } catch (error) {
                console.error('Database error in addpremiumuser:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to grant premium access due to database error.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Addpremiumuser command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while granting premium access.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
