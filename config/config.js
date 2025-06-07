module.exports = {
    discord: {
        token: process.env.DISCORD_BOT_TOKEN || 'MTM3ODA1OTIxMTAzMTcxMTgzNw.GML9vk.AzEgrFVPiBZSzeLPUXhET7g_ALtddtngRxNZXM',
        clientId: process.env.DISCORD_CLIENT_ID || '1378059211031711837',
        guildId: process.env.GUILD_ID || null // Leave null for global commands
    },
    
    // Super Admin ID (hardcoded as requested)
    superAdminId: '1142030916999454791',
    
    // API Keys for music services
    apis: {
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID || '',
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ''
        },
        youtube: {
            apiKey: process.env.YOUTUBE_API_KEY || ''
        },
        soundcloud: {
            clientId: process.env.SOUNDCLOUD_CLIENT_ID || ''
        }
    },
    
    // Usage limits for normal users
    limits: {
        normalUser: {
            dailyAdvancedCommands: 5,
            resetHours: 12 // Reset every 12 hours as requested
        }
    },
    
    // Default contact link for admin button
    defaultContactLink: process.env.CONTACT_LINK || 'https://discord.gg/kwgshUHVUn',
    
    // Embed colors (dusty pink theme)
    colors: {
        primary: 0xD8BFD8, // Dusty pink
        success: 0x90EE90,
        error: 0xFF6B6B,
        warning: 0xFFD93D,
        info: 0x87CEEB
    },
    
    // Database configuration
    database: {
        path: './data/lyrabot.db',
        backup: {
            enabled: true,
            interval: 24 * 60 * 60 * 1000 // 24 hours
        }
    },
    
    // Audio settings
    audio: {
        bitrate: 128000,
        opus: true,
        volume: 0.5,
        seek: 0,
        passes: 1
    },
    
    // Radio stations
    radioStations: {
        'pop': 'http://stream.radiopopular.ro:8000/radiopopular',
        'rock': 'http://stream.srg-ssr.ch/m/rsj/mp3_128',
        'jazz': 'http://jazz-wr04.ice.infomaniak.ch/jazz-wr04-128.mp3',
        'classical': 'http://live.streamtheworld.com/KUSCMP128.mp3',
        'electronic': 'http://stream.radiorecord.ru:8102/radiorecord_128',
        'chill': 'http://streaming.radionomy.com/ChilloutLounge',
        'lofi': 'http://streams.fluxfm.de/Chillhop/mp3-320/streams.fluxfm.de/'
    },
    
    // Progress bar settings
    progressBar: {
        length: 20,
        filledChar: '■',
        emptyChar: '□',
        updateInterval: 10000 // 10 seconds
    },
    
    // Footer text
    footer: {
        developer: '🎧🎶 Developed BY - TASNIA TANZIM 🎶💖',
        requester: '🎧🎶 Music Requested BY - {username} 🎶💖'
    }
};
