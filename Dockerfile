# ============================================
# Multi-Stage Dockerfile for Ostsee-Tiere
# ============================================
# This Dockerfile creates an optimized production image for the
# Ostsee-Tiere marine animal sighting reporting platform.
#
# Build: docker build -t ostsee-tiere:latest .
# Run: mkdir -p ./uploads && docker run -p 3000:3000 -v ./uploads:/app/uploads --env-file .env ostsee-tiere:latest
#
# Note: The -v ./uploads:/app/uploads mount ensures uploaded files persist
# across container restarts and are accessible on the host system.
# Linux users may need: sudo chown -R 1001:1001 ./uploads (container runs as user ID 1001)

# ============================================
# Stage 1: Dependencies
# ============================================
# Floating Node.js 24 Alpine tag — tracks latest patch release.
# Review periodically: https://nodejs.org/en/download/
FROM node:24-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# ============================================
# Stage 2: Builder
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create .env from Docker template for build-time configuration
RUN cp .env.docker .env

# Build the application with Node adapter for Docker
ENV NODE_ENV=production
ENV USE_NODE_ADAPTER=true
RUN npm run build

# Generate SBOM for security compliance
RUN npm run sbom:prod || true

# Prune devDependencies for smaller production image
RUN npm prune --omit=dev

# ============================================
# Stage 3: Runtime
# ============================================
FROM node:24-alpine AS runtime

# OCI Image Labels (placed in final stage for proper metadata)
LABEL org.opencontainers.image.title="Ostsee-Tiere"
LABEL org.opencontainers.image.description="Marine animal sighting reporting platform for the Baltic Sea"
LABEL org.opencontainers.image.source="https://github.com/jansinger/ostsee-tiere"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="Ostsee-Tiere Project"

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    postgresql-client

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/sbom ./sbom

# Copy database migrations (applied at container startup, see docker-migrate.ts)
COPY --chown=nodejs:nodejs drizzle ./drizzle
COPY --chown=nodejs:nodejs scripts/docker-migrate.ts ./scripts/docker-migrate.ts

# Copy runtime scripts
COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --chown=nodejs:nodejs scripts/docker-healthcheck.sh /usr/local/bin/docker-healthcheck.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/docker-healthcheck.sh

# Create directories for persistent data.
# Note: no /app/logs — the application logs to stdout only (Pino), and Docker
# captures it via the json-file driver. See docs/DOCKER_DEPLOYMENT.md -> Logging
RUN mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /usr/local/bin/docker-healthcheck.sh

# Set environment variables
# TZ ist bewusst gesetzt: ohne TZ fällt Node auf UTC zurück, was funktioniert,
# aber nur solange die Umgebung nichts anderes vorgibt. Datums-Logik hing dadurch
# schon an der Zufalls-Zeitzone (siehe docs/ENVIRONMENT.md → TZ).
ENV NODE_ENV=production \
    TZ=UTC \
    PORT=3000 \
    HOST=0.0.0.0 \
    BODY_SIZE_LIMIT=125829120 \
    STORAGE_PROVIDER=local \
    UPLOAD_PATH=/app/uploads

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["/usr/local/bin/docker-entrypoint.sh"]
