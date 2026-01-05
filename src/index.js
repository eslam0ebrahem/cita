require('dotenv').config();
const axios = require('axios');

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ID_SERVICIO = '3734';
const ID_GRUPO = '1362';
const TIEMPO_CITA = '20';

// API Endpoint
const BASE_URL = 'https://gestiona.comunidad.madrid/ctac_cita/cita/muestraHoras';

// Headers mimicking the browser request
const HEADERS = {
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
};

// Helper: Delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Get dates from tomorrow until end of specific month (0 = Jan, 1 = Feb, etc.)
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

        // Next day
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// Function to send Telegram notification
async function sendTelegramNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Telegram credentials not set. Skipping notification.');
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });
        console.log('Telegram notification sent.');
    } catch (error) {
        console.error('Error sending Telegram notification:', error.message);
    }
}

// Function to check a single date
async function checkDate(dateStr) {
    console.log(`Checking ${dateStr}...`);
    const encodedDate = encodeURIComponent(dateStr);
    const timestamp = Date.now();
    const url = `${BASE_URL}?idServicio=${ID_SERVICIO}&idGrupo=${ID_GRUPO}&dateStr=${encodedDate}&tiempoCita=${TIEMPO_CITA}&_=${timestamp}`;

    try {
        const response = await axios.get(url, { headers: HEADERS });
        const data = response.data;

        if (data && data.valoresComboHoras && data.valoresComboHoras.length > 0) {
            console.log(`>>> FOUND SLOTS ON ${dateStr} <<<`);
            const slots = data.valoresComboHoras.map(slot => slot.fechaAsString).join(', ');
            const message = `🚨 CITA FOUND for ${dateStr}! 🚨\nAvailable slots: ${slots}\nLink: https://gestiona.comunidad.madrid/ctac_cita/registro`;
            await sendTelegramNotification(message);
            return true; // Found something
        }
    } catch (error) {
        console.error(`Error checking ${dateStr}:`, error.message);
    }
    return false;
}

// Main check function
async function checkAll() {
    console.log(`\n[${new Date().toISOString()}] Starting batch check...`);

    // 0 = January. (Note: Date() uses 0-11 for months)
    // If you want next month, logic needs adjusting, but user asked for "January".
    const dates = getDatesUntilEndOfMonth(0);

    if (dates.length === 0) {
        console.log("No dates remaining in January to check.");
        return;
    }

    console.log(`Dates to check: ${dates.length} (${dates[0]} to ${dates[dates.length - 1]})`);

    for (const date of dates) {
        await checkDate(date);
        // Random delay between 1-3 seconds to be polite
        await delay(1000 + Math.random() * 2000);
    }
    console.log('Batch check complete.');
}

// Run immediately on start
checkAll();

// Schedule to run every 5 minutes (300,000 ms)
setInterval(checkAll, 300000);

console.log('Cita checker started (Interval: 5 mins). Press Ctrl+C to exit.');

// --- WEB SERVER FOR RENDER HEALTH CHECKS ---
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Cita Checker is running.\n');
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

