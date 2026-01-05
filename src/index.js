require('dotenv').config();
const axios = require('axios');
const path = require('path');

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TARGET_DATE = '13/01/2026'; // format: DD/MM/YYYY
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

// Function to check for slots
async function checkCita() {
    console.log(`[${new Date().toISOString()}] Checking for appointment on ${TARGET_DATE}...`);
    
    // URL Encode the date (e.g., 26/05/2026 -> 26%2F05%2F2026)
    const encodedDate = encodeURIComponent(TARGET_DATE);
    const timestamp = Date.now();
    const url = `${BASE_URL}?idServicio=${ID_SERVICIO}&idGrupo=${ID_GRUPO}&dateStr=${encodedDate}&tiempoCita=${TIEMPO_CITA}&_=${timestamp}`;

    try {
        const response = await axios.get(url, { headers: HEADERS });
        const data = response.data;

        // Check if valoresComboHoras has any entries
        if (data && data.valoresComboHoras && data.valoresComboHoras.length > 0) {
            console.log('CITA FOUND!:', data.valoresComboHoras);
            const slots = data.valoresComboHoras.map(slot => slot.fechaAsString).join(', ');
            const message = `🚨 CITA FOUND for ${TARGET_DATE}! 🚨\nAvailable slots: ${slots}\nLink: https://gestiona.comunidad.madrid/ctac_cita/registro`;
            await sendTelegramNotification(message);
        } else {
            console.log('No slots found.');
        }

    } catch (error) {
        console.error('Error checking cita:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            // console.error('Response data:', error.response.data);
        }
    }
}

// Run immediately on start
checkCita();

// Schedule to run every minute (60000 ms)
setInterval(checkCita, 60000);

console.log('Cita checker started. Press Ctrl+C to exit.');
