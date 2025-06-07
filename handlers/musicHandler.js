const { Shoukaku } = require('shoukaku');
const { Kazagumo, KazagumoTrack } = require('kazagumo');
const lavalinkConfig = require('../config/lavalink');
const config = require('../config/config');
const logger = require('../utils/logger');
const { addSongToHistory } = require('../database/database');

class MusicHandler {
    constructor(bot) {
        this.bot = bot;
        this.initializeLavalink();
    }

    initializeLavalink() {
        try {
            this.shoukaku = new Shoukaku(
                this.bot.client,
                lavalinkConfig.nodes,
                lavalinkConfig.shoukakuOptions
            );

            this.kazagumo = new Kazagumo({
                ...lavalinkConfig.kazagumoOptions,
                send: (guildId, payload) => {
                    const guild = this.bot.client.guilds.cache.get(guildId);
                    if (guild) guild.shard.send(payload);
                }
            }, this.shoukaku);

            this.setupLavalinkEvents();
            logger.info('Lavalink music system initialized');
        } catch (error) {
            logger.error('Failed to initialize Lavalink:', error);
        }
    }

    setupLavalinkEvents() {
        this.shoukaku.on('ready', (name) => {
            logger.info(`Lavalink node ${name} is ready`);
        });

        this.shoukaku.on('error', (name, error) => {
            logger.error(`Lavalink node ${name} error:`, error);
        });

        this.shoukaku.on('close', (name, code, reason) => {
            logger.warn(`Lavalink node ${name} closed: ${code} - ${reason}`);
        });

        this.shoukaku.on('disconnect', (name, players, moved) => {
            logger.warn(`Lavalink node ${name} disconnected. Moved: ${moved}`);
        });
    }

    async search(query, platform = 'youtube') {
        try {
            logger.info(`Searching for: ${query} on ${platform}`);

            const fallbackEngines = {
                youtube: 'ytsearch',
                soundcloud: 'scsearch',
                spotify: 'spsearch',
                auto: 'ytsearch'
            };

            const searchEngine = (lavalinkConfig.searchEngines && lavalinkConfig.searchEngines[platform]) || fallbackEngines[platform] || 'ytsearch';
            const searchQuery = `${searchEngine}:${query}`;

            const result = await this.kazagumo.search(searchQuery);

            if (!result || !result.tracks || result.tracks.length === 0) {
                logger.warn(`No results found for query: ${searchQuery}`);
                return null;
            }

            const track = result.tracks[0];
            logger.info(`Found track: ${track.title} by ${track.author}`);

            return {
                title: track.title,
                author: track.author,
                url: track.uri,
                duration: track.length,
                thumbnail: track.thumbnail,
                platform: platform,
                trackObject: track
            };
        } catch (error) {
            logger.error(`Error during search: ${error.message}`);
            throw new Error('Search failed. Please try again later.');
        }
    }
}

module.exports = MusicHandler;
