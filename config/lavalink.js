module.exports = {
    // Lavalink server configuration
    nodes: [
        {
            name: 'Main Node',
            url: 'lavalink.serenetia.com:443',
            auth: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            name: 'Backup Node',
            url: 'lavalinkv4-id.serenetia.com:443',
            auth: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            name: 'Local Node',
            url: 'lavalink.serenetia.com:80',
            auth: 'https://dsc.gg/ajidevserver',
            secure: false
        }
    ],
    
    // Shoukaku options
    shoukakuOptions: {
        moveOnDisconnect: false,
        resumable: false,
        resumableTimeout: 30,
        reconnectTries: 2,
        restTimeout: 10000
    },
    
    // Kazagumo options
    kazagumoOptions: {
        defaultSearchEngine: 'youtube',
        send: (guildId, payload) => {
            const guild = global.client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    },
    
    // Source priorities
    searchEngines: {
        youtube: 'ytsearch',
        youtubemusic: 'ytmsearch',
        soundcloud: 'scsearch',
        spotify: 'spsearch'
    }
};