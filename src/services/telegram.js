const axios = require('axios');
const logger = require('../utils/logger');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

class TelegramService {
    constructor() {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            logger.warn('Telegram credentials not set. Notifications will be skipped.');
            this.enabled = false;
        } else {
            this.enabled = true;
            this.url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        }
    }

    async sendMessage(message) {
        if (!this.enabled) return;

        try {
            await axios.post(this.url, {
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            });
            logger.info('Telegram notification sent.');
        } catch (error) {
            logger.error('Error sending Telegram notification:', { error: error.message });
        }
    }
}

module.exports = new TelegramService();
