const { SlashCommandBuilder } = require('discord.js');
const MusicHandler = require('../../handlers/musicHandler');
const UIHandler = require('../../handlers/uiHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode for music playback')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .addChoices(
                    { name: 'Off', value: 'none' },
                    { name: 'Current Song', value: 'song' },
                    { name: 'Queue', value: 'queue' }
                )),

    async execute(bot, interaction) {
        try {
            const musicHandler = new MusicHandler(bot);
            const uiHandler = new UIHandler();

            const mode = interaction.options.getString('mode');
            const musicPlayer = bot.getMusicPlayer(interaction.guild.id);

            // If no mode specified, show current loop status
            if (!mode) {
                let loopStatus = '';
                switch (musicPlayer.loop) {
                    case 'none':
                        loopStatus = '🔄 **Loop:** Off';
                        break;
                    case 'song':
                        loopStatus = '🔂 **Loop:** Current Song';
                        break;
                    case 'queue':
                        loopStatus = '🔁 **Loop:** Queue';
                        break;
                }

                const embed = uiHandler.createInfoEmbed('Loop Status', loopStatus);
                return await interaction.reply({ embeds: [embed] });
            }

            const success = musicHandler.setLoopMode(interaction.guild.id, mode);

            if (success) {
                let description = '';
                let emoji = '';

                switch (mode) {
                    case 'none':
                        description = 'Loop has been **disabled**.';
                        emoji = '🔄';
                        break;
                    case 'song':
                        description = 'Now looping the **current song**.';
                        emoji = '🔂';
                        break;
                    case 'queue':
                        description = 'Now looping the **entire queue**.';
                        emoji = '🔁';
                        break;
                }

                const embed = uiHandler.createSuccessEmbed(
                    'Loop Mode Updated',
                    `${emoji} ${description}`
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = uiHandler.createErrorEmbed(
                    'Loop Failed',
                    'Failed to set loop mode.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Loop command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while setting loop mode.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
