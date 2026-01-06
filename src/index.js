require('dotenv').config();
const http = require('http');
const logger = require('./utils/logger');
const apiService = require('./services/api');
const telegramService = require('./services/telegram');

// --- CONFIGURATION ---
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS) || 5 * 60 * 1000; // Default 5 mins
const TARGET_MONTH = parseInt(process.env.TARGET_MONTH) || 0; // Default 0 (January)
const PORT = process.env.PORT || 3000;
const ENABLE_HEARTBEAT = process.env.ENABLE_HEARTBEAT === 'true';

// State
let lastSuccessfulRun = null;
let consecutiveErrors = 0;
let isRunning = false;

// --- HELPERS ---
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function getDatesUntilEndOfMonth(targetMonthIndex) {
    const dates = [];
    const now = new Date();
    // Start from tomorrow
    const current = new Date(now);
    current.setDate(current.getDate() + 1);

    while (current.getMonth() === targetMonthIndex && current.getFullYear() === now.getFullYear()) {
        const day = String(current.getDate()).padStart(2, '0');
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const year = current.getFullYear();
        dates.push(`${day}/${month}/${year}`);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// --- MAIN LOGIC ---
async function checkAll() {
    if (isRunning) {
        logger.warn('Previous check still running. Skipping this interval.');
        return;
    }
    isRunning = true;
    logger.info('Starting batch check...');

    const dates = getDatesUntilEndOfMonth(TARGET_MONTH);

    if (dates.length === 0) {
        logger.info(`No dates remaining in month index ${TARGET_MONTH} to check.`);
        isRunning = false;
        return;
    }

    logger.info(`Checking ${dates.length} dates: ${dates[0]} to ${dates[dates.length - 1]}`);

    for (const date of dates) {
        try {
            const result = await apiService.checkDate(date);

            if (result) {
                logger.info(`>>> FOUND SLOTS ON ${date} <<<`);
                const slots = result.map(slot => slot.fechaAsString).join(', ');
                const message = `🚨 <b>CITA FOUND for ${date}!</b> 🚨\n\nSlots: ${slots}\n\n<a href="https://gestiona.comunidad.madrid/ctac_cita/registro">Book Now</a>`;
                await telegramService.sendMessage(message);
            }

            // Reset error count on success (even if no slots found, a valid response is a success)
            consecutiveErrors = 0;

            // Random delay to be polite
            await delay(1000 + Math.random() * 2000);

        } catch (error) {
            consecutiveErrors++;
            logger.error(`Error checking ${date}. Consecutive errors: ${consecutiveErrors}`);

            // Simple backoff strategy: if we hit too many errors, abort this batch
            if (consecutiveErrors >= 5) {
                logger.warn('Too many consecutive errors. Aborting batch check.');
                break;
            }
        }
    }

    lastSuccessfulRun = new Date();
    isRunning = false;
    logger.info('Batch check complete.');
}

// --- INIT ---
async function start() {
    // Startup Message
    if (ENABLE_HEARTBEAT) {
        await telegramService.sendMessage(`🤖 <b>Cita Checker Started</b>\nCheck Interval: ${CHECK_INTERVAL_MS / 1000}s\nTarget Month: ${TARGET_MONTH + 1}\nVersion: 2.0.0`);
    }

    // Initial Run
    checkAll();

    // Schedule
    setInterval(checkAll, CHECK_INTERVAL_MS);
}

// --- WEB SERVER (Health Check) ---
const server = http.createServer((req, res) => {
    const status = {
        status: 'UP',
        uptime: process.uptime(),
        lastRun: lastSuccessfulRun ? lastSuccessfulRun.toISOString() : 'Never',
        consecutiveErrors
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
});

server.listen(PORT, () => {
    logger.info(`Health check server listening on port ${PORT}`);
    start();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down...');
    server.close(() => {
        logger.info('Server closed. Process exit.');
        process.exit(0);
    });
});

// --- KEEP ALIVE (SELF PING) ---
// Render free tier spins down after 15 mins of inactivity.
// We ping ourselves every 5 minutes to stay awake.
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

if (RENDER_EXTERNAL_URL) {
    logger.info(`Keep-Alive enabled for: ${RENDER_EXTERNAL_URL}`);

    setInterval(() => {
        logger.info('Sending Keep-Alive ping...');
        http.get(`${RENDER_EXTERNAL_URL}/`, (res) => {
            logger.info(`Keep-Alive ping sent. Status: ${res.statusCode}`);
        }).on('error', (err) => {
            logger.error(`Keep-Alive ping failed: ${err.message}`);
        });
    }, 5 * 60 * 1000); // 5 minutes
} else {
    logger.warn('RENDER_EXTERNAL_URL not set. Keep-Alive disabled.');
}

