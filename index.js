const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const config = require('./config/config');
const { initializeDatabase } = require('./database/database');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { setupScheduler } = require('./utils/scheduler');
const MusicHandler = require('./handlers/musicHandler');
const logger = require('./utils/logger');

class LyraBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ]
        });

        this.commands = new Collection();
        this.musicPlayers = new Collection(); // For multi-server support
        this.voiceConnections = new Collection();
        this.radioStations = new Map();
        this.mode247Servers = new Set();
        
        // Initialize music handler after client is ready
        this.musicHandler = null;
        
        // Make client globally available for Lavalink
        global.client = this.client;
        
        this.init();
    }

    async init() {
        try {
            // Initialize database
            await initializeDatabase();
            logger.info('Database initialized successfully');

            // Load commands and events
            await loadCommands(this);
            await loadEvents(this);

            // Setup scheduler for premium expiry
            setupScheduler(this);

            // Register slash commands
            await this.registerCommands();

            // Login to Discord
            await this.client.login(process.env.DISCORD_TOKEN || config.discord.token);
            
        } catch (error) {
            logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    async registerCommands() {
        try {
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || config.discord.token);
            
            const commands = this.commands.map(command => command.data.toJSON());
            
            logger.info('Started refreshing application (/) commands...');
            
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID || config.discord.clientId),
                { body: commands }
            );
            
            logger.info('Successfully reloaded application (/) commands');
        } catch (error) {
            logger.error('Error registering commands:', error);
        }
    }

    getMusicPlayer(guildId) {
        if (!this.musicPlayers.has(guildId)) {
            this.musicPlayers.set(guildId, {
                queue: [],
                currentSong: null,
                isPlaying: false,
                isPaused: false,
                volume: 50,
                loop: 'none', // 'none', 'song', 'queue'
                radioMode: false,
                mode247: false,
                connection: null,
                player: null,
                voiceChannel: null,
                textChannel: null,
                progressInterval: null
            });
        }
        return this.musicPlayers.get(guildId);
    }

    async createVoiceConnection(channel) {
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            this.voiceConnections.set(channel.guild.id, connection);
            return connection;
        } catch (error) {
            logger.error('Failed to create voice connection:', error);
            throw error;
        }
    }
}

// Start the bot
const bot = new LyraBot();

// Handle process termination
process.on('SIGINT', () => {
    logger.info('Bot shutting down...');
    bot.client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = LyraBot;
