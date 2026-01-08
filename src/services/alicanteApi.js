const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class AlicanteApiService {
    async checkAppointments() {
        logger.debug('Checking Alicante appointments...');

        const { url, headers } = config.alicante;

        try {
            // --- SIMULATION MODE ---
            if (config.app.simulate) {
                logger.info('⚠️ SIMULATION MODE (Alicante): Returning fake found date');
                return ['15/02/2026', '16/02/2026'];
            }

            // If we need a cookie/session ID, we might need to add it here.
            // For now, based on user request, we try without specific session or rely on headers.
            // If the user provided a specific cookie in the request file, we might need to add it to env if strict.
            // However, often these pages generate a session on first visit.

            const response = await axios.get(url, {
                headers: headers,
                timeout: 15000
            });

            const html = response.data;

            // Logic to find dates in the HTML
            // Searching for pattern DD/MM/YYYY inside the specific context or just generally in the list
            // The snippet showed: ... onclick="...">13/02/2026 - VIERNES</a>

            // Regex to find dates in format DD/MM/YYYY followed by " - " which seems to be the format in the link text
            const dateRegex = />(\d{2}\/\d{2}\/\d{4}) -/g;
            const matches = [];
            let match;

            while ((match = dateRegex.exec(html)) !== null) {
                matches.push(match[1]);
            }

            if (matches.length > 0) {
                return matches;
            }

        } catch (error) {
            if (error.response) {
                logger.error(`Alicante API Error: Status ${error.response.status}`);
            } else {
                logger.error(`Alicante Network Error: ${error.message}`);
            }
            // We don't throw here to avoid stopping the loop if Madrid is also running.
            // But if this is a job component, maybe we should just log.
        }
        return null;
    }
}

module.exports = new AlicanteApiService();
