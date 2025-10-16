# ============================================
# Multi-Stage Dockerfile for Ostsee-Tiere
# ============================================
# This Dockerfile creates an optimized production image for the
# Ostsee-Tiere marine animal sighting reporting platform.
#
# Build: docker build -t ostsee-tiere:latest .
# Run: docker run -p 3000:3000 --env-file .env ostsee-tiere:latest

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

LABEL org.opencontainers.image.title="Ostsee-Tiere"
LABEL org.opencontainers.image.description="Marine animal sighting reporting platform for the Baltic Sea"
LABEL org.opencontainers.image.source="https://github.com/your-org/ostsee-tiere"
LABEL org.opencontainers.image.licenses="MIT"

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
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create .env from example for build-time configuration
RUN cp .env.example .env

# Build the application with Docker-specific config
ENV NODE_ENV=production
RUN npm run build:docker

# Generate SBOM for security compliance
RUN npm run sbom:prod || true

# Prune devDependencies for smaller production image
RUN npm prune --omit=dev

# ============================================
# Stage 3: Runtime
# ============================================
FROM node:22-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/sbom ./sbom

# Copy runtime scripts
COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --chown=nodejs:nodejs scripts/docker-healthcheck.sh /usr/local/bin/docker-healthcheck.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/docker-healthcheck.sh

# Create directories for persistent data
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /usr/local/bin/docker-healthcheck.sh

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    BODY_SIZE_LIMIT=52428800 \
    STORAGE_PROVIDER=local \
    UPLOAD_PATH=/app/uploads

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["/usr/local/bin/docker-entrypoint.sh"]
