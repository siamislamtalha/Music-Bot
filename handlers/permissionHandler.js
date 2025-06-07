const { getUser, createOrUpdateUser, getServer } = require('../database/database');
const config = require('../config/config');
const logger = require('../utils/logger');

class PermissionHandler {
    constructor() {
        this.roles = {
            SUPER_ADMIN: 'superadmin',
            ADMIN: 'admin',
            MODERATOR: 'moderator',
            PREMIUM: 'premium',
            NORMAL: 'normal'
        };

        this.permissions = {
            [this.roles.SUPER_ADMIN]: [
                'manage_all_roles',
                'manage_premium',
                'view_all_users',
                'ban_users',
                'ban_servers',
                'change_settings',
                'view_stats',
                'reset_limits',
                'unlimited_commands'
            ],
            [this.roles.ADMIN]: [
                'manage_premium',
                'view_premium_users',
                'view_stats',
                'reset_limits',
                'unlimited_commands'
            ],
            [this.roles.MODERATOR]: [
                'manage_premium',
                'view_premium_users',
                'reset_limits',
                'unlimited_commands'
            ],
            [this.roles.PREMIUM]: [
                'unlimited_commands',
                'advanced_features',
                'playlist_access',
                'history_access'
            ],
            [this.roles.NORMAL]: [
                'basic_commands',
                'limited_advanced'
            ]
        };

        // Commands that normal users can use unlimited times
        this.unlimitedCommands = [
            'help', 'join', 'leave', '247mode', 'radio',
            'toplisteners', 'compareplaycount', 'shufflequeue',
            'clearqueue', 'loop', 'play', 'pause', 'resume'
        ];

        // Commands that have daily limits for normal users
        this.limitedCommands = [
            'skip', 'volume', 'seek', 'move', 'lyrics',
            'nowplaying', 'queue', 'equalizer', 'filter',
            'dj', 'genre', 'mood', 'playytlive', 'playytpodcast',
            'addtoplaylist', 'removefromplaylist', 'history',
            'soundboard', 'recommendmusic'
        ];
    }

    async getUserRole(userId) {
        try {
            // Check if user is hardcoded super admin
            if (userId === config.superAdminId) {
                return this.roles.SUPER_ADMIN;
            }

            const user = await getUser(userId);
            if (!user) {
                return this.roles.NORMAL;
            }

            // Check if premium role has expired
            if (user.role === this.roles.PREMIUM && user.premium_expires) {
                const now = Math.floor(Date.now() / 1000);
                if (now > user.premium_expires) {
                    // Premium expired, downgrade to normal user
                    await this.updateUserRole(userId, this.roles.NORMAL);
                    return this.roles.NORMAL;
                }
            }

            return user.role || this.roles.NORMAL;
        } catch (error) {
            logger.error('Error getting user role:', error);
            return this.roles.NORMAL;
        }
    }

    async updateUserRole(userId, role, expiresAt = null) {
        try {
            const { updateUserRole } = require('../database/database');
            await updateUserRole(userId, role, expiresAt);
            return true;
        } catch (error) {
            logger.error('Error updating user role:', error);
            return false;
        }
    }

