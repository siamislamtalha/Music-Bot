const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { createOrUpdateUser, updateUserRole } = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Assign a role to a user (Super Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to assign role to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Role to assign')
                .addChoices(
                    { name: '🎖️ Super Admin', value: 'superadmin' },
                    { name: '🛡️ Admin', value: 'admin' },
                    { name: '🛠️ Moderator', value: 'moderator' },
                    { name: '💎 Premium', value: 'premium' }
                )
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Duration in days (only for premium role)')
                .setMinValue(1)
                .setMaxValue(365)),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const uiHandler = new UIHandler();

            // Check if user has super admin privileges
            const userRole = await permissionHandler.getUserRole(interaction.user.id);
            if (userRole !== permissionHandler.roles.SUPER_ADMIN) {
                const embed = uiHandler.createErrorEmbed(
                    'Access Denied',
                    'Only Super Admins can assign roles.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');
            const roleToAssign = interaction.options.getString('role');
            const days = interaction.options.getInteger('days');

            // Prevent self-assignment except for super admin
            if (targetUser.id === interaction.user.id && roleToAssign !== permissionHandler.roles.SUPER_ADMIN) {
                const embed = uiHandler.createErrorEmbed(
                    'Invalid Operation',
                    'You cannot assign roles to yourself.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Check if role assignment is valid
            if (!permissionHandler.canAssignRole(userRole, roleToAssign)) {
                const embed = uiHandler.createErrorEmbed(
                    'Invalid Role Assignment',
                    'You do not have permission to assign this role.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // For premium role, calculate expiry time if days specified
            let expiresAt = null;
            if (roleToAssign === permissionHandler.roles.PREMIUM && days) {
                expiresAt = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
            }

            try {
                // Create or update user in database
                await createOrUpdateUser({
                    id: targetUser.id,
                    username: targetUser.username,
                    discriminator: targetUser.discriminator,
                    role: roleToAssign
                });

                // Update user role
                await updateUserRole(targetUser.id, roleToAssign, expiresAt);

                const roleDisplayName = await permissionHandler.getRoleDisplayName(roleToAssign);
                let description = `Successfully assigned **${roleDisplayName}** role to ${targetUser}.`;

                if (expiresAt) {
                    description += `\n⏰ **Expires:** <t:${expiresAt}:F> (<t:${expiresAt}:R>)`;
                }

                const embed = uiHandler.createSuccessEmbed(
                    'Role Assigned',
                    description
                );

                await interaction.reply({ embeds: [embed] });

                // Log the action
                console.log(`Role ${roleToAssign} assigned to ${targetUser.username} by ${interaction.user.username}`);

            } catch (error) {
                console.error('Database error in addrole:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to assign role due to database error.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Addrole command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while assigning the role.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
