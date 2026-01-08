const https = require('https');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
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

            // Create an HTTPS agent that ignores self-signed certificates
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false
            });

            // Setup Cookie Jar to handle redirects properly
            const jar = new CookieJar();
            const client = wrapper(axios.create({ jar }));

            const response = await client.get(url, {
                headers: headers,
                timeout: 60000,
                httpsAgent: httpsAgent
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

            // Filter by TARGET_DATE_LIMIT if set
            if (config.app.targetDateLimit && matches.length > 0) {
                const [lDay, lMonth, lYear] = config.app.targetDateLimit.split('/').map(Number);
                const limitDate = new Date(lYear, lMonth - 1, lDay);
                limitDate.setHours(23, 59, 59, 999);

                const filteredMatches = matches.filter(dateStr => {
                    const [dDay, dMonth, dYear] = dateStr.split('/').map(Number);
                    const dateObj = new Date(dYear, dMonth - 1, dDay);
                    return dateObj <= limitDate;
                });

                if (filteredMatches.length > 0) {
                    logger.info(`Alicante: Found ${matches.length} slots, ${filteredMatches.length} within limit (${config.app.targetDateLimit})`);
                    return filteredMatches;
                } else {
                    logger.info(`Alicante: Found ${matches.length} slots, but none before ${config.app.targetDateLimit}`);
                    return null;
                }
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
