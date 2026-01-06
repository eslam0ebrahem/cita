require('dotenv').config();

const getInt = (key, defaultVal) => {
    const val = process.env[key];
    return val ? parseInt(val, 10) : defaultVal;
};

const getBool = (key, defaultVal) => {
    const val = process.env[key];
    return val ? val === 'true' : defaultVal;
};

module.exports = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
    },
    app: {
        port: getInt('PORT', 3000),
        checkIntervalMs: getInt('CHECK_INTERVAL_MS', 5 * 60 * 1000), // 5 minutes
        targetMonth: getInt('TARGET_MONTH', 1), // Default Feb (index 1)
        enableHeartbeat: getBool('ENABLE_HEARTBEAT', false),
        renderExternalUrl: process.env.RENDER_EXTERNAL_URL,
        simulate: getBool('SIMULATE', false),
    },
    api: {
        idServicio: '3734',
        idGrupo: '1362',
        tiempoCita: '20',
        baseUrl: 'https://gestiona.comunidad.madrid/ctac_cita/cita/muestraHoras',
        headers: {
            'Host': 'gestiona.comunidad.madrid',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
            'Sec-Ch-Ua': '"Not=A?Brand";v="24", "Chromium";v="140"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Referer': 'https://gestiona.comunidad.madrid/ctac_cita/registro',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
        }
    }
};
