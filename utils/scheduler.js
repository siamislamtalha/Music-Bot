const cron = require('node-cron');
const logger = require('./logger');
const { 
    getExpiredPremiumUsers, 
    getExpiredPremiumServers, 
    updateUserRole,
    updateServerPremium 
} = require('../database/database');
const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

function setupScheduler(bot) {
    logger.info('Setting up scheduled tasks...');

    // Check for expired premium users every hour
    cron.schedule('0 * * * *', async () => {
        try {
            logger.info('Checking for expired premium users...');
            await checkExpiredPremiumUsers(bot);
        } catch (error) {
            logger.error('Error in premium user expiry check:', error);
        }
    });

    // Check for expired premium servers every hour
    cron.schedule('0 * * * *', async () => {
        try {
            logger.info('Checking for expired premium servers...');
            await checkExpiredPremiumServers(bot);
        } catch (error) {
            logger.error('Error in premium server expiry check:', error);
        }
    });

    // Send expiry notifications (24 hours before expiry) - runs every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        try {
            logger.info('Checking for upcoming premium expiries...');
            await sendExpiryNotifications(bot);
        } catch (error) {
            logger.error('Error in expiry notifications:', error);
        }
    });

    // Clean up logs daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
        try {
            logger.info('Running daily log cleanup...');
            logger.cleanupOldLogs();
        } catch (error) {
            logger.error('Error in log cleanup:', error);
        }
    });

    // Update bot statistics every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        try {
            await updateBotStatistics(bot);
        } catch (error) {
            logger.error('Error updating bot statistics:', error);
        }
    });

    logger.info('✅ Scheduled tasks configured successfully');
}

async function checkExpiredPremiumUsers(bot) {
    try {
        const expiredUsers = await getExpiredPremiumUsers();
        
        for (const user of expiredUsers) {
            try {
                // Update user role to normal
                await updateUserRole(user.id, 'normal', null);
                
                logger.info(`Premium expired for user ${user.username} (${user.id})`);

                // Try to notify the user
                try {
                    const discordUser = await bot.client.users.fetch(user.id);
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('💎 Premium Access Expired')
                        .setDescription(
                            '⏰ Your premium access to LyraBot has expired.\n\n' +
                            '🎵 You are now back to normal user status with daily limits.\n' +
                            '💡 Contact an admin to renew your premium access!\n\n' +
                            'Thank you for using LyraBot! 🎶'
                        )
                        .setTimestamp()
                        .setFooter({ text: config.footer.developer });

                    await discordUser.send({ embeds: [embed] });
                    logger.info(`Sent expiry notification to ${user.username}`);
                } catch (dmError) {
                    logger.warn(`Could not send expiry DM to ${user.username}: ${dmError.message}`);
                }

            } catch (error) {
                logger.error(`Error processing expired user ${user.id}:`, error);
            }
        }

        if (expiredUsers.length > 0) {
            logger.info(`Processed ${expiredUsers.length} expired premium users`);
        }

    } catch (error) {
        logger.error('Error checking expired premium users:', error);
    }
}

async function checkExpiredPremiumServers(bot) {
    try {
        const expiredServers = await getExpiredPremiumServers();
        
        for (const server of expiredServers) {
            try {
                // Update server premium status
                await updateServerPremium(server.id, server.name, null);
                
                logger.info(`Premium expired for server ${server.name} (${server.id})`);

                // Try to notify the server owner
                try {
                    const guild = bot.client.guilds.cache.get(server.id);
                    if (guild) {
                        const owner = await guild.fetchOwner();
                        const embed = new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle('🏆 Server Premium Access Expired')
                            .setDescription(
                                `⏰ Premium access for **${server.name}** has expired.\n\n` +
                                '🎵 Your server is now back to normal status.\n' +
                                '👥 Members will have daily command limits again.\n' +
                                '💡 Contact an admin to renew premium access!\n\n' +
                                'Thank you for using LyraBot! 🎶'
                            )
                            .setTimestamp()
                            .setFooter({ text: config.footer.developer });

                        await owner.send({ embeds: [embed] });
                        logger.info(`Sent server expiry notification to owner of ${server.name}`);
                    }
                } catch (dmError) {
                    logger.warn(`Could not send server expiry DM for ${server.name}: ${dmError.message}`);
                }

            } catch (error) {
                logger.error(`Error processing expired server ${server.id}:`, error);
            }
        }

        if (expiredServers.length > 0) {
            logger.info(`Processed ${expiredServers.length} expired premium servers`);
        }

    } catch (error) {
        logger.error('Error checking expired premium servers:', error);
    }
}

