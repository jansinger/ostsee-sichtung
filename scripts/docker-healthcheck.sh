#!/bin/sh
# ============================================
# Docker Health Check Script for Ostsee-Tiere
# ============================================
# This script performs health checks on the running container
# to ensure the application is responding correctly.

set -e

# Configuration
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/health}"
TIMEOUT=5

# Health check URL
HEALTH_URL="http://${HOST}:${PORT}${HEALTH_ENDPOINT}"

# Perform health check with curl
if ! curl -f -s --max-time "$TIMEOUT" "$HEALTH_URL" > /dev/null 2>&1; then
    # If /health endpoint fails, try root endpoint
    if ! curl -f -s --max-time "$TIMEOUT" "http://${HOST}:${PORT}/" > /dev/null 2>&1; then
        echo "Health check failed: Application not responding"
        exit 1
    fi
fi

# Additional checks can be added here:
# - Database connectivity
# - Storage accessibility
# - Memory usage
# - CPU usage

exit 0
