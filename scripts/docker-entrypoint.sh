#!/bin/sh
# ============================================
# Docker Entrypoint Script for Ostsee-Tiere
# ============================================
# This script handles container startup, database migrations,
# and graceful application initialization.

set -e

# Colors for output (only if terminal is attached)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Logging functions
log_info() {
    printf "%b[INFO]%b %s\n" "$BLUE" "$NC" "$1"
}

log_success() {
    printf "%b[SUCCESS]%b %s\n" "$GREEN" "$NC" "$1"
}

log_warning() {
    printf "%b[WARNING]%b %s\n" "$YELLOW" "$NC" "$1"
}

log_error() {
    printf "%b[ERROR]%b %s\n" "$RED" "$NC" "$1"
}

# ============================================
# Startup Banner
# ============================================
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║                                           ║"
echo "║        Ostsee-Tiere Platform              ║"
echo "║   Marine Animal Sighting System           ║"
echo "║                                           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ============================================
# Environment Validation
# ============================================
log_info "Validating environment configuration..."

# Check required environment variables
REQUIRED_VARS="DATABASE_POSTGRES_URL SESSION_SECRET ENCRYPTION_KEY AUTH0_CLIENT_ID AUTH0_CLIENT_SECRET AUTH0_DOMAIN"
MISSING_VARS=""

for var in $REQUIRED_VARS; do
    eval value=\$$var
    if [ -z "$value" ]; then
        MISSING_VARS="$MISSING_VARS $var"
    fi
done

if [ -n "$MISSING_VARS" ]; then
    log_error "Missing required environment variables:$MISSING_VARS"
    log_error "Please check your .env file or environment configuration"
    exit 1
fi

log_success "Environment validation passed"

# ============================================
# Storage Configuration
# ============================================
log_info "Configuring storage..."

# Strip comments from environment variables (handle .env files with inline comments)
STORAGE_PROVIDER=$(echo "${STORAGE_PROVIDER:-local}" | cut -d'#' -f1 | xargs)
log_info "Storage provider: $STORAGE_PROVIDER"

if [ "$STORAGE_PROVIDER" = "local" ]; then
    UPLOAD_PATH=${UPLOAD_PATH:-/app/uploads}
    log_info "Local storage path: ${UPLOAD_PATH}"

    # Verify upload directory exists (must be mounted as volume)
    if [ ! -d "${UPLOAD_PATH}" ]; then
        log_error "Upload directory does not exist: ${UPLOAD_PATH}"
        log_error "Please mount a volume for uploads:"
        log_error "  docker run -v ./uploads:/app/uploads ..."
        log_error "  Or use docker-compose with volume configuration"
        exit 1
    fi

    # Verify upload directory is writable
    if [ ! -w "${UPLOAD_PATH}" ]; then
        log_error "Upload directory is not writable: ${UPLOAD_PATH}"
        log_error "Please ensure correct permissions for user ID 1001:"
        log_error "  mkdir -p ./uploads && chown -R 1001:1001 ./uploads"
        exit 1
    fi

    log_success "Local storage configured"
elif [ "$STORAGE_PROVIDER" = "vercel-blob" ]; then
    if [ -z "$BLOB_READ_WRITE_TOKEN" ]; then
        log_error "BLOB_READ_WRITE_TOKEN is required for Vercel Blob storage"
        exit 1
    fi
    log_success "Vercel Blob storage configured"
elif [ "$STORAGE_PROVIDER" = "s3" ]; then
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_S3_BUCKET" ]; then
        log_error "AWS credentials and bucket are required for S3 storage"
        exit 1
    fi
    log_success "AWS S3 storage configured"
elif [ "$STORAGE_PROVIDER" = "gcs" ]; then
    if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ] || [ -z "$GOOGLE_CLOUD_STORAGE_BUCKET" ]; then
        log_error "Google Cloud credentials are required for GCS storage"
        exit 1
    fi
    log_success "Google Cloud Storage configured"
else
    log_error "Unknown storage provider: $STORAGE_PROVIDER"
    exit 1
fi

# ============================================
# Database Connection Check
# ============================================
log_info "Checking database connection..."

# Wait for database to be ready (max 60 seconds)
MAX_RETRIES=30
RETRY_COUNT=0
DB_READY=0

# Extract host, port, user, and dbname from DATABASE_POSTGRES_URL
# Example: postgres://user:password@host:port/dbname
PGHOST=$(echo "$DATABASE_POSTGRES_URL" | sed -n 's#postgres://[^@]*@\([^:/]*\).*#\1#p')
PGPORT=$(echo "$DATABASE_POSTGRES_URL" | sed -n 's#postgres://[^@]*@[^:/]*:\([0-9]*\).*#\1#p')
PGUSER=$(echo "$DATABASE_POSTGRES_URL" | sed -n 's#postgres://\([^:]*\).*#\1#p')
PGDATABASE=$(echo "$DATABASE_POSTGRES_URL" | sed -n 's#postgres://[^@]*@[^:/]*[:0-9]*/\([^?]*\).*#\1#p')

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if pg_isready -h "$PGHOST" -p "${PGPORT:-5432}" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; then
        DB_READY=1
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_warning "Database not ready, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $DB_READY -eq 0 ]; then
    log_error "Database connection failed after $MAX_RETRIES attempts"
    log_error "Please check your DATABASE_POSTGRES_URL and database status"
    exit 1
fi

log_success "Database connection established"

# ============================================
# Database Migrations (Optional)
# ============================================
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    log_info "Running database migrations..."

    if command -v drizzle-kit >/dev/null 2>&1; then
        if drizzle-kit migrate; then
            log_success "Database migrations completed"
        else
            log_error "Database migrations failed"
            exit 1
        fi
    else
        log_warning "drizzle-kit not found, skipping migrations"
        log_warning "Ensure your database schema is up to date"
    fi
fi

# ============================================
# Application Info
# ============================================
log_info "Configuration summary:"
echo "  - Node Environment: ${NODE_ENV:-production}"
echo "  - Application Port: ${PORT:-3000}"
echo "  - Storage Provider: ${STORAGE_PROVIDER}"
echo "  - Log Level: ${LOG_LEVEL:-info}"
echo "  - Public URL: ${PUBLIC_SITE_URL:-http://localhost:3000}"

# ============================================
# Start Application
# ============================================
log_success "Starting Ostsee-Tiere application..."
echo ""

# Execute the Node.js application
exec node build/index.js
