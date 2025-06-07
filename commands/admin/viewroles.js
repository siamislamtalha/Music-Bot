const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { getUsersByRole } = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('viewroles')
        .setDescription('View users by role')
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Role to view')
                .addChoices(
                    { name: '🎖️ Super Admin', value: 'superadmin' },
                    { name: '🛡️ Admin', value: 'admin' },
                    { name: '🛠️ Moderator', value: 'moderator' },
                    { name: '💎 Premium', value: 'premium' },
                    { name: '👤 Normal', value: 'normal' }
                )
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
                    'You do not have permission to view user roles.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const roleToView = interaction.options.getString('role');

            // Non-super admins cannot view super admin list
            if (roleToView === permissionHandler.roles.SUPER_ADMIN && userRole !== permissionHandler.roles.SUPER_ADMIN) {
                const embed = uiHandler.createErrorEmbed(
                    'Access Denied',
                    'Only Super Admins can view the Super Admin list.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                const users = await getUsersByRole(roleToView);
                const roleDisplayName = await permissionHandler.getRoleDisplayName(roleToView);

                const embed = uiHandler.createRoleListEmbed(users, roleDisplayName);
                
                // Add additional info for premium users
                if (roleToView === permissionHandler.roles.PREMIUM && users.length > 0) {
                    const now = Math.floor(Date.now() / 1000);
                    const expiredCount = users.filter(user => user.premium_expires && user.premium_expires <= now).length;
                    const activeCount = users.length - expiredCount;

                    embed.addFields([
                        {
                            name: '📊 Statistics',
                            value: `**Active:** ${activeCount}\n**Expired:** ${expiredCount}\n**Total:** ${users.length}`,
                            inline: true
                        }
                    ]);
                }

                await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('Database error in viewroles:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to retrieve user roles from database.'
                );
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Viewroles command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while retrieving role information.'
            );
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};
