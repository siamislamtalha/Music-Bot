const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../config/config');

let db;

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        // Ensure data directory exists
        const dataDir = path.dirname(config.database.path);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        db = new sqlite3.Database(config.database.path, (err) => {
            if (err) {
                logger.error('Error opening database:', err);
                reject(err);
                return;
            }
            logger.info('Connected to SQLite database');
            createTables().then(resolve).catch(reject);
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table for role and usage tracking
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT,
                discriminator TEXT,
                role TEXT DEFAULT 'normal',
                premium_expires INTEGER DEFAULT NULL,
                daily_usage INTEGER DEFAULT 0,
                last_reset INTEGER DEFAULT 0,
                total_songs_played INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`);

            // Servers table for premium server tracking
            db.run(`CREATE TABLE IF NOT EXISTS servers (
                id TEXT PRIMARY KEY,
                name TEXT,
                premium_expires INTEGER DEFAULT NULL,
                is_premium BOOLEAN DEFAULT FALSE,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`);

            // Song history table
            db.run(`CREATE TABLE IF NOT EXISTS song_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                guild_id TEXT,
                song_title TEXT,
                song_url TEXT,
                platform TEXT,
                duration INTEGER,
                played_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // User playlists table
            db.run(`CREATE TABLE IF NOT EXISTS playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                name TEXT,
                songs TEXT, -- JSON array of songs
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Settings table for global configurations
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`);

            // Initialize default settings
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES 
                ('contact_link', ?),
                ('bot_status', 'online')
            `, [config.defaultContactLink]);

            logger.info('Database tables created successfully');
            resolve();
        });
    });
}

// User management functions
function getUser(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createOrUpdateUser(userObj) {
    return new Promise((resolve, reject) => {
        const { id, username, discriminator, role = 'normal' } = userObj;
        const now = Math.floor(Date.now() / 1000);
        
        db.run(`INSERT OR REPLACE INTO users 
                (id, username, discriminator, role, updated_at) 
                VALUES (?, ?, ?, ?, ?)`,
            [id, username, discriminator, role, now],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function updateUserRole(userId, role, expiresAt = null) {
    return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);
        db.run(`UPDATE users SET role = ?, premium_expires = ?, updated_at = ? WHERE id = ?`,
            [role, expiresAt, now, userId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

function updateUserUsage(userId, increment = 1) {
    return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);
        db.run(`UPDATE users SET daily_usage = daily_usage + ?, updated_at = ? WHERE id = ?`,
            [increment, now, userId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

function resetUserUsage(userId) {
    return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);
        db.run(`UPDATE users SET daily_usage = 0, last_reset = ?, updated_at = ? WHERE id = ?`,
            [now, now, userId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

// Server management functions
function getServer(serverId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM servers WHERE id = ?', [serverId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function updateServerPremium(serverId, serverName, expiresAt) {
    return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);
        db.run(`INSERT OR REPLACE INTO servers 
                (id, name, premium_expires, is_premium, updated_at) 
                VALUES (?, ?, ?, ?, ?)`,
            [serverId, serverName, expiresAt, true, now],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// History and stats functions
function addSongToHistory(userId, guildId, songData) {
    return new Promise((resolve, reject) => {
        const { title, url, platform, duration } = songData;
        const now = Math.floor(Date.now() / 1000);
        
        db.run(`INSERT INTO song_history 
                (user_id, guild_id, song_title, song_url, platform, duration, played_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, guildId, title, url, platform, duration, now],
            function(err) {
                if (err) reject(err);
                else {
                    // Also increment user's total songs played
                    db.run('UPDATE users SET total_songs_played = total_songs_played + 1 WHERE id = ?', [userId]);
                    resolve(this.lastID);
                }
            }
        );
    });
}

function getUserHistory(userId, limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM song_history WHERE user_id = ? 
                ORDER BY played_at DESC LIMIT ?`,
            [userId, limit],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

function getTopListeners(limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT id, username, total_songs_played 
                FROM users 
                WHERE total_songs_played > 0 
                ORDER BY total_songs_played DESC 
                LIMIT ?`,
            [limit],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Settings functions
function getSetting(key) {
    return new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.value : null);
        });
    });
}

function setSetting(key, value) {
    return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);
        db.run(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
            [key, value, now],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

// Get users by role
function getUsersByRole(role) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users WHERE role = ?', [role], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Get expired premium users
function getExpiredPremiumUsers() {
    return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);
        db.all(`SELECT * FROM users 
                WHERE role = 'premium' AND premium_expires IS NOT NULL AND premium_expires <= ?`,
            [now],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Get expired premium servers
function getExpiredPremiumServers() {
    return new Promise((resolve, reject) => {
        const now = Math.floor(Date.now() / 1000);
        db.all(`SELECT * FROM servers 
                WHERE is_premium = true AND premium_expires IS NOT NULL AND premium_expires <= ?`,
            [now],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Close database connection
function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else {
                logger.info('Database connection closed');
                resolve();
            }
        });
    });
}

module.exports = {
    initializeDatabase,
    getUser,
    createOrUpdateUser,
    updateUserRole,
    updateUserUsage,
    resetUserUsage,
    getServer,
    updateServerPremium,
    addSongToHistory,
    getUserHistory,
    getTopListeners,
    getSetting,
    setSetting,
    getUsersByRole,
    getExpiredPremiumUsers,
    getExpiredPremiumServers,
    closeDatabase
};
