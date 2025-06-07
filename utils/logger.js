const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, ...args) {
        const timestamp = this.getTimestamp();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
    }

    writeToFile(level, formattedMessage) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logDir, `${today}.log`);
            
            fs.appendFileSync(logFile, formattedMessage + '\n', 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    info(message, ...args) {
        const formattedMessage = this.formatMessage('info', message, ...args);
        console.log('\x1b[36m%s\x1b[0m', formattedMessage); // Cyan
        this.writeToFile('info', formattedMessage);
    }

    warn(message, ...args) {
        const formattedMessage = this.formatMessage('warn', message, ...args);
        console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // Yellow
        this.writeToFile('warn', formattedMessage);
    }

    error(message, ...args) {
        const formattedMessage = this.formatMessage('error', message, ...args);
        console.error('\x1b[31m%s\x1b[0m', formattedMessage); // Red
        this.writeToFile('error', formattedMessage);
    }

    debug(message, ...args) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            const formattedMessage = this.formatMessage('debug', message, ...args);
            console.log('\x1b[35m%s\x1b[0m', formattedMessage); // Magenta
            this.writeToFile('debug', formattedMessage);
        }
    }

    success(message, ...args) {
        const formattedMessage = this.formatMessage('success', message, ...args);
        console.log('\x1b[32m%s\x1b[0m', formattedMessage); // Green
        this.writeToFile('info', formattedMessage);
    }

    // Clean up old log files (keep last 30 days)
    cleanupOldLogs() {
        try {
            const files = fs.readdirSync(this.logDir);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            files.forEach(file => {
                if (file.endsWith('.log')) {
                    const fileDate = new Date(file.replace('.log', ''));
                    if (fileDate < thirtyDaysAgo) {
                        fs.unlinkSync(path.join(this.logDir, file));
                        this.info(`Cleaned up old log file: ${file}`);
                    }
                }
            });
        } catch (error) {
            this.error('Error during log cleanup:', error);
        }
    }

    // Log command usage for analytics
    logCommand(commandName, userId, username, guildId, guildName) {
        const logData = {
            timestamp: this.getTimestamp(),
            command: commandName,
            user: {
                id: userId,
                username: username
            },
            guild: {
                id: guildId,
                name: guildName
            }
        };

        this.info(`Command executed: ${commandName} by ${username} in ${guildName || 'DM'}`);
        
        // Write to separate command log file
        try {
            const today = new Date().toISOString().split('T')[0];
            const commandLogFile = path.join(this.logDir, `commands-${today}.log`);
            fs.appendFileSync(commandLogFile, JSON.stringify(logData) + '\n', 'utf8');
        } catch (error) {
            this.error('Failed to write to command log file:', error);
        }
    }

    // Log music events
    logMusic(event, data) {
        const logData = {
            timestamp: this.getTimestamp(),
            event: event,
            data: data
        };

        this.info(`Music event: ${event}`, data);

        // Write to separate music log file
        try {
            const today = new Date().toISOString().split('T')[0];
            const musicLogFile = path.join(this.logDir, `music-${today}.log`);
            fs.appendFileSync(musicLogFile, JSON.stringify(logData) + '\n', 'utf8');
        } catch (error) {
            this.error('Failed to write to music log file:', error);
        }
    }

    // Log errors with stack trace
    logError(error, context = '') {
        const errorInfo = {
            timestamp: this.getTimestamp(),
            context: context,
            message: error.message,
            stack: error.stack,
            name: error.name
        };

        this.error(`Error in ${context}:`, error.message);
        this.debug('Stack trace:', error.stack);

        // Write to separate error log file
        try {
            const today = new Date().toISOString().split('T')[0];
            const errorLogFile = path.join(this.logDir, `errors-${today}.log`);
            fs.appendFileSync(errorLogFile, JSON.stringify(errorInfo, null, 2) + '\n', 'utf8');
        } catch (writeError) {
            console.error('Failed to write to error log file:', writeError);
        }
    }
}

// Create and export a singleton instance
const logger = new Logger();

// Clean up old logs on startup
logger.cleanupOldLogs();

module.exports = logger;
