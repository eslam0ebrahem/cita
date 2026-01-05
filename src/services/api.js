const axios = require('axios');
const logger = require('../utils/logger');

// Constants
const ID_SERVICIO = '3734';
const ID_GRUPO = '1362';
const TIEMPO_CITA = '20';
const BASE_URL = 'https://gestiona.comunidad.madrid/ctac_cita/cita/muestraHoras';

// Headers
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

class ApiService {
    async checkDate(dateStr) {
        logger.debug(`Checking date: ${dateStr}`);
        const encodedDate = encodeURIComponent(dateStr);
        const timestamp = Date.now();
        const url = `${BASE_URL}?idServicio=${ID_SERVICIO}&idGrupo=${ID_GRUPO}&dateStr=${encodedDate}&tiempoCita=${TIEMPO_CITA}&_=${timestamp}`;

        try {
            const response = await axios.get(url, {
                headers: HEADERS,
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
