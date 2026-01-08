const https = require('https');
const axios = require('axios');
// Removed synchronous require for axios-cookiejar-support to avoid ESM error
// const { wrapper } = require('axios-cookiejar-support'); 
const { CookieJar } = require('tough-cookie');
const logger = require('../utils/logger');
const config = require('../config');

class AlicanteApiService {
    async checkAppointments() {
        logger.debug('Checking Alicante appointments...');

        let currentUrl = config.alicante.url;
        const initialHeaders = config.alicante.headers;

        // Store cookies as an array of strings like "key=value"
        let cookies = [];

        // Create an HTTPS agent that ignores self-signed certificates
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });

        try {
            // --- SIMULATION MODE ---
            if (config.app.simulate) {
                logger.info('⚠️ SIMULATION MODE (Alicante): Returning fake found date');
                return ['15/02/2026', '16/02/2026'];
            }

            let response;
            let redirectCount = 0;
            const maxRedirects = 10;

            // Manual redirect loop
            while (redirectCount < maxRedirects) {
                // Construct Cookie header
                const cookieHeader = cookies.join('; ');
                const requestHeaders = { ...initialHeaders };
                if (cookieHeader) {
                    requestHeaders['Cookie'] = cookieHeader;
                }

                response = await axios.get(currentUrl, {
                    headers: requestHeaders,
                    timeout: 60000,
                    httpsAgent: httpsAgent,
                    maxRedirects: 0, // Disable auto-redirect
                    validateStatus: status => status >= 200 && status < 400 // Accept 3xx
                });

                // Extract and update cookies
                const setCookie = response.headers['set-cookie'];
                if (setCookie) {
                    setCookie.forEach(cookieStr => {
                        const cookiePart = cookieStr.split(';')[0];
                        // Simple cookie update/add logic
                        const cookieName = cookiePart.split('=')[0];
                        // Remove existing cookie with same name
                        cookies = cookies.filter(c => !c.startsWith(cookieName + '='));
                        cookies.push(cookiePart);
                    });
                }

                // Check for Redirect
                if (response.status >= 300 && response.status < 400 && response.headers.location) {
                    redirectCount++;
                    const location = response.headers.location;
                    // Handle relative URLs
                    if (location.startsWith('http')) {
                        currentUrl = location;
                    } else {
                        const baseUrlObj = new URL(currentUrl);
                        currentUrl = new URL(location, baseUrlObj.origin).toString();
                    }
                    logger.debug(`Alicante: Following redirect (${redirectCount}) to ${currentUrl}`);
                    continue; // Loop again
                }

                // If 200 OK, break and parse
                if (response.status === 200) {
                    break;
                }

                // If other status, throw
                throw new Error(`Unexpected status ${response.status}`);
            }

            if (redirectCount >= maxRedirects) {
                throw new Error('Maximum redirects exceeded');
            }

            const html = response.data;

            // Logic to find dates in the HTML
            // Regex to find dates in format DD/MM/YYYY followed by " - "
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
        }
        return null;
    }
}

module.exports = new AlicanteApiService();
