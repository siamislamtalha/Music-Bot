const { SlashCommandBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const { setSetting, getSetting } = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcontactlink')
        .setDescription('Set the contact admin button URL (Super Admin only)')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL for the contact admin button')
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
                    'Only Super Admins can change the contact link.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const newUrl = interaction.options.getString('url');

            // Basic URL validation
            try {
                new URL(newUrl);
            } catch (urlError) {
                const embed = uiHandler.createErrorEmbed(
                    'Invalid URL',
                    'Please provide a valid URL starting with http:// or https://'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            try {
                // Get current contact link
                const currentLink = await getSetting('contact_link');

                // Update contact link
                await setSetting('contact_link', newUrl);

                const embed = uiHandler.createSuccessEmbed(
                    'Contact Link Updated',
                    `Successfully updated the contact admin button URL.\n\n` +
                    `🔗 **New URL:** ${newUrl}\n` +
                    `🔗 **Previous URL:** ${currentLink || 'Not set'}\n\n` +
                    `This link will now be used when users reach their daily limits.`
                );

                await interaction.reply({ embeds: [embed] });

                // Log the action
                console.log(`Contact link updated to ${newUrl} by ${interaction.user.username}`);

            } catch (error) {
                console.error('Database error in setcontactlink:', error);
                const embed = uiHandler.createErrorEmbed(
                    'Database Error',
                    'Failed to update contact link due to database error.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Setcontactlink command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while updating the contact link.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
