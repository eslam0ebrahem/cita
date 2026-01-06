const http = require('http');
const logger = require('./utils/logger');
const config = require('./config');
const appointmentChecker = require('./jobs/AppointmentChecker');

// --- INIT ---
async function bootstrap() {
    logger.info('Bootstrapping application...');

    // Start the Job
    appointmentChecker.start();

    // Start Web Server
    const server = http.createServer((req, res) => {
        const status = appointmentChecker.getStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    });

    server.listen(config.app.port, () => {
        logger.info(`Web server listening on port ${config.app.port}`);
    });

    // Graceful Shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Shutting down...');
        appointmentChecker.stop();
        server.close(() => {
            logger.info('Server closed. Process exit.');
            process.exit(0);
        });
    });

    // Keep-Alive Logic
    if (config.app.renderExternalUrl) {
        logger.info(`Keep-Alive enabled for: ${config.app.renderExternalUrl}`);
        setInterval(() => {
            logger.info('Sending Keep-Alive ping...');
            http.get(`${config.app.renderExternalUrl}/`, (res) => {
                logger.info(`Keep-Alive ping sent. Status: ${res.statusCode}`);
            }).on('error', (err) => {
                logger.error(`Keep-Alive ping failed: ${err.message}`);
            });
        }, 5 * 60 * 1000);
    }
}

bootstrap().catch(err => {
    logger.error('Fatal error during bootstrap:', err);
    process.exit(1);
});
