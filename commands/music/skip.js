const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the currently playing song'),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            // Check permissions and usage limits
            const canUse = await permissionHandler.canUseCommand(
                interaction.user.id,
                interaction.guild.id,
                'skip'
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

            if (!musicPlayer.isPlaying) {
                const embed = uiHandler.createErrorEmbed(
                    'Nothing Playing',
                    'There is no song currently playing to skip.'
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const currentSong = musicPlayer.currentSong;
            const success = musicHandler.skipSong(interaction.guild.id);

            if (success) {
                // Increment usage for normal users
                if (canUse.reason !== 'Admin privileges' && canUse.reason !== 'Premium access') {
                    await permissionHandler.incrementUsage(interaction.user.id);
                }

                let description = `⏭️ **${currentSong?.title || 'Current song'}** has been skipped.`;
                
                if (musicPlayer.queue.length > 0) {
                    description += `\n\n🎵 **Next:** ${musicPlayer.queue[0]?.title || 'Unknown'}`;
                } else {
                    description += '\n\n📭 No more songs in queue.';
                }

                const embed = uiHandler.createSuccessEmbed('Song Skipped', description);
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Skip Failed',
                    'Failed to skip the current song.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Skip command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while skipping the song.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