    async checkServerPremium(serverId) {
        try {
            const server = await getServer(serverId);
            if (!server || !server.is_premium) {
                return false;
            }

            // Check if server premium has expired
            if (server.premium_expires) {
                const now = Math.floor(Date.now() / 1000);
                if (now > server.premium_expires) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            logger.error('Error checking server premium:', error);
            return false;
        }
    }

    async hasPermission(userId, serverId, permission) {
        try {
            const userRole = await this.getUserRole(userId);
            const userPermissions = this.permissions[userRole] || [];

            // Check if user has the specific permission
            if (userPermissions.includes(permission)) {
                return true;
            }

            // For premium permissions, also check if server is premium
            if (permission === 'unlimited_commands' || permission === 'advanced_features') {
                const serverPremium = await this.checkServerPremium(serverId);
                if (serverPremium) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            logger.error('Error checking permission:', error);
            return false;
        }
    }

    async canUseCommand(userId, serverId, commandName) {
        try {
            const userRole = await this.getUserRole(userId);

            // Super admins, admins, moderators can use all commands
            if ([this.roles.SUPER_ADMIN, this.roles.ADMIN, this.roles.MODERATOR].includes(userRole)) {
                return { allowed: true, reason: 'Admin privileges' };
            }

            // Check if server is premium (all users get premium features)
            const serverPremium = await this.checkServerPremium(serverId);
            if (serverPremium || userRole === this.roles.PREMIUM) {
                return { allowed: true, reason: 'Premium access' };
            }

            // For normal users, check command limitations
            if (this.unlimitedCommands.includes(commandName)) {
                return { allowed: true, reason: 'Unlimited command' };
            }

            if (this.limitedCommands.includes(commandName)) {
                const user = await getUser(userId);
                if (!user) {
                    await createOrUpdateUser({ id: userId, username: 'Unknown', discriminator: '0000' });
                    return { allowed: true, reason: 'First time user' };
                }

                // Check if usage should be reset (every 12 hours)
                const now = Math.floor(Date.now() / 1000);
                const resetInterval = config.limits.normalUser.resetHours * 3600; // Convert to seconds
                const lastReset = user.last_reset || 0;

                if (now - lastReset >= resetInterval) {
                    // Reset usage count
                    const { resetUserUsage } = require('../database/database');
                    await resetUserUsage(userId);
                    return { allowed: true, reason: 'Usage reset' };
                }

                // Check daily usage limit
                const dailyUsage = user.daily_usage || 0;
                if (dailyUsage >= config.limits.normalUser.dailyAdvancedCommands) {
                    return { 
                        allowed: false, 
                        reason: 'Daily limit reached',
                        remainingUses: 0,
                        resetTime: lastReset + resetInterval
                    };
                }

                return { 
                    allowed: true, 
                    reason: 'Within limits',
                    remainingUses: config.limits.normalUser.dailyAdvancedCommands - dailyUsage
                };
            }

            return { allowed: true, reason: 'Command allowed' };
        } catch (error) {
            logger.error('Error checking command usage:', error);
            return { allowed: false, reason: 'Error checking permissions' };
        }
    }

    async incrementUsage(userId) {
        try {
            const { updateUserUsage } = require('../database/database');
            await updateUserUsage(userId, 1);
            return true;
        } catch (error) {
            logger.error('Error incrementing usage:', error);
            return false;
        }
    }

    async getRoleDisplayName(role) {
        switch (role) {
            case this.roles.SUPER_ADMIN: return '🎖️ Super Admin';
            case this.roles.ADMIN: return '🛡️ Admin';
            case this.roles.MODERATOR: return '🛠️ Moderator';
            case this.roles.PREMIUM: return '💎 Premium';
            case this.roles.NORMAL: return '👤 Normal User';
            default: return '❓ Unknown';
        }
    }

    canManageRole(managerRole, targetRole) {
        const hierarchy = {
            [this.roles.SUPER_ADMIN]: 5,
            [this.roles.ADMIN]: 4,
            [this.roles.MODERATOR]: 3,
            [this.roles.PREMIUM]: 2,
            [this.roles.NORMAL]: 1
        };

        return hierarchy[managerRole] > hierarchy[targetRole];
    }

    canAssignRole(managerRole, roleToAssign) {
        // Only super admins can assign admin/moderator roles
        if ([this.roles.ADMIN, this.roles.MODERATOR].includes(roleToAssign)) {
            return managerRole === this.roles.SUPER_ADMIN;
        }

        // Admins and moderators can assign premium roles
        if (roleToAssign === this.roles.PREMIUM) {
            return [this.roles.SUPER_ADMIN, this.roles.ADMIN, this.roles.MODERATOR].includes(managerRole);
        }

        return false;
    }
}

module.exports = PermissionHandler;
