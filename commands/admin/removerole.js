const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { updateUserRole, getUser } = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Remove a role from a user (Super Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to remove role from')
                .setRequired(true)),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const uiHandler = new UIHandler();

            // Check if user has super admin privileges
            const userRole = await permissionHandler.getUserRole(interaction.user.id);
            if (userRole !== permissionHandler.roles.SUPER_ADMIN) {
                const embed = uiHandler.createErrorEmbed(
                    'Access Denied',
                    'Only Super Admins can remove roles.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');

            // Prevent removing role from self
            if (targetUser.id === interaction.user.id) {
                const embed = uiHandler.createErrorEmbed(
                    'Invalid Operation',
                    'You cannot remove your own role.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            try {
                // Get current user data
                const userData = await getUser(targetUser.id);
                if (!userData) {
                    const embed = uiHandler.createErrorEmbed(
                        'User Not Found',
                        'User not found in the database.'
                    );
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const currentRole = userData.role;
                const currentRoleDisplayName = await permissionHandler.getRoleDisplayName(currentRole);

                // Check if user can remove this role
                if (!permissionHandler.canManageRole(userRole, currentRole)) {
                    const embed = uiHandler.createErrorEmbed(
                        'Cannot Remove Role',
                        `You do not have permission to remove the ${currentRoleDisplayName} role.`
                    );
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Update user role to normal
                await updateUserRole(targetUser.id, permissionHandler.roles.NORMAL, null);

                const embed = uiHandler.createSuccessEmbed(
                    'Role Removed',
                    `Successfully removed **${currentRoleDisplayName}** role from ${targetUser}.\n` +
                    `They are now a **👤 Normal User**.`
                );

                await interaction.reply({ embeds: [embed] });

                // Log the action
                console.log(`Role ${currentRole} removed from ${targetUser.username} by ${interaction.user.username}`);

            } catch (error) {
                console.error('Database error in removerole:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to remove role due to database error.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Removerole command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while removing the role.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
