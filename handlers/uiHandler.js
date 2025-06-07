const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config');
const { getSetting } = require('../database/database');

class UIHandler {
    constructor() {
        this.progressBarLength = config.progressBar.length;
        this.filledChar = config.progressBar.filledChar;
        this.emptyChar = config.progressBar.emptyChar;
    }

    createProgressBar(current, total) {
        const percentage = total > 0 ? (current / total) : 0;
        const filledLength = Math.round(this.progressBarLength * percentage);
        const emptyLength = this.progressBarLength - filledLength;
        
        const filled = this.filledChar.repeat(filledLength);
        const empty = this.emptyChar.repeat(emptyLength);
        
        return `[${filled}${empty}]`;
    }

    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    async createNowPlayingEmbed(song, currentTime = 0, requesterUser = null) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎵 Now Playing')
            .setTimestamp();

        if (song) {
            // Song thumbnail in header
            if (song.thumbnail) {
                embed.setThumbnail(song.thumbnail);
            }

            const progressBar = this.createProgressBar(currentTime, song.duration || 0);
            const currentTimeStr = this.formatDuration(currentTime);
            const totalTimeStr = this.formatDuration(song.duration || 0);

            embed.addFields([
                {
                    name: '🎵 Song',
                    value: song.title || 'Unknown',
                    inline: true
                },
                {
                    name: '⏱️ Duration',
                    value: `${currentTimeStr} / ${totalTimeStr}`,
                    inline: true
                },
                {
                    name: '🔊 Volume',
                    value: '80%', // This would be dynamic based on actual volume
                    inline: true
                },
                {
                    name: '📱 Source',
                    value: this.getPlatformEmoji(song.platform) + ' ' + this.capitalizeFirst(song.platform),
                    inline: true
                },
                {
                    name: '📊 Progress',
                    value: `${progressBar} ${currentTimeStr}/${totalTimeStr}`,
                    inline: false
                }
            ]);
        } else {
            embed.setDescription('No song currently playing');
        }

        // Footer with developer and requester info
        let footerText = config.footer.developer;
        if (requesterUser) {
            footerText += '\n' + config.footer.requester.replace('{username}', requesterUser.username);
        }
        embed.setFooter({ text: footerText });

        // Add requester's profile picture above footer
        if (requesterUser && requesterUser.displayAvatarURL) {
            embed.setAuthor({
                name: `Music Requested by ${requesterUser.username}`,
                iconURL: requesterUser.displayAvatarURL()
            });
        }

        return embed;
    }

    createMusicControlButtons() {
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setLabel('⏮️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setLabel('⏸️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_resume')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('⏹️')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setLabel('🔀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('📜 Queue')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_lyrics')
                    .setLabel('📝 Lyrics')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_volume')
                    .setLabel('🔊 Volume')
                    .setStyle(ButtonStyle.Secondary)
            );

        return [row1, row2];
    }

    async createContactAdminButton() {
        const contactLink = await getSetting('contact_link') || config.defaultContactLink;
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('📞 Contact Admin')
                    .setStyle(ButtonStyle.Link)
                    .setURL(contactLink)
            );

        return row;
    }

    createQueueEmbed(queue, currentSong = null, page = 1, itemsPerPage = 10) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📜 Music Queue')
            .setTimestamp();

        let description = '';
        
        if (currentSong) {
            description += `🎵 **Now Playing:**\n${currentSong.title}\n\n`;
        }

        if (queue.length === 0) {
            description += '🔇 Queue is empty';
        } else {
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, queue.length);
            const totalPages = Math.ceil(queue.length / itemsPerPage);

            description += `📋 **Upcoming Songs (${queue.length} total):**\n`;
            
            for (let i = startIndex; i < endIndex; i++) {
                const song = queue[i];
                const duration = this.formatDuration(song.duration || 0);
                description += `**${i + 1}.** ${song.title} \`[${duration}]\`\n`;
            }

            if (totalPages > 1) {
                description += `\n📄 Page ${page}/${totalPages}`;
            }
        }

        embed.setDescription(description);
        embed.setFooter({ text: config.footer.developer });

        return embed;
    }

    createRoleListEmbed(users, role) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`👥 Users with ${role} role`)
            .setTimestamp();

        if (users.length === 0) {
            embed.setDescription('No users found with this role.');
        } else {
            let description = '';
            users.forEach((user, index) => {
                const expiryText = user.premium_expires ? 
                    ` (expires <t:${user.premium_expires}:R>)` : '';
                description += `**${index + 1}.** ${user.username}#${user.discriminator}${expiryText}\n`;
            });
            embed.setDescription(description);
        }

        embed.setFooter({ text: config.footer.developer });
        return embed;
    }

    createStatsEmbed(stats) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('📊 LyraBot Statistics')
            .setTimestamp();

        embed.addFields([
            {
                name: '🎵 Total Songs Played',
                value: stats.totalSongs?.toString() || '0',
                inline: true
            },
            {
                name: '👥 Active Users',
                value: stats.activeUsers?.toString() || '0',
                inline: true
            },
            {
                name: '🏠 Servers',
                value: stats.totalServers?.toString() || '0',
                inline: true
            },
            {
                name: '💎 Premium Users',
                value: stats.premiumUsers?.toString() || '0',
                inline: true
            },
            {
                name: '🏆 Premium Servers',
                value: stats.premiumServers?.toString() || '0',
                inline: true
            },
            {
                name: '⏰ Uptime',
                value: stats.uptime || '0 seconds',
                inline: true
            }
        ]);

        embed.setFooter({ text: config.footer.developer });
        return embed;
    }

    createLimitReachedEmbed(resetTime) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('⚠️ Daily Limit Reached')
            .setDescription('You have reached your daily limit for advanced commands.')
            .addFields([
                {
                    name: '🔄 Next Reset',
                    value: `<t:${resetTime}:R>`,
                    inline: true
                },
                {
                    name: '💡 Tip',
                    value: 'Upgrade to Premium for unlimited access!',
                    inline: true
                }
            ])
            .setTimestamp()
            .setFooter({ text: config.footer.developer });

        return embed;
    }

    createSuccessEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    createInfoEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    getPlatformEmoji(platform) {
        switch (platform?.toLowerCase()) {
            case 'youtube': return '📺';
            case 'spotify': return '🟢';
            case 'soundcloud': return '🟠';
            case 'radio': return '📻';
            default: return '🎵';
        }
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    createPaginationButtons(currentPage, totalPages) {
        const row = new ActionRowBuilder();

        if (currentPage > 1) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('page_previous')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (currentPage < totalPages) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('page_next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        return row.components.length > 0 ? row : null;
    }
}

module.exports = UIHandler;
