const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PermissionHandler = require('../../handlers/permissionHandler');
const UIHandler = require('../../handlers/uiHandler');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available commands and bot information')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Show commands for specific category')
                .addChoices(
                    { name: '🎵 Music Commands', value: 'music' },
                    { name: '🛡️ Admin Commands', value: 'admin' },
                    { name: '🔧 Utility Commands', value: 'utility' },
                    { name: '💎 Premium Features', value: 'premium' }
                )),

    async execute(bot, interaction) {
        try {
            const permissionHandler = new PermissionHandler();
            const uiHandler = new UIHandler();
            const category = interaction.options.getString('category');
            
            const userRole = await permissionHandler.getUserRole(interaction.user.id);
            const isServerPremium = await permissionHandler.checkServerPremium(interaction.guild.id);

            if (!category) {
                // Show main help embed with overview
                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🎵 LyraBot - Music Bot Help')
                    .setDescription(
                        `**Welcome to LyraBot!** 🎶\n\n` +
                        `LyraBot is a powerful Discord music bot with multi-platform support, ` +
                        `advanced role management, and premium features.\n\n` +
                        `**Your Role:** ${await permissionHandler.getRoleDisplayName(userRole)}\n` +
                        `**Server Premium:** ${isServerPremium ? '✅ Active' : '❌ Not Active'}`
                    )
                    .addFields([
                        {
                            name: '🎵 Music Commands',
                            value: 'Use `/help category:music` to see all music commands',
                            inline: true
                        },
                        {
                            name: '🛡️ Admin Commands',
                            value: 'Use `/help category:admin` to see admin commands',
                            inline: true
                        },
                        {
                            name: '🔧 Utility Commands',
                            value: 'Use `/help category:utility` to see utility commands',
                            inline: true
                        },
                        {
                            name: '💎 Premium Features',
                            value: 'Use `/help category:premium` to see premium features',
                            inline: true
                        },
                        {
                            name: '📱 Platforms Supported',
                            value: '📺 YouTube\n🟢 Spotify\n🟠 SoundCloud\n📻 Radio',
                            inline: true
                        },
                        {
                            name: '🎯 Quick Start',
                            value: '1. Join a voice channel\n2. Use `/play <song name>`\n3. Enjoy the music!',
                            inline: true
                        }
                    ])
                    .setThumbnail('https://cdn.discordapp.com/attachments/123456789/123456789/lyrabot-logo.png')
                    .setFooter({ text: config.footer.developer })
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed] });
            }

            // Show specific category commands
            let embed;
            switch (category) {
                case 'music':
                    embed = this.createMusicHelpEmbed(userRole, isServerPremium);
                    break;
                case 'admin':
                    embed = this.createAdminHelpEmbed(userRole);
                    break;
                case 'utility':
                    embed = this.createUtilityHelpEmbed();
                    break;
                case 'premium':
                    embed = this.createPremiumHelpEmbed(userRole, isServerPremium);
                    break;
                default:
                    embed = uiHandler.createErrorEmbed(
                        'Invalid Category',
                        'Please select a valid help category.'
                    );
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Help command error:', error);
            const uiHandler = new UIHandler();
            const embed = uiHandler.createErrorEmbed(
                'Command Error',
                'An error occurred while displaying help information.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    createMusicHelpEmbed(userRole, isServerPremium) {
        const isUnlimited = [
            'superadmin', 'admin', 'moderator', 'premium'
        ].includes(userRole) || isServerPremium;

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎵 Music Commands')
            .setDescription('Here are all available music commands:')
            .addFields([
                {
                    name: '🎵 Basic Playback',
                    value: 
                        '`/play` - Play a song from YouTube/Spotify/SoundCloud\n' +
                        '`/pause` - Pause the current song\n' +
                        '`/resume` - Resume the paused song\n' +
                        '`/stop` - Stop music and clear queue',
                    inline: false
                },
                {
                    name: `🎛️ Advanced Controls ${isUnlimited ? '' : '(Limited: 5/day)'}`,
                    value: 
                        '`/skip` - Skip to next song\n' +
                        '`/volume` - Set volume (1-100)\n' +
                        '`/queue` - Show current queue\n' +
                        '`/nowplaying` - Show current song info',
                    inline: false
                },
                {
                    name: '🔄 Queue Management',
                    value: 
                        '`/shuffle` - Shuffle the queue\n' +
                        '`/clear` - Clear the queue\n' +
                        '`/loop` - Set loop mode (off/song/queue)',
                    inline: false
                },
                {
                    name: '📻 Special Modes',
                    value: 
                        '`/radio` - Start radio streaming\n' +
                        '`/247mode` - Toggle 24/7 voice channel mode',
                    inline: false
                }
            ])
            .setFooter({ text: config.footer.developer })
            .setTimestamp();

        if (!isUnlimited) {
            embed.addFields([
                {
                    name: '⚠️ Usage Limits',
                    value: 
                        'As a normal user, you have:\n' +
                        '• **Unlimited:** play, pause, resume, stop, shuffle, clear, loop\n' +
                        '• **Limited (5/day):** skip, volume, queue, nowplaying, and advanced features\n\n' +
                        'Upgrade to Premium for unlimited access!',
                    inline: false
                }
            ]);
        }

        return embed;
    },

    createAdminHelpEmbed(userRole) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('🛡️ Admin Commands')
            .setTimestamp()
            .setFooter({ text: config.footer.developer });

        if (!['superadmin', 'admin', 'moderator'].includes(userRole)) {
            embed.setDescription('❌ You do not have access to admin commands.');
            return embed;
        }

        embed.setDescription('Here are the admin commands you have access to:');

        if (userRole === 'superadmin') {
            embed.addFields([
                {
                    name: '🎖️ Super Admin Only',
                    value: 
                        '`/addrole` - Assign roles to users\n' +
                        '`/removerole` - Remove roles from users\n' +
                        '`/setcontactlink` - Set contact admin button URL',
                    inline: false
                }
            ]);
        }

        if (['superadmin', 'admin', 'moderator'].includes(userRole)) {
            embed.addFields([
                {
                    name: '💎 Premium Management',
                    value: 
                        '`/addpremiumuser` - Grant premium to user\n' +
                        '`/addpremiumserver` - Grant premium to server\n' +
                        '`/resetlimits` - Reset user\'s daily limits',
                    inline: false
                },
                {
                    name: '👥 User Management',
                    value: 
                        '`/viewroles` - View users by role',
                    inline: false
                }
            ]);
        }

        return embed;
    },

    createUtilityHelpEmbed() {
        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('🔧 Utility Commands')
            .setDescription('Basic bot utility commands available to everyone:')
            .addFields([
                {
                    name: '🎵 Voice Channel',
                    value: 
                        '`/join` - Invite bot to your voice channel\n' +
                        '`/leave` - Remove bot from voice channel',
                    inline: false
                },
                {
                    name: '📋 Information',
                    value: 
                        '`/help` - Show this help menu\n' +
                        '`/toplisteners` - View top music listeners\n' +
                        '`/compareplaycount` - Compare your stats with others',
                    inline: false
                }
            ])
            .setFooter({ text: config.footer.developer })
            .setTimestamp();

        return embed;
    },

    createPremiumHelpEmbed(userRole, isServerPremium) {
        const hasPremium = ['superadmin', 'admin', 'moderator', 'premium'].includes(userRole) || isServerPremium;

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('💎 Premium Features')
            .setTimestamp()
            .setFooter({ text: config.footer.developer });

        if (hasPremium) {
            embed.setDescription('🎉 You have access to all premium features!')
                .addFields([
                    {
                        name: '🚀 Premium Benefits',
                        value: 
                            '• **Unlimited Commands** - No daily limits\n' +
                            '• **Advanced Features** - All music features unlocked\n' +
                            '• **Priority Support** - Faster response times\n' +
                            '• **Enhanced Audio** - Better quality streaming\n' +
                            '• **Playlist Management** - Save and manage playlists\n' +
                            '• **History Tracking** - View your music history',
                        inline: false
                    },
                    {
                        name: '🎵 Exclusive Features',
                        value: 
                            '• DJ-only commands\n' +
                            '• Audio filters and equalizer\n' +
                            '• AI music recommendations\n' +
                            '• Genre and mood filters\n' +
                            '• Lyrics fetching\n' +
                            '• Advanced queue management',
                        inline: false
                    }
                ]);
        } else {
            embed.setDescription('Upgrade to Premium to unlock these amazing features!')
                .addFields([
                    {
                        name: '💎 What You Get with Premium',
                        value: 
                            '• **No Limits** - Use all commands without daily restrictions\n' +
                            '• **Advanced Audio** - Filters, equalizer, and enhanced quality\n' +
                            '• **Smart Features** - AI recommendations and mood playlists\n' +
                            '• **Personal Data** - Playlists, history, and statistics\n' +
                            '• **Priority Access** - Faster response and better performance',
                        inline: false
                    },
                    {
                        name: '📞 How to Get Premium',
                        value: 
                            'Contact an admin or moderator to get premium access!\n' +
                            'Premium can be granted to individual users or entire servers.',
                        inline: false
                    }
                ]);
        }

        return embed;
    }
};