async function sendExpiryNotifications(bot) {
    try {
        const { getUser, getUsersByRole } = require('../database/database');
        const now = Math.floor(Date.now() / 1000);
        const twentyFourHoursFromNow = now + (24 * 60 * 60);

        // Check premium users expiring in 24 hours
        const premiumUsers = await getUsersByRole('premium');
        for (const user of premiumUsers) {
            if (user.premium_expires && 
                user.premium_expires > now && 
                user.premium_expires <= twentyFourHoursFromNow) {
                
                try {
                    const discordUser = await bot.client.users.fetch(user.id);
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('⚠️ Premium Access Expiring Soon')
                        .setDescription(
                            '⏰ Your premium access to LyraBot will expire in less than 24 hours!\n\n' +
                            `📅 **Expires:** <t:${user.premium_expires}:F>\n` +
                            `⏳ **Time left:** <t:${user.premium_expires}:R>\n\n` +
                            '💡 Contact an admin to renew your premium access before it expires.\n\n' +
                            'Don\'t lose your unlimited music features! 🎶'
                        )
                        .setTimestamp()
                        .setFooter({ text: config.footer.developer });

                    await discordUser.send({ embeds: [embed] });
                    logger.info(`Sent expiry warning to ${user.username}`);
                } catch (dmError) {
                    logger.warn(`Could not send expiry warning to ${user.username}: ${dmError.message}`);
                }
            }
        }

        // Check premium servers expiring in 24 hours
        // This would require a similar implementation for servers

    } catch (error) {
        logger.error('Error sending expiry notifications:', error);
    }
}

async function updateBotStatistics(bot) {
    try {
        const stats = {
            totalServers: bot.client.guilds.cache.size,
            totalUsers: bot.client.users.cache.size,
            voiceConnections: bot.voiceConnections.size,
            musicPlayers: bot.musicPlayers.size,
            mode247Servers: bot.mode247Servers.size,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: Math.floor(Date.now() / 1000)
        };

        // Update bot status based on activity
        const activeConnections = bot.voiceConnections.size;
        let status = `🎵 Playing in ${activeConnections} servers`;
        if (activeConnections === 0) {
            status = '🎵 Ready to play music | /help';
        }

        bot.client.user.setPresence({
            activities: [{
                name: status,
                type: 2 // LISTENING
            }],
            status: 'online'
        });

        // Log statistics (less frequently to avoid spam)
        if (Math.floor(Date.now() / 1000) % 3600 === 0) { // Every hour
            logger.info('Bot Statistics:', {
                servers: stats.totalServers,
                users: stats.totalUsers,
                voiceConnections: stats.voiceConnections,
                uptime: Math.floor(stats.uptime / 3600) + ' hours'
            });
        }

    } catch (error) {
        logger.error('Error updating bot statistics:', error);
    }
}

// Reset user daily limits at midnight
function scheduleUsageReset(bot) {
    cron.schedule('0 0 * * *', async () => {
        try {
            logger.info('Resetting daily usage limits...');
            // This would reset all users' daily usage counts
            // Implementation depends on your specific reset logic
            
        } catch (error) {
            logger.error('Error resetting daily usage limits:', error);
        }
    });
}

module.exports = {
    setupScheduler,
    checkExpiredPremiumUsers,
    checkExpiredPremiumServers,
    sendExpiryNotifications,
    updateBotStatistics
};
