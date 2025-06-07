const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

class CustomEmbedBuilder {
    constructor() {
        this.embed = new EmbedBuilder();
    }

    static createDefault() {
        return new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    static createSuccess(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    static createError(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    static createWarning(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    static createInfo(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: config.footer.developer });
    }

    static createMusicEmbed(song, requesterUser = null, currentTime = 0) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎵 Now Playing')
            .setTimestamp();

        if (song) {
            // Add song thumbnail
            if (song.thumbnail) {
                embed.setThumbnail(song.thumbnail);
            }

            // Calculate progress
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
        }

        // Add requester info
        if (requesterUser) {
            embed.setAuthor({
                name: `Music Requested by ${requesterUser.username}`,
                iconURL: requesterUser.displayAvatarURL()
            });

            const footerText = config.footer.developer + '\n' + 
                             config.footer.requester.replace('{username}', requesterUser.username);
            embed.setFooter({ text: footerText });
        } else {
            embed.setFooter({ text: config.footer.developer });
        }

        return embed;
    }

    static createProgressBar(current, total, length = 20) {
        const percentage = total > 0 ? (current / total) : 0;
        const filledLength = Math.round(length * percentage);
        const emptyLength = length - filledLength;
        
        const filled = config.progressBar.filledChar.repeat(filledLength);
        const empty = config.progressBar.emptyChar.repeat(emptyLength);
        
        return `[${filled}${empty}]`;
    }

    static formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    static getPlatformEmoji(platform) {
        switch (platform?.toLowerCase()) {
            case 'youtube': return '📺';
            case 'spotify': return '🟢';
            case 'soundcloud': return '🟠';
            case 'radio': return '📻';
            default: return '🎵';
        }
    }

    static capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static createQueueEmbed(queue, currentSong = null, page = 1, itemsPerPage = 10) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📜 Music Queue')
            .setTimestamp()
            .setFooter({ text: config.footer.developer });

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
        return embed;
    }

    static createStatsEmbed(stats) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('📊 LyraBot Statistics')
            .setTimestamp()
            .setFooter({ text: config.footer.developer });

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

        return embed;
    }
}

module.exports = CustomEmbedBuilder;
