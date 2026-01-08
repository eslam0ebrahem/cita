const logger = require('../utils/logger');
const config = require('../config');
const alicanteApiService = require('../services/alicanteApi');

class AppointmentChecker {
    constructor() {
        this.isRunning = false;
        this.consecutiveErrors = 0;
        this.lastSuccessfulRun = null;
        this.intervalId = null;
    }

    start() {
        // Heartbeat
        if (config.app.enableHeartbeat) {
            telegramService.sendMessage(
                `🤖 <b>Cita Checker Started</b>\n` +
                `Check Interval: ${config.app.checkIntervalMs / 1000}s\n` +
                `Madrid Enabled: ${config.app.enableMadrid}\n` +
                `Alicante Enabled: ${config.app.enableAlicante}\n` +
                `Version: 3.2.0 (Multi-City)`
            );
        }

        // Initial check
        this.checkAll();

        // Schedule
        this.intervalId = setInterval(() => this.checkAll(), config.app.checkIntervalMs);
        logger.info(`Scheduler started. Interval: ${config.app.checkIntervalMs}ms`);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('Scheduler stopped.');
        }
    }

    async checkAll() {
        if (this.isRunning) {
            logger.warn('Previous check still running. Skipping this interval.');
            return;
        }
        this.isRunning = true;
        logger.info('Starting batch check...');

        try {
            // 1. Check Madrid
            if (config.app.enableMadrid) {
                await this._checkMadrid();
            } else {
                logger.info('Madrid check disabled.');
            }

            // 2. Check Alicante
            if (config.app.enableAlicante) {
                await this._checkAlicante();
            } else {
                logger.info('Alicante check disabled.');
            }

            this.lastSuccessfulRun = new Date();
            logger.info('Batch check complete.');

        } catch (error) {
            logger.error('Critical error during batch check:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async _checkAlicante() {
        logger.info('>>> Starting Alicante Check <<<');
        const dates = await alicanteApiService.checkAppointments();
        if (dates && dates.length > 0) {
            const dateStr = dates.join(', ');
            logger.info(`>>> ALICANTE: FOUND SLOTS: ${dateStr} <<<`);
            const message = `🚨 <b>ALICANTE CITA FOUND!</b> 🚨\n\nDates: ${dateStr}\n\n<a href="${config.alicante.url}">Book Now</a>`;
            await telegramService.sendMessage(message);
        } else {
            logger.info('Alicante: No slots found.');
        }
    }

    async _checkMadrid() {
        logger.info('>>> Starting Madrid Check <<<');
        const dates = this._getDatesCheckList();

        if (dates.length === 0) {
            logger.info(`Madrid: No dates remaining to check before ${config.app.targetDateLimit}.`);
            return;
        }

        logger.info(`Madrid: Checking ${dates.length} dates.`);

        for (const date of dates) {
            if (!this.isRunning) break;

            await this._checkSingleDateMadrid(date);

            // Random polite delay
            await this._delay(1000 + Math.random() * 2000);
        }
    }

    async _checkSingleDateMadrid(date) {
        try {
            const result = await apiService.checkDate(date);

            if (result) {
                logger.info(`>>> MADRID: FOUND SLOTS ON ${date} <<<`);
                const slots = result.map(slot => slot.fechaAsString).join(', ');
                const message = `🚨 <b>MADRID CITA FOUND for ${date}!</b> 🚨\n\nSlots: ${slots}\n\n<a href="https://gestiona.comunidad.madrid/ctac_cita/registro">Book Now</a>`;
                await telegramService.sendMessage(message);
            }

            this.consecutiveErrors = 0;

        } catch (error) {
            this.consecutiveErrors++;
            logger.error(`Error checking ${date}. Consecutive errors: ${this.consecutiveErrors}`);

            // Only stop Madrid loop if too many errors, but don't crash whole app
            if (this.consecutiveErrors >= 5) {
                logger.warn('Madrid: Too many consecutive errors. Aborting Madrid loop.');
                throw new Error('Madrid Loop Error');
            }
        }
    }

    _getDatesCheckList() {
        const dates = [];
        const now = new Date();
        const current = new Date(now);
        current.setDate(current.getDate() + 1); // Start tomorrow

        // Parse Target Limit
        let limitDate = null;
        if (config.app.targetDateLimit) {
            const [day, month, year] = config.app.targetDateLimit.split('/').map(Number);
            if (day && month && year) {
                limitDate = new Date(year, month - 1, day);
                limitDate.setHours(23, 59, 59, 999); // End of that day
            }
        }

        // Safety fallback: if no limit is set, default to 30 days from now to avoid infinite loops
        if (!limitDate) {
            limitDate = new Date(now);
            limitDate.setDate(limitDate.getDate() + 30);
            logger.warn('No valid TARGET_DATE_LIMIT set. Defaulting to 30 days check range.');
        }

        while (current <= limitDate) {
            const day = String(current.getDate()).padStart(2, '0');
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const year = current.getFullYear();
            dates.push(`${day}/${month}/${year}`);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            status: 'UP',
            uptime: process.uptime(),
            lastRun: this.lastSuccessfulRun ? this.lastSuccessfulRun.toISOString() : 'Never',
            consecutiveErrors: this.consecutiveErrors,
            isRunning: this.isRunning
        };
    }
}

module.exports = new AppointmentChecker();
