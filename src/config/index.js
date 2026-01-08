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
        // Target Date Limit (Format: DD/MM/YYYY) e.g., "15/02/2026"
        // Checks all dates from tomorrow up to and including this date.
        targetDateLimit: process.env.TARGET_DATE_LIMIT || null,
        enableHeartbeat: getBool('ENABLE_HEARTBEAT', false),
        renderExternalUrl: process.env.RENDER_EXTERNAL_URL,
        simulate: getBool('SIMULATE', false),

        // Feature Toggles
        enableMadrid: getBool('ENABLE_MADRID', true),
        enableAlicante: getBool('ENABLE_ALICANTE', false),
    },
    // Madrid Configuration
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
            'Referer': 'https://gestiona.comunidad.madrid/ctac_cita/registro',
            'Connection': 'keep-alive'
        }
    },
    // Alicante Configuration
    alicante: {
        url: 'https://santjoandalacant.sedelectronica.es/citaprevia.0',
        headers: {
            'Host': 'santjoandalacant.sedelectronica.es',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Connection': 'keep-alive'
        }
    }
};
