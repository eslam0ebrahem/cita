const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class ApiService {
    async checkDate(dateStr) {
        logger.debug(`Checking date: ${dateStr}`);
        const encodedDate = encodeURIComponent(dateStr);
        const timestamp = Date.now();

        const { baseUrl, idServicio, idGrupo, tiempoCita, headers } = config.api;
        const url = `${baseUrl}?idServicio=${idServicio}&idGrupo=${idGrupo}&dateStr=${encodedDate}&tiempoCita=${tiempoCita}&_=${timestamp}`;

        try {
            // --- SIMULATION MODE ---
            if (config.app.simulate) {
                logger.info('⚠️ SIMULATION MODE: Returning fake success response');
                // Mimic the response from the 'respond' file
                return [
                    { "fechaAsDate": 1779778800000, "fechaAsString": "09:00", "fechaAsMilis": 1779778800000, "hour": 9 },
                    { "fechaAsDate": 1779782400000, "fechaAsString": "10:00", "fechaAsMilis": 1779782400000, "hour": 10 }
                ];
            }

            const response = await axios.get(url, {
                headers: headers,
                timeout: 10000 // 10s timeout
            });
            const data = response.data;

            if (data && data.valoresComboHoras && data.valoresComboHoras.length > 0) {
                return data.valoresComboHoras;
            }
        } catch (error) {
            // Throw the error so the main loop can handle backoff/logging
            if (error.response) {
                logger.error(`API Error for ${dateStr}: Status ${error.response.status}`);
                if (error.response.status === 429) {
                    logger.warn('Rate Limit Detected!');
                }
            } else {
                logger.error(`Network Error for ${dateStr}: ${error.message}`);
            }
            throw error;
        }
        return null;
    }
}

module.exports = new ApiService();
