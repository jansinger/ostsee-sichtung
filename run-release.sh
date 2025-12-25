#!/bin/bash
#
# Run the latest release Docker image with local PostgreSQL and uploads directory
#
# Usage:
#   ./run-release.sh           # Run latest release
#   ./run-release.sh v2.0.2    # Run specific version
#   ./run-release.sh stop      # Stop running container
#   ./run-release.sh logs      # View logs
#
# Supports Docker Desktop and Rancher Desktop on macOS
# Note: For Rancher Desktop, PostgreSQL must listen on all interfaces
#

set -e

CONTAINER_NAME="ostsee-tiere-release"
IMAGE_BASE="ghcr.io/jansinger/ostsee-sichtung"
VERSION="${1:-latest}"
PORT="${PORT:-3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Detect Docker runtime (Docker Desktop vs Rancher Desktop)
detect_docker_runtime() {
    if docker context show 2>/dev/null | grep -q "rancher-desktop"; then
        echo "rancher"
    elif docker info 2>/dev/null | grep -q "rancher"; then
        echo "rancher"
    else
        echo "docker"
    fi
}

# Get host IP for database connection (needed for Rancher Desktop)
get_host_ip() {
    # Try to get the primary network interface IP
    if command -v ifconfig >/dev/null 2>&1; then
        ifconfig en0 2>/dev/null | grep "inet " | awk '{print $2}' | head -1
    elif command -v ip >/dev/null 2>&1; then
        ip route get 1 2>/dev/null | awk '{print $7}' | head -1
    else
        echo "127.0.0.1"
    fi
}

# Handle commands
case "$VERSION" in
    stop)
        echo -e "${YELLOW}Stopping container...${NC}"
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        echo -e "${GREEN}Container stopped and removed.${NC}"
        exit 0
        ;;
    logs)
        docker logs -f "$CONTAINER_NAME"
        exit 0
        ;;
    status)
        docker ps -f "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        exit 0
        ;;
esac

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with required configuration"
    exit 1
fi

# Load .env file
set -a
source "$SCRIPT_DIR/.env"
set +a

# Check required environment variables
if [ -z "$AUTH0_CLIENT_ID" ] || [ "$AUTH0_CLIENT_ID" = "client-id" ]; then
    echo -e "${YELLOW}Warning: AUTH0_CLIENT_ID not configured - authentication will not work${NC}"
fi

# Detect Docker runtime
DOCKER_RUNTIME=$(detect_docker_runtime)
HOST_IP=$(get_host_ip)

echo -e "${BLUE}Detected Docker runtime: $DOCKER_RUNTIME${NC}"

# For Rancher Desktop, we need to replace localhost with host IP in DATABASE_POSTGRES_URL
if [ "$DOCKER_RUNTIME" = "rancher" ]; then
    echo -e "${YELLOW}Rancher Desktop detected - adjusting database connection${NC}"

    # Replace localhost with host IP in the database URL
    DOCKER_DATABASE_URL=$(echo "$DATABASE_POSTGRES_URL" | sed "s/@localhost:/@$HOST_IP:/g" | sed "s/@127\.0\.0\.1:/@$HOST_IP:/g")

    echo -e "${BLUE}Host IP: $HOST_IP${NC}"
    echo -e "${YELLOW}Note: PostgreSQL must be configured to accept connections from Docker${NC}"
    echo -e "${YELLOW}      Add '$HOST_IP/32' to pg_hba.conf if connection fails${NC}"
else
    DOCKER_DATABASE_URL="$DATABASE_POSTGRES_URL"
fi

# Stop existing container if running
if docker ps -q -f "name=$CONTAINER_NAME" | grep -q .; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop "$CONTAINER_NAME" >/dev/null
    docker rm "$CONTAINER_NAME" >/dev/null
fi

# Pull the image
IMAGE="$IMAGE_BASE:$VERSION"
echo -e "${GREEN}Pulling image: $IMAGE${NC}"
docker pull "$IMAGE"

# Ensure uploads directory exists
mkdir -p "$SCRIPT_DIR/uploads"

echo ""
echo -e "${GREEN}Starting Ostsee-Tiere Release Container${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Runtime:   $DOCKER_RUNTIME"
echo "Image:     $IMAGE"
echo "Port:      http://localhost:$PORT"
echo "Database:  $DOCKER_DATABASE_URL"
echo "Uploads:   $SCRIPT_DIR/uploads"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the container
# - Port mapping for application access
# - Run as current user to avoid permission issues with bind mounts
# - Override entrypoint to skip storage check (Rancher Desktop compatibility)
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:$PORT" \
    --user "$(id -u):$(id -g)" \
    -v "$SCRIPT_DIR/uploads:/app/uploads" \
    --entrypoint "" \
    -e PORT="$PORT" \
    -e DATABASE_POSTGRES_URL="$DOCKER_DATABASE_URL" \
    -e STORAGE_PROVIDER="${STORAGE_PROVIDER:-local}" \
    -e NODE_ENV="production" \
    -e PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-http://localhost:$PORT}" \
    -e SESSION_SECRET="${SESSION_SECRET}" \
    -e ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
    -e AUTH0_CLIENT_ID="${AUTH0_CLIENT_ID}" \
    -e AUTH0_CLIENT_SECRET="${AUTH0_CLIENT_SECRET}" \
    -e AUTH0_DOMAIN="${AUTH0_DOMAIN}" \
    -e JWKS_URL="${JWKS_URL}" \
    -e API_AUDIENCE="${API_AUDIENCE}" \
    -e LOG_LEVEL="${LOG_LEVEL:-info}" \
    -e SKIP_STORAGE_CHECK="${SKIP_STORAGE_CHECK:-true}" \
    "$IMAGE" \
    node build/index.js

echo -e "${GREEN}Container started!${NC}"
echo ""
echo "Commands:"
echo "  ./run-release.sh logs    - View logs"
echo "  ./run-release.sh stop    - Stop container"
echo "  ./run-release.sh status  - Check status"
echo ""
echo -e "${GREEN}Application available at: http://localhost:$PORT${NC}"
echo ""

# Wait a moment and check health
sleep 3
if docker ps -q -f "name=$CONTAINER_NAME" | grep -q .; then
    echo -e "${GREEN}✓ Container is running${NC}"

    # Wait for health check
    echo "Waiting for application to start..."
    for i in {1..30}; do
        if curl -s -f "http://localhost:$PORT/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Application is healthy${NC}"
            exit 0
        fi
        sleep 1
    done

    echo -e "${YELLOW}Application may still be starting. Check logs with: ./run-release.sh logs${NC}"
else
    echo -e "${RED}✗ Container failed to start. Check logs:${NC}"
    docker logs "$CONTAINER_NAME"
    exit 1
fi
