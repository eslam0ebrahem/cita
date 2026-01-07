const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class SedeApiService {
    constructor() {
        this.enabled = false;
        // We will load these from config/validation later
    }

    async check() {
        if (!config.apiSede.enabled) return false;

        logger.info('checking Sede API (Secondary System)...');

        try {
            const { url, headers, body } = config.apiSede;

            // The body is x-www-form-urlencoded string
            const response = await axios.post(url, body, {
                headers: headers,
                timeout: 10000,
                validateStatus: status => status < 500 // Resolve even if 404/etc to check content
            });

            const html = response.data;

            // Check for negative phrase
            if (html.includes('En este momento no hay citas disponibles')) {
                logger.info('Sede API: No appointments available.');
                return false;
            } else if (html.includes('Error') || html.includes('su sesión ha caducado')) {
                // Known error states (if we knew them) - for now assuming anything else is "Interesting"
                // But let's be careful. If session expired, we don't want to spam.
                // Since user didn't give error samples, we'll assume "Not Found Text" == Success?
                // Or maybe the user implies "if you don't find the text, it's a cita".

                // Let's look for positive indicators if possible, or just inverse of negative.
                logger.warn('Sede API: "No appointments" text NOT found. Inspect manually!');
                return true;
            }

            logger.info('Sede API: Potential slot found (Negative text missing).');
            return true;

        } catch (error) {
            logger.error(`Sede API Error: ${error.message}`);
            return false;
        }
    }
}

module.exports = new SedeApiService();
