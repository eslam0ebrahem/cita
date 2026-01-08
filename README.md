# Cita Checker

A Node.js application that periodically checks for available appointments on the Comunidad de Madrid website and sends notifications via Telegram.

## Features
- **Automated Checking**: Scans for appointments periodically (default: every 5 mins).
- **Date Range**: Checks all dates from "tomorrow" until the end of a configured target month.
- **Telegram Notifications**: Instantly alerts you when a slot is found.
- **Resilience**: Implements exponential backoff and error handling for API reliability.
- **Health Check**: Exposes a web server for monitoring uptime and status history.
- **Keep-Alive**: Self-ping mechanism to prevent free-tier hosting (like Render) from sleeping.

## Setup

### Prerequisites
- Node.js 16+
- A Telegram Bot Token and Chat ID.

### Environment Variables
Create a `.env` file (or set these in your cloud dashboard):

```bash
# Required
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789

# Optional
CHECK_INTERVAL_MS=300000       # Interval in ms (Default: 5 mins)
TARGET_DATE_LIMIT=15/02/2026   # Check all dates from TOMORROW up to THIS date (inclusive).
ENABLE_MADRID=true             # Enable/Disable Madrid checks (Default: true)
ENABLE_ALICANTE=false          # Enable/Disable Alicante checks (Default: false)
ENABLE_HEARTBEAT=true          # Send start-up message? (true/false)
SIMULATE=false                 # Enable "Simulated" mode for testing (no real API calls)
LOG_LEVEL=info                 # debug, info, warn, error
```

### Installation
```bash
npm install
```

### Running Locally
```bash
npm start
```

## Running Tests (Simulation)
To verify the notification system works without waiting for a real appointment:
```bash
SIMULATE=true npm start
```

## Deployment (Render)
1. Fork/Clone this repository.
2. Create a new **Web Service** on Render.
3. Connect your repository.
4. Add the **Environment Variables** listed above.
5. Deploy!

The application will self-ping every 5 minutes to stay active on Render's free tier.
