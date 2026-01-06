const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class TelegramService {
    constructor() {
        const { botToken, chatId } = config.telegram;

        if (!botToken || !chatId) {
            logger.warn('Telegram credentials not set. Notifications will be skipped.');
            this.enabled = false;
        } else {
            this.enabled = true;
            this.chatId = chatId;
            this.url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        }
    }

    async sendMessage(message) {
        if (!this.enabled) return;

        try {
            await axios.post(this.url, {
                chat_id: this.chatId,
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
