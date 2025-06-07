const { SlashCommandBuilder } = require('discord.js');
const UIHandler = require('../../handlers/uiHandler');
const PermissionHandler = require('../../handlers/permissionHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show information about the currently playing song'),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const uiHandler = new UIHandler();

            // Check permissions and usage limits
            const canUse = await permissionHandler.canUseCommand(
                interaction.user.id,
                interaction.guild.id,
                'nowplaying'
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

            if (!musicPlayer.currentSong) {
                const embed = uiHandler.createInfoEmbed(
                    'Nothing Playing',
                    'There is no song currently playing.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Increment usage for normal users
            if (canUse.reason !== 'Admin privileges' && canUse.reason !== 'Premium access') {
                await permissionHandler.incrementUsage(interaction.user.id);
            }

            // Create now playing embed with current progress
            const currentTime = 0; // This would be calculated based on actual playback time
            const embed = await uiHandler.createNowPlayingEmbed(
                musicPlayer.currentSong,
                currentTime,
                interaction.user
            );

            const controlButtons = uiHandler.createMusicControlButtons();

            await interaction.reply({ 
                embeds: [embed], 
                components: controlButtons 
            });

        } catch (error) {
            console.error('Now playing command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while showing current song information.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
