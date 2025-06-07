const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the music volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            // Check permissions and usage limits
            const canUse = await permissionHandler.canUseCommand(
                interaction.user.id,
                interaction.guild.id,
                'volume'
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

            const volume = interaction.options.getInteger('level');
            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            if (!musicPlayer.isPlaying && !musicPlayer.isPaused) {
                const embed = uiHandler.createErrorEmbed(
                    'Nothing Playing',
                    'There is no music currently playing.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const success = musicHandler.setVolume(interaction.guild.id, volume);

            if (success) {
                // Increment usage for normal users
                if (canUse.reason !== 'Admin privileges' && canUse.reason !== 'Premium access') {
                    await permissionHandler.incrementUsage(interaction.user.id);
                }

                const volumeBar = '🔊'.repeat(Math.floor(volume / 20)) + '🔈'.repeat(5 - Math.floor(volume / 20));
                
                const embed = uiHandler.createSuccessEmbed(
                    'Volume Updated',
                    `🔊 Volume set to **${volume}%**\n${volumeBar}`
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Volume Failed',
                    'Failed to set the volume.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Volume command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while setting the volume.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
