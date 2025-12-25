# Docker Deployment Guide for Ostsee-Tiere

This comprehensive guide covers deploying the Ostsee-Tiere marine animal sighting platform using Docker containers. Docker is the **primary deployment method** for self-hosted installations.

## Table of Contents

- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Installation Options](#installation-options)
- [Configuration](#configuration)
- [Storage Setup](#storage-setup)
- [Database Configuration](#database-configuration)
- [Database Migration](#database-migration)
- [Monitoring Setup](#monitoring-setup)
- [Production Deployment](#production-deployment)
- [CI/CD and Release Process](#cicd-and-release-process)
- [Backup & Restore](#backup--restore)
- [Local Development Testing with Rancher Desktop](#local-development-testing-with-rancher-desktop)
- [Production with External PostgreSQL](#production-with-external-postgresql)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Quick Start

Get Ostsee-Tiere running in 4 steps:

```bash
# 1. Clone the repository or download release files
git clone https://github.com/jansinger/ostsee-sichtung.git
cd ostsee-sichtung

# 2. Configure environment
cp .env.docker .env
nano .env  # Edit with your settings (see Configuration section)

# 3. Start services
docker compose -f docker-compose.production.yml up -d

# 4. (Optional) Enable monitoring
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

Access the application at: http://localhost:3000

---

## System Requirements

### Minimum Requirements
- **OS**: Linux, macOS, or Windows with Docker
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB available space
- **Docker**: 24.0+ with Compose V2
- **Network**: Ports 3000, 5432 available

### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 50+ GB SSD
- **Network**: Reverse proxy (Nginx/Traefik) with SSL

### Supported Platforms
- ✅ **Linux AMD64** (x86_64 servers, VPS, cloud instances)
- ✅ **Linux ARM64** (Raspberry Pi 4/5, AWS Graviton, Apple Silicon servers)
- ✅ **Docker** 24.0 or later
- ✅ **Docker Compose** V2 (plugin version)

**Multi-Architecture Support**: Docker images are built for both `linux/amd64` and `linux/arm64` platforms.

---

## Installation Options

### Option 1: Docker Compose (Recommended)

**Best for**: Production deployments with database, monitoring included.

```bash
# Clone repository
git clone https://github.com/jansinger/ostsee-sichtung.git
cd ostsee-sichtung

# Configure
cp .env.docker .env
nano .env  # Set your passwords, Auth0 credentials, etc.

# Start all services (app + database)
docker compose -f docker-compose.production.yml up -d

# With monitoring (Prometheus + Grafana)
docker compose -f docker-compose.production.yml --profile monitoring up -d

# View logs
docker compose -f docker-compose.production.yml logs -f
```

### Option 2: Release Script with Local Database

**Best for**: Testing releases locally, development with real data, using existing PostgreSQL.

The `run-release.sh` script simplifies running Docker releases with a local PostgreSQL database:

```bash
# Run latest release
./run-release.sh

# Run specific version
./run-release.sh v2.0.3

# Stop container
./run-release.sh stop

# View logs
./run-release.sh logs

# Check status
./run-release.sh status

# Use different port
PORT=3001 ./run-release.sh
```

**Prerequisites:**
- Local PostgreSQL with PostGIS extension
- `.env` file with database connection and Auth0 credentials
- `uploads/` directory for file storage

See [Local Development Testing](#local-development-testing-with-rancher-desktop) for detailed setup instructions.

### Option 3: Standalone Container

**Best for**: Using external database, custom setups.

```bash
# Pull image
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

# Create uploads directory
mkdir -p ./uploads

# Run with external database
docker run -d \
  --name ostsee-tiere \
  -p 3000:3000 \
  -v ./uploads:/app/uploads \
  -e DATABASE_POSTGRES_URL="postgresql://user:pass@host:5432/dbname" \
  -e SESSION_SECRET="your-secret-key-here" \
  -e ENCRYPTION_KEY="your-64-char-hex-key" \
  -e AUTH0_CLIENT_ID="your-auth0-client-id" \
  -e AUTH0_CLIENT_SECRET="your-auth0-secret" \
  -e AUTH0_DOMAIN="your-tenant.auth0.com" \
  -e JWKS_URL="https://your-tenant.auth0.com/.well-known/jwks.json" \
  -e API_AUDIENCE="your-api-audience" \
  -e PUBLIC_SITE_URL="https://your-domain.com" \
  ghcr.io/jansinger/ostsee-sichtung:latest

# Alternative: Use named volume instead of bind mount
# -v ostsee-uploads:/app/uploads
```

### Option 4: Cloud Deployment

**Best for**: AWS ECS, Azure Container Instances, Google Cloud Run.

See [Cloud Deployment Guide](#cloud-deployment-patterns) below.

---

## Configuration

### Environment Variables

Create a `.env` file with your configuration. See [ENVIRONMENT.md](./ENVIRONMENT.md) for the complete reference.

**Minimal Configuration:**

```bash
# Database
DATABASE_POSTGRES_URL=postgresql://postgres:yourpassword@db:5432/ostsee

# Security (REQUIRED - generate secure values!)
SESSION_SECRET=your-secure-random-string-min-32-chars
ENCRYPTION_KEY=your-64-character-hexadecimal-encryption-key

# Auth0 (REQUIRED)
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_DOMAIN=your-tenant.auth0.com
JWKS_URL=https://your-tenant.auth0.com/.well-known/jwks.json
API_AUDIENCE=your-api-audience

# Application
PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=production
```

**Generate Secure Keys:**

```bash
# SESSION_SECRET (32+ characters)
openssl rand -base64 32

# ENCRYPTION_KEY (64 hex characters)
openssl rand -hex 32
```

---

## Storage Setup

Ostsee-Tiere supports multiple storage backends for uploaded media files.

### Local Storage (Default)

**Configuration:**
```bash
STORAGE_PROVIDER=local
UPLOAD_PATH=/app/uploads
```

**Docker Volume Options:**

**Option 1: Named Volume (Recommended for Production)**
```yaml
volumes:
  - uploads:/app/uploads
```

**Option 2: Bind Mount (Recommended for Development)**
```bash
# Using npm script (development) - automatically creates ./uploads directory
npm run docker:run

# Manual docker command
mkdir -p ./uploads
docker run -p 3000:3000 -v ./uploads:/app/uploads --env-file .env ostsee-tiere:latest
```

**Benefits of Bind Mount:**
- Direct access to files on host system
- Easy backup and inspection
- Simpler file management
- Ideal for development and testing

**Permission Requirements for Bind Mount:**
- **Container User ID**: 1001 (nodejs user)
- **Linux**: `sudo chown -R 1001:1001 ./uploads` (or use your user: `sudo chown -R $USER:$USER ./uploads`)
- **macOS/Windows**: Docker Desktop handles permissions automatically
- **Alternative**: Run container as your user: `docker run --user $(id -u):$(id -g) ...`

**Benefits of Named Volume:**
- Better performance on Docker Desktop
- Managed by Docker
- Easier migration between hosts
- No permission issues across platforms

**Backup:**
```bash
# Backup uploads (Named Volume)
docker run --rm -v ostsee-tiere_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads-backup-$(date +%Y%m%d).tar.gz /data

# Restore uploads (Named Volume)
docker run --rm -v ostsee-tiere_uploads:/data -v $(pwd):/backup \
  alpine tar xzf /backup/uploads-backup-20250116.tar.gz -C /

# Backup uploads (Bind Mount)
tar czf uploads-backup-$(date +%Y%m%d).tar.gz ./uploads

# Restore uploads (Bind Mount)
tar xzf uploads-backup-20250116.tar.gz
```

### Vercel Blob Storage

**Configuration:**
```bash
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

**Benefits**: Automatic CDN, no volume management needed.

### AWS S3 Storage

**Configuration:**
```bash
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-central-1
AWS_S3_BUCKET=ostsee-tiere-uploads
```

**S3 Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::ostsee-tiere-uploads/*"
    }
  ]
}
```

### Google Cloud Storage

**Configuration:**
```bash
STORAGE_PROVIDER=gcs
GOOGLE_CLOUD_PROJECT_ID=ostsee-tiere-project
GOOGLE_CLOUD_STORAGE_BUCKET=ostsee-tiere-uploads
GOOGLE_CLOUD_KEY_FILE=/app/config/gcs-key.json
```

---

## Database Configuration

### Recommended: External PostgreSQL Database (Production)

For production deployments, we **strongly recommend using an external PostgreSQL database** rather than the included Docker container. This provides:

- **Data persistence** independent of container lifecycle
- **Professional backup solutions** (managed services, point-in-time recovery)
- **High availability** options (replicas, failover)
- **Better performance** with dedicated resources
- **Easier scaling** and maintenance

**Requirements:**
- PostgreSQL 14+ (PostgreSQL 16 recommended)
- PostGIS 3.4+ extension installed
- Minimum 2 GB RAM dedicated to PostgreSQL

**Setup External Database:**

```sql
-- Connect as superuser
psql -h YOUR_DB_HOST -U postgres

-- Create database
CREATE DATABASE ostsee;

-- Connect to the new database
\c ostsee

-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create application user (recommended)
CREATE USER ostsee_app WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE ostsee TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ostsee_app;
```

**Configure Connection:**

Update your `.env` file:
```bash
DATABASE_POSTGRES_URL=postgresql://ostsee_app:your-secure-password@db.example.com:5432/ostsee
```

**Managed Database Services:**

| Provider | Service | PostGIS Support |
|----------|---------|-----------------|
| AWS | RDS for PostgreSQL | Yes (enable extension) |
| Google Cloud | Cloud SQL for PostgreSQL | Yes (enable extension) |
| Azure | Azure Database for PostgreSQL | Yes (enable extension) |
| DigitalOcean | Managed Databases | Yes (enable extension) |
| Supabase | PostgreSQL | Yes (built-in) |
| Neon | Serverless Postgres | Yes (built-in) |

### Alternative: Included PostgreSQL (Development/Testing)

The `docker-compose.production.yml` includes PostgreSQL 16 with PostGIS 3.4 for development and testing purposes.

> **Note:** For production use, we recommend an external database (see above).

**Access Database:**
```bash
# Connect to database
docker exec -it ostsee-tiere-db psql -U postgres -d ostsee

# View logs
docker logs ostsee-tiere-db
```

**Performance Tuning:**

Edit `.env` to adjust PostgreSQL settings:
```bash
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
POSTGRES_MAINTENANCE_WORK_MEM=64MB
POSTGRES_WORK_MEM=16MB
```

---

## Database Migration

If you're migrating from an existing schweinswalsichtung.de installation or another database, follow the comprehensive migration guide:

**[Database Migration Guide](./DATABASE_MIGRATION.md)**

The migration process includes:
1. **Export** data from the source database
2. **Import** into the new PostgreSQL instance
3. **Run migration scripts** to:
   - Generate reference IDs for all sightings
   - Migrate uploaded files to the new structure
   - Extract EXIF metadata from images

**Quick Migration Commands:**

```bash
# 1. Generate reference IDs for all sightings
npx tsx --env-file=.env src/tools/generate-reference-ids.ts

# 2. Migrate old uploads (after placing files in uploads/_old_uploads/)
npx tsx --env-file=.env src/tools/migrate-old-uploads.ts
```

See [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) for complete step-by-step instructions.

---

## Monitoring Setup

Ostsee-Tiere includes integrated monitoring with Prometheus and Grafana.

### Enable Monitoring

```bash
# Start with monitoring profile
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

**Access Points:**
- **Application**: http://localhost:3000
- **Grafana**: http://localhost:3001 (default: admin/admin)
- **Prometheus**: http://localhost:9090

### Grafana Setup

1. **Login**: http://localhost:3001 (admin/admin)
2. **Change Password**: Follow prompt on first login
3. **View Dashboards**: Navigate to "Dashboards" → "Ostsee-Tiere Overview"

**Pre-configured Metrics:**
- Application uptime and health
- CPU usage
- Memory consumption
- Network traffic
- Database connections
- Request rates and response times

### Custom Alerts (Optional)

Edit `monitoring/prometheus.yml` to add alerting rules:

```yaml
rule_files:
  - "alerts/*.yml"
```

Create `monitoring/alerts/app-alerts.yml`:

```yaml
groups:
  - name: ostsee-tiere
    rules:
      - alert: ApplicationDown
        expr: up{job="ostsee-tiere-app"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Application is down"
```

---

## Production Deployment

### Reverse Proxy Setup (Nginx)

**Example Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name ostsee-tiere.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ostsee-tiere.example.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/ostsee-tiere.crt;
    ssl_certificate_key /etc/ssl/private/ostsee-tiere.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size (50MB for images)
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d ostsee-tiere.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Docker Compose Production Tuning

**Adjust resource limits:**

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    restart: unless-stopped
```

---

## CI/CD and Release Process

### Automated Docker Image Publishing

Docker images are automatically built and published to GitHub Container Registry (GHCR) via GitHub Actions when:
- A new version tag is pushed (e.g., `v1.31.2`)
- A release is published
- The workflow is manually triggered

**Image Repository:** [`ghcr.io/jansinger/ostsee-sichtung`](https://github.com/jansinger/ostsee-sichtung/pkgs/container/ostsee-sichtung)

**Available Tags:**
- `latest` - Latest stable release
- `vX.Y.Z` - Specific version (e.g., `v1.31.3`)
- `main` - Latest build from main branch

### Retry Mechanism for Transient Errors

The Docker Release workflow includes automatic retry logic to handle transient registry errors (such as 502 Bad Gateway):

**Retry Strategy:**
- **Maximum Attempts**: 3
- **Wait Between Retries**: 
  - First retry: 60 seconds
  - Second retry: 120 seconds (exponential backoff)
- **Behavior**: Each failed push attempt is automatically retried with increasing wait times

**Why This Matters:**
GitHub Container Registry (GHCR) may occasionally experience temporary unavailability or rate limiting, especially during:
- Multi-platform builds (linux/amd64, linux/arm64)
- Large layer uploads
- High GitHub Actions usage periods

The retry mechanism ensures that transient infrastructure issues don't block your releases. The workflow will:
1. ✅ Succeed on first attempt (most common case)
2. ⚠️ Retry after 60 seconds if first attempt fails
3. ⚠️ Retry after 120 seconds if second attempt fails
4. ❌ Only fail permanently after all 3 attempts are exhausted

**Monitoring:**
Check the workflow logs at: https://github.com/jansinger/ostsee-sichtung/actions/workflows/docker-release.yml

Each retry attempt is clearly logged with attempt numbers and wait times.

### Image Verification

After a successful push, the workflow generates:
- **Image Digest**: Cryptographic hash of the image
- **Image Tags**: All applied tags (version, latest, etc.)
- **Pull Command**: Ready-to-use command with digest for verification

Download these details from GitHub Actions artifacts (retention: 90 days).

---

## Backup & Restore

### Database Backup

**Automated Backup Script:**

Create `backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="ostsee-tiere-db"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" pg_dump -U postgres ostsee | \
  gzip > "$BACKUP_DIR/ostsee-backup-$DATE.sql.gz"

# Keep last 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: ostsee-backup-$DATE.sql.gz"
```

**Cron Job (Daily 2 AM):**
```bash
0 2 * * * /usr/local/bin/backup-db.sh >> /var/log/ostsee-backup.log 2>&1
```

**Restore Database:**
```bash
# Stop application
docker compose -f docker-compose.production.yml stop app

# Restore
gunzip -c ostsee-backup-20250116_020000.sql.gz | \
  docker exec -i ostsee-tiere-db psql -U postgres ostsee

# Restart application
docker compose -f docker-compose.production.yml start app
```

### Volume Backup

```bash
# Backup all volumes
docker run --rm \
  -v ostsee-tiere_uploads:/uploads \
  -v ostsee-tiere_pgdata:/pgdata \
  -v $(pwd)/backups:/backup \
  alpine sh -c "tar czf /backup/volumes-backup-$(date +%Y%m%d).tar.gz /uploads /pgdata"
```

---

## Local Development Testing with Rancher Desktop

This section covers running Docker releases locally for testing with Rancher Desktop on macOS and a local PostgreSQL database.

### Prerequisites

1. **Rancher Desktop** installed (https://rancherdesktop.io/)
2. **Local PostgreSQL** with PostGIS extension
3. **Caddy** for HTTPS proxy (required due to CSP `upgrade-insecure-requests`)

### Step 1: Configure PostgreSQL for Docker Access

Rancher Desktop uses a Lima VM, so containers cannot access `localhost` directly. PostgreSQL must listen on all interfaces:

**Edit postgresql.conf:**
```bash
# Find your PostgreSQL config
psql -c "SHOW config_file;"

# Edit the file (example path for Homebrew PostgreSQL 18)
nano /opt/homebrew/var/postgresql@18/postgresql.conf

# Change this line:
listen_addresses = '*'    # Was: #listen_addresses = 'localhost'
```

**Edit pg_hba.conf to allow network connections:**
```bash
# Add this line to pg_hba.conf (same directory as postgresql.conf)
echo "host    all    all    192.168.0.0/16    scram-sha-256" >> /opt/homebrew/var/postgresql@18/pg_hba.conf
```

**Restart PostgreSQL:**
```bash
brew services restart postgresql@18
```

### Step 2: Configure Environment

Create or update your `.env` file:
```bash
# Database (use localhost - the script will auto-detect and adjust for Rancher)
DATABASE_POSTGRES_URL="postgresql://ostsee_app:your-password@localhost:5432/ostsee"

# Storage
STORAGE_PROVIDER=local

# Security
SESSION_SECRET=your-secure-random-string-min-32-chars
ENCRYPTION_KEY=your-64-character-hexadecimal-encryption-key

# Auth0 (can use test values for local testing)
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_DOMAIN=your-tenant.auth0.com
JWKS_URL=https://your-tenant.auth0.com/.well-known/jwks.json
API_AUDIENCE=your-api-audience
```

### Step 3: Run the Release

```bash
# Run latest release
./run-release.sh

# The script automatically:
# - Detects Rancher Desktop
# - Replaces localhost with your host IP in DATABASE_POSTGRES_URL
# - Creates uploads directory
# - Starts the container with proper settings
```

**Output example:**
```
Detected Docker runtime: rancher
Rancher Desktop detected - adjusting database connection
Host IP: 192.168.68.51
Note: PostgreSQL must be configured to accept connections from Docker

Starting Ostsee-Tiere Release Container
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Runtime:   rancher
Image:     ghcr.io/jansinger/ostsee-sichtung:latest
Port:      http://localhost:3000
Database:  postgresql://ostsee_app:***@192.168.68.51:5432/ostsee
Uploads:   /path/to/project/uploads
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: HTTPS Access (Required)

The production Docker image includes `upgrade-insecure-requests` in its Content Security Policy, which forces browsers to use HTTPS. You need a local HTTPS proxy:

**Install and run Caddy:**
```bash
# Install Caddy
brew install caddy

# Start HTTPS reverse proxy
caddy reverse-proxy --from localhost:3443 --to localhost:3000

# Keep running in background
caddy reverse-proxy --from localhost:3443 --to localhost:3000 &
```

**Access the application:**
```
https://localhost:3443
```

> **Note:** You'll see a certificate warning on first access. Click "Advanced" → "Proceed to localhost" to accept the local certificate.

### Step 5: Commands Reference

```bash
./run-release.sh              # Run latest release
./run-release.sh v2.0.3       # Run specific version
./run-release.sh stop         # Stop container
./run-release.sh logs         # View logs (follow mode)
./run-release.sh status       # Check container status

PORT=3001 ./run-release.sh    # Use different port
```

### Troubleshooting Rancher Desktop

**Database connection refused:**
```bash
# Verify PostgreSQL is listening on all interfaces
lsof -i :5432
# Should show: postgres ... *:postgresql (LISTEN)

# Check pg_hba.conf has the network rule
cat /opt/homebrew/var/postgresql@18/pg_hba.conf | grep 192.168
```

**CSS/Assets not loading:**
This is caused by `upgrade-insecure-requests` CSP. Use the HTTPS proxy:
```bash
caddy reverse-proxy --from localhost:3443 --to localhost:3000
```

**Container starts but health check fails:**
```bash
# Check container logs
./run-release.sh logs

# Common issues:
# - Database connection: Check PostgreSQL config
# - Missing env vars: Check .env file
```

---

## Production with External PostgreSQL

This section covers deploying Docker in production using an existing PostgreSQL server (not in Docker).

### Architecture

```
┌──────────────────┐     ┌─────────────────────┐
│  Docker Host     │     │  Database Server    │
│  ┌────────────┐  │     │  ┌───────────────┐  │
│  │ ostsee-    │  │────▶│  │ PostgreSQL    │  │
│  │ tiere-app  │  │     │  │ + PostGIS     │  │
│  └────────────┘  │     │  └───────────────┘  │
│  ┌────────────┐  │     └─────────────────────┘
│  │ ./uploads  │  │
│  └────────────┘  │
│  ┌────────────┐  │
│  │ nginx/     │  │
│  │ caddy      │  │
│  └────────────┘  │
└──────────────────┘
```

### Prerequisites

1. **PostgreSQL Server** with PostGIS extension (can be on same or different host)
2. **Docker** installed on application server
3. **Reverse Proxy** (Nginx, Caddy, or Traefik) for SSL termination

### Step 1: Configure PostgreSQL Server

On your PostgreSQL server:

```sql
-- Create database
CREATE DATABASE ostsee;
\c ostsee

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create application user
CREATE USER ostsee_app WITH PASSWORD 'secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE ostsee TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ostsee_app;
```

**Configure pg_hba.conf to allow Docker connections:**
```
# Allow connections from Docker host
host    ostsee    ostsee_app    DOCKER_HOST_IP/32    scram-sha-256

# Or allow from entire subnet
host    ostsee    ostsee_app    10.0.0.0/8    scram-sha-256
```

**Configure postgresql.conf:**
```
listen_addresses = '*'
```

### Step 2: Create Environment File

On your Docker host, create `.env`:

```bash
# Database - use the PostgreSQL server's hostname/IP
DATABASE_POSTGRES_URL=postgresql://ostsee_app:secure-password@db.example.com:5432/ostsee

# Storage
STORAGE_PROVIDER=local

# Application
NODE_ENV=production
PUBLIC_SITE_URL=https://ostsee-tiere.example.com
PORT=3000

# Security (generate with: openssl rand -base64 32 / openssl rand -hex 32)
SESSION_SECRET=your-secure-random-string-min-32-chars
ENCRYPTION_KEY=your-64-character-hexadecimal-encryption-key

# Auth0
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_DOMAIN=your-tenant.auth0.com
JWKS_URL=https://your-tenant.auth0.com/.well-known/jwks.json
API_AUDIENCE=your-api-audience
```

### Step 3: Run Docker Container

```bash
# Create uploads directory
mkdir -p /opt/ostsee-tiere/uploads
chown 1001:1001 /opt/ostsee-tiere/uploads

# Pull and run
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

docker run -d \
  --name ostsee-tiere \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /opt/ostsee-tiere/uploads:/app/uploads \
  --env-file /opt/ostsee-tiere/.env \
  ghcr.io/jansinger/ostsee-sichtung:latest
```

> **Note:** We bind to `127.0.0.1:3000` so the app is only accessible via the reverse proxy.

### Step 4: Configure Reverse Proxy

**Nginx example:**
```nginx
server {
    listen 80;
    server_name ostsee-tiere.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ostsee-tiere.example.com;

    ssl_certificate /etc/letsencrypt/live/ostsee-tiere.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ostsee-tiere.example.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy example (auto-SSL):**
```
ostsee-tiere.example.com {
    reverse_proxy localhost:3000
}
```

### Step 5: Systemd Service (Optional)

Create `/etc/systemd/system/ostsee-tiere.service`:

```ini
[Unit]
Description=Ostsee-Tiere Marine Sighting Platform
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=5
ExecStartPre=-/usr/bin/docker stop ostsee-tiere
ExecStartPre=-/usr/bin/docker rm ostsee-tiere
ExecStart=/usr/bin/docker run --rm \
  --name ostsee-tiere \
  -p 127.0.0.1:3000:3000 \
  -v /opt/ostsee-tiere/uploads:/app/uploads \
  --env-file /opt/ostsee-tiere/.env \
  ghcr.io/jansinger/ostsee-sichtung:latest
ExecStop=/usr/bin/docker stop ostsee-tiere

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable ostsee-tiere
sudo systemctl start ostsee-tiere
sudo systemctl status ostsee-tiere
```

### Update Process

```bash
# Pull new image
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

# Restart container
docker stop ostsee-tiere
docker rm ostsee-tiere
docker run -d \
  --name ostsee-tiere \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /opt/ostsee-tiere/uploads:/app/uploads \
  --env-file /opt/ostsee-tiere/.env \
  ghcr.io/jansinger/ostsee-sichtung:latest

# Or with systemd
sudo systemctl restart ostsee-tiere
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
docker logs ostsee-tiere-app
```

**Common issues:**
- Missing environment variables → Check `.env` file
- Database not ready → Wait for `db` health check
- Port already in use → Change `APP_PORT` in `.env`

### Database Connection Errors

```bash
# Test database connectivity
docker exec ostsee-tiere-db pg_isready -U postgres

# Check database logs
docker logs ostsee-tiere-db

# Verify connection string
docker exec ostsee-tiere-app env | grep DATABASE_POSTGRES_URL
```

### Upload Issues

```bash
# Check volume permissions
docker exec ostsee-tiere-app ls -la /app/uploads

# Check storage configuration
docker exec ostsee-tiere-app env | grep STORAGE
```

### Performance Issues

```bash
# Check resource usage
docker stats ostsee-tiere-app ostsee-tiere-db

# View application metrics
curl http://localhost:3000/metrics
```

### Health Check Failures

```bash
# Manual health check
curl -f http://localhost:3000/health

# Check container health status
docker inspect ostsee-tiere-app | grep -A 10 Health
```

---

## Security Best Practices

### 1. Secure Secrets Management

**Never commit secrets to version control!**

Use Docker secrets or environment files with restricted permissions:

```bash
# Restrict .env file permissions
chmod 600 .env
chown root:root .env
```

### 2. Run as Non-Root User

The container already runs as non-root user `nodejs` (UID 1001).

### 3. Network Isolation

```yaml
networks:
  ostsee-network:
    driver: bridge
    internal: false  # Set to true for complete isolation
```

### 4. Read-Only Filesystem

Add to `docker-compose.production.yml`:

```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
```

### 5. Regular Updates

```bash
# Pull latest image
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

# Recreate containers
docker compose -f docker-compose.production.yml up -d
```

### 6. Security Scanning

Images are automatically scanned with Trivy during CI/CD. Check results:

```bash
# View scan results in GitHub Actions
# https://github.com/jansinger/ostsee-sichtung/actions

# Or scan locally
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image ghcr.io/jansinger/ostsee-sichtung:latest
```

---

## Cloud Deployment Patterns

### AWS ECS with Fargate

**Task Definition:**
```json
{
  "family": "ostsee-tiere",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "ghcr.io/jansinger/ostsee-sichtung:latest",
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "environment": [...],
      "secrets": [
        {"name": "SESSION_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
      ]
    }
  ]
}
```

### Google Cloud Run

```bash
gcloud run deploy ostsee-tiere \
  --image ghcr.io/jansinger/ostsee-sichtung:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_POSTGRES_URL="..." \
  --set-secrets SESSION_SECRET=session-secret:latest
```

### Azure Container Instances

```bash
az container create \
  --resource-group ostsee-tiere-rg \
  --name ostsee-tiere-app \
  --image ghcr.io/jansinger/ostsee-sichtung:latest \
  --cpu 2 --memory 4 \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    PUBLIC_SITE_URL=https://ostsee-tiere.azurewebsites.net \
  --secure-environment-variables \
    DATABASE_POSTGRES_URL="..." \
    SESSION_SECRET="..."
```

---

## Maintenance

### Update Application

```bash
# Pull latest image
docker compose -f docker-compose.production.yml pull

# Recreate containers (zero-downtime with health checks)
docker compose -f docker-compose.production.yml up -d

# Remove old images
docker image prune -f
```

### View Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker logs -f ostsee-tiere-app

# Last 100 lines
docker logs --tail 100 ostsee-tiere-app
```

### Cleanup

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes (CAREFUL!)
docker volume prune -f
```

---

## Support

### Getting Help

- **Issues**: https://github.com/jansinger/ostsee-sichtung/issues
- **Discussions**: https://github.com/jansinger/ostsee-sichtung/discussions
- **Documentation**: https://github.com/jansinger/ostsee-sichtung/tree/main/docs

### Reporting Security Issues

Please report security vulnerabilities via GitHub Security Advisories:
https://github.com/jansinger/ostsee-sichtung/security/advisories

**Do NOT create public GitHub issues for security vulnerabilities.**

---

## License

MIT License - See [LICENSE](../LICENSE) for details.

---

*Last Updated: December 2025*
