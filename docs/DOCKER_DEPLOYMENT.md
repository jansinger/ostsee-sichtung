# Docker Deployment Guide for Ostsee-Tiere

This comprehensive guide covers deploying the Ostsee-Tiere marine animal sighting platform using Docker containers. Docker is the **primary deployment method** for self-hosted installations.

> **Für Produktions-Deployments:** Siehe die fokussierte Anleitung [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) für einen schnellen, klaren Installationspfad.

## Table of Contents

- [Production Quick Start (5 Minuten)](#production-quick-start-5-minuten)
- [System Requirements](#system-requirements)
- [Installation Options](#installation-options)
- [Dedicated Server with Native PostgreSQL](#dedicated-server-with-native-postgresql)
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

## Production Quick Start (5 Minuten)

**Fastest path to a running production instance on a dedicated Linux server with native PostgreSQL.**

> **Note:** You don't need to clone the repository! The Docker image contains everything. You only need to create a `.env` file and an `uploads` directory.

### Prerequisites

- Debian 12 / Ubuntu 22.04+ Server
- Docker 24+ installed (`curl -fsSL https://get.docker.com | sh`)
- PostgreSQL 18 with PostGIS installed (see [PostGIS Installation](#postgis-installation))
- Domain with DNS pointing to server (optional, for SSL)

### Step-by-Step Installation

```bash
# 1. Create deployment directory
sudo mkdir -p /opt/ostsee-tiere
cd /opt/ostsee-tiere

# 2. Install PostgreSQL with PostGIS (if not already installed)
sudo apt update
sudo apt install -y postgresql-18 postgresql-18-postgis-3 postgresql-18-postgis-3-scripts

# 3. Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE ostsee;
\c ostsee
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE USER ostsee_app WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ostsee TO ostsee_app;
GRANT ALL ON SCHEMA public TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ostsee_app;
EOF

# 4. Configure PostgreSQL for Docker access
DOCKER_GATEWAY=$(docker network inspect bridge -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}')
echo "Docker Gateway IP: $DOCKER_GATEWAY"

echo "host    ostsee    ostsee_app    ${DOCKER_GATEWAY}/16    scram-sha-256" | \
  sudo tee -a /etc/postgresql/18/main/pg_hba.conf

# Configure PostgreSQL to listen on Docker gateway (more robust than editing config file)
sudo -u postgres psql -c "ALTER SYSTEM SET listen_addresses = 'localhost,${DOCKER_GATEWAY}';"
sudo systemctl restart postgresql

# 5. Create .env file (no repository clone needed!)
cat > .env << 'EOF'
# Database - use Docker gateway IP (typically 172.17.0.1)
DATABASE_POSTGRES_URL="postgresql://ostsee_app:YOUR_SECURE_PASSWORD@172.17.0.1:5432/ostsee"

# Storage
STORAGE_PROVIDER=local
UPLOAD_PATH=/app/uploads

# Application
NODE_ENV=production
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000

# Security - GENERATE THESE:
# SESSION_SECRET: openssl rand -base64 32
# ENCRYPTION_KEY: openssl rand -hex 32
SESSION_SECRET=REPLACE_WITH_GENERATED_VALUE
ENCRYPTION_KEY=REPLACE_WITH_GENERATED_VALUE

# Auth0 - get these from your Auth0 dashboard
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_DOMAIN=your-tenant.auth0.com
JWKS_URL=https://your-tenant.auth0.com/.well-known/jwks.json
API_AUDIENCE=your-api-audience
EOF

# Edit .env with your actual values
nano .env

# 6. Create uploads directory
mkdir -p uploads
sudo chown 1001:1001 uploads

# 7. Secure .env file
chmod 600 .env

# 8. Pull and start container
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

docker run -d \
  --name ostsee-tiere \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /opt/ostsee-tiere/uploads:/app/uploads \
  --env-file /opt/ostsee-tiere/.env \
  ghcr.io/jansinger/ostsee-sichtung:latest

# 9. Initialize database schema
docker exec ostsee-tiere npx drizzle-kit push

# 10. Verify installation
curl -f http://localhost:3000/health && echo "Success!"

# 11. Setup reverse proxy with SSL (Caddy example - auto-HTTPS)
sudo apt install -y caddy
echo "your-domain.com {
    reverse_proxy localhost:3000
}" | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

**Done!** Access your installation at `https://your-domain.com`

---

## Quick Start (Docker Compose - All-in-One)

For development or testing with PostgreSQL running inside Docker.

> **Note:** Docker Compose requires downloading `docker-compose.production.yml` and optionally the monitoring configuration.

```bash
# 1. Create deployment directory
mkdir -p ostsee-tiere && cd ostsee-tiere

# 2. Download required files
curl -O https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/docker-compose.production.yml
curl -O https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/.env.docker

# 3. (Optional) Download monitoring config
mkdir -p monitoring/grafana/provisioning/datasources monitoring/grafana/provisioning/dashboards monitoring/grafana/dashboards
curl -o monitoring/prometheus.yml https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/monitoring/prometheus.yml
curl -o monitoring/grafana/provisioning/datasources/prometheus.yml https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/monitoring/grafana/provisioning/datasources/prometheus.yml
curl -o monitoring/grafana/provisioning/dashboards/default.yml https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/monitoring/grafana/provisioning/dashboards/default.yml
curl -o monitoring/grafana/dashboards/ostsee-tiere-overview.json https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/monitoring/grafana/dashboards/ostsee-tiere-overview.json

# 4. Configure environment
cp .env.docker .env
nano .env  # Edit: Auth0 credentials, SESSION_SECRET, ENCRYPTION_KEY

# 5. Start all services (app + database)
docker compose -f docker-compose.production.yml up -d

# 6. Initialize database schema
docker exec ostsee-tiere-app npx drizzle-kit push

# 7. (Optional) Enable monitoring
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

## Dedicated Server with Native PostgreSQL

This section provides complete instructions for deploying on a dedicated Linux server where PostgreSQL runs natively (not in Docker). This is the **recommended production setup**.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Dedicated Server                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Reverse Proxy (Caddy/Nginx)                             ││
│  │ Port 443 (HTTPS) → localhost:3000                       ││
│  └─────────────────────────────────────────────────────────┘│
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Docker Container: ostsee-tiere                          ││
│  │ Port 3000 (internal)                                    ││
│  │ Volume: ./uploads → /app/uploads                        ││
│  └─────────────────────────────────────────────────────────┘│
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Native PostgreSQL + PostGIS                             ││
│  │ Port 5432 (localhost + Docker bridge: 172.17.0.1)       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### PostGIS Installation

PostgreSQL with PostGIS must be installed natively on your server.

**Debian 12 / Ubuntu 22.04+:**

```bash
# Add PostgreSQL repository for latest version
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# Install PostgreSQL 18 with PostGIS
sudo apt update
sudo apt install -y postgresql-18 postgresql-18-postgis-3 postgresql-18-postgis-3-scripts

# Verify installation
sudo -u postgres psql -c "SELECT version();"
sudo -u postgres psql -c "SELECT PostGIS_Version();"
```

**RHEL/CentOS/Rocky Linux 9:**

```bash
# Install PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL 18 with PostGIS
sudo dnf install -y postgresql18-server postgresql18-contrib postgis35_18

# Initialize and start
sudo /usr/pgsql-18/bin/postgresql-18-setup initdb
sudo systemctl enable --now postgresql-18
```

### Database Setup

```bash
# Create database and enable PostGIS
sudo -u postgres psql << 'EOF'
-- Create database
CREATE DATABASE ostsee;

-- Connect and enable extensions
\c ostsee
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create application user with secure password
CREATE USER ostsee_app WITH PASSWORD 'GENERATE_SECURE_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ostsee TO ostsee_app;
GRANT ALL ON SCHEMA public TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ostsee_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ostsee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ostsee_app;

-- Verify
\dx
EOF
```

**Generate a secure password:**

```bash
openssl rand -base64 24
```

### Docker-to-Host Network Configuration

Docker containers cannot access `localhost` directly. They must connect via the Docker bridge network.

**Step 1: Find Docker Bridge Gateway IP**

```bash
# Get the gateway IP (typically 172.17.0.1)
DOCKER_GATEWAY=$(docker network inspect bridge -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}')
echo "Docker Gateway: $DOCKER_GATEWAY"
```

**Step 2: Configure PostgreSQL to Listen on Docker Bridge**

Configure PostgreSQL to listen on Docker gateway:

```bash
# Option 1: Use ALTER SYSTEM (recommended - more robust)
sudo -u postgres psql -c "ALTER SYSTEM SET listen_addresses = 'localhost,172.17.0.1';"

# Option 2: Manually edit postgresql.conf
sudo nano /etc/postgresql/18/main/postgresql.conf
# Change: listen_addresses = 'localhost,172.17.0.1'

# Restart to apply changes
sudo systemctl restart postgresql
```

**Step 3: Configure pg_hba.conf for Docker Access**

Edit `/etc/postgresql/18/main/pg_hba.conf`:

```bash
# Add Docker network access (add before other host entries)
echo "# Docker container access
host    ostsee    ostsee_app    172.17.0.0/16    scram-sha-256" | \
  sudo tee -a /etc/postgresql/18/main/pg_hba.conf
```

**Step 4: Restart PostgreSQL**

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql

# Verify PostgreSQL is listening on Docker gateway
ss -tlnp | grep 5432
# Should show: *:5432 or 0.0.0.0:5432 or specific IPs
```

**Step 5: Test Connection from Docker**

```bash
# Test with a temporary container
docker run --rm postgres:18 \
  psql "postgresql://ostsee_app:YOUR_PASSWORD@172.17.0.1:5432/ostsee" \
  -c "SELECT 1 AS test;"
```

### Environment Configuration

Create `.env` file:

```bash
# Database - use Docker gateway IP, NOT localhost
DATABASE_POSTGRES_URL="postgresql://ostsee_app:YOUR_SECURE_PASSWORD@172.17.0.1:5432/ostsee"

# Storage
STORAGE_PROVIDER=local
UPLOAD_PATH=/app/uploads

# Application
NODE_ENV=production
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000

# Security (GENERATE THESE!)
# openssl rand -base64 32
SESSION_SECRET=your-generated-session-secret-here
# openssl rand -hex 32
ENCRYPTION_KEY=your-generated-64-char-hex-key-here

# Auth0
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_DOMAIN=your-tenant.auth0.com
JWKS_URL=https://your-tenant.auth0.com/.well-known/jwks.json
API_AUDIENCE=your-api-audience
```

### Container Deployment

```bash
# Create uploads directory with correct permissions
mkdir -p /opt/ostsee-tiere/uploads
sudo chown 1001:1001 /opt/ostsee-tiere/uploads

# Copy .env to deployment directory
cp .env /opt/ostsee-tiere/.env
chmod 600 /opt/ostsee-tiere/.env

# Pull latest image
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

# Run container (bind to localhost only - use reverse proxy for external access)
docker run -d \
  --name ostsee-tiere \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /opt/ostsee-tiere/uploads:/app/uploads \
  --env-file /opt/ostsee-tiere/.env \
  ghcr.io/jansinger/ostsee-sichtung:latest

# Initialize database schema (first time only)
docker exec ostsee-tiere npx drizzle-kit push

# Verify
docker logs ostsee-tiere
curl -f http://localhost:3000/health
```

### Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# Note: Do NOT open port 3000 - only accessible via reverse proxy

# firewalld (RHEL/CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Reverse Proxy Setup

**Option A: Caddy (Recommended - Auto-HTTPS)**

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configure
sudo tee /etc/caddy/Caddyfile << 'EOF'
your-domain.com {
    reverse_proxy localhost:3000

    # Recommended headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
}
EOF

# Start
sudo systemctl enable --now caddy
```

**Option B: Nginx with Let's Encrypt**

```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Configure (certbot modifies this automatically)
sudo tee /etc/nginx/sites-available/ostsee-tiere << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

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
EOF

sudo ln -sf /etc/nginx/sites-available/ostsee-tiere /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Systemd Service (Optional)

For automatic container management:

```bash
sudo tee /etc/systemd/system/ostsee-tiere.service << 'EOF'
[Unit]
Description=Ostsee-Tiere Marine Sighting Platform
After=docker.service postgresql.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
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
EOF

sudo systemctl daemon-reload
sudo systemctl enable ostsee-tiere
sudo systemctl start ostsee-tiere
```

### Update Process

```bash
# Pull new image
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

# Restart (with systemd)
sudo systemctl restart ostsee-tiere

# Or manually
docker stop ostsee-tiere
docker rm ostsee-tiere
docker run -d \
  --name ostsee-tiere \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /opt/ostsee-tiere/uploads:/app/uploads \
  --env-file /opt/ostsee-tiere/.env \
  ghcr.io/jansinger/ostsee-sichtung:latest

# Clean up old images
docker image prune -f
```

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
			"Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
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

- PostgreSQL 16+ (PostgreSQL 18 recommended)
- PostGIS 3.6+ extension installed
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

| Provider     | Service                       | PostGIS Support        |
| ------------ | ----------------------------- | ---------------------- |
| AWS          | RDS for PostgreSQL            | Yes (enable extension) |
| Google Cloud | Cloud SQL for PostgreSQL      | Yes (enable extension) |
| Azure        | Azure Database for PostgreSQL | Yes (enable extension) |
| DigitalOcean | Managed Databases             | Yes (enable extension) |
| Supabase     | PostgreSQL                    | Yes (built-in)         |
| Neon         | Serverless Postgres           | Yes (built-in)         |

### Alternative: Included PostgreSQL (Development/Testing)

The `docker-compose.production.yml` includes PostgreSQL 18 with PostGIS 3.6 for development and testing purposes.

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
  - 'alerts/*.yml'
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
          summary: 'Application is down'
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

> **Note:** For complete instructions on deploying with a PostgreSQL server (on the same host or a separate server), see the comprehensive [Dedicated Server with Native PostgreSQL](#dedicated-server-with-native-postgresql) section above.

**Quick Summary for External Database Server:**

If your PostgreSQL runs on a **separate server** (not the same host as Docker):

1. **Database URL**: Use the server's hostname/IP directly

   ```bash
   DATABASE_POSTGRES_URL=postgresql://ostsee_app:password@db.example.com:5432/ostsee
   ```

2. **PostgreSQL Configuration**: Ensure `listen_addresses = '*'` and add the Docker host's IP to `pg_hba.conf`

3. **Network**: Ensure port 5432 is accessible between servers (firewall rules)

All other steps (container deployment, reverse proxy, systemd) are identical to the [Dedicated Server](#dedicated-server-with-native-postgresql) section.

---

## Troubleshooting

### Quick Diagnostic Commands

```bash
# Check all container status
docker ps -a

# View application logs
docker logs ostsee-tiere       # or ostsee-tiere-app for Docker Compose

# Check container health
docker inspect ostsee-tiere --format='{{.State.Health.Status}}'

# Test health endpoint
curl -f http://localhost:3000/health

# Test database connection from container
docker exec ostsee-tiere npx drizzle-kit check
```

### Application Won't Start

**Check logs:**

```bash
docker logs ostsee-tiere
```

**Common issues and solutions:**

| Error                                  | Cause             | Solution                                             |
| -------------------------------------- | ----------------- | ---------------------------------------------------- |
| `DATABASE_POSTGRES_URL is not set`     | Missing env var   | Check `.env` file exists and is loaded               |
| `ECONNREFUSED 127.0.0.1:5432`          | Wrong DB host     | Use Docker gateway IP (172.17.0.1), not localhost    |
| `password authentication failed`       | Wrong credentials | Verify user/password in DATABASE_POSTGRES_URL        |
| `database "ostsee" does not exist`     | DB not created    | Run: `sudo -u postgres createdb ostsee`              |
| `relation "sichtungen" does not exist` | Schema not pushed | Run: `docker exec ostsee-tiere npx drizzle-kit push` |
| `Port 3000 already in use`             | Port conflict     | Change APP_PORT in .env or stop conflicting service  |

### Database Connection Errors

**For Docker Compose (PostgreSQL in container):**

```bash
# Test database connectivity
docker exec ostsee-tiere-db pg_isready -U postgres

# Check database logs
docker logs ostsee-tiere-db

# Connect to database
docker exec -it ostsee-tiere-db psql -U postgres -d ostsee
```

**For Native PostgreSQL (on host):**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL is listening on Docker gateway
ss -tlnp | grep 5432

# Test connection from Docker container
docker run --rm postgres:18 \
  psql "postgresql://ostsee_app:PASSWORD@172.17.0.1:5432/ostsee" -c "SELECT 1;"

# Check pg_hba.conf has Docker network
sudo grep 172.17 /etc/postgresql/18/main/pg_hba.conf
```

**Common database issues:**

| Symptom                      | Cause                                     | Solution                                 |
| ---------------------------- | ----------------------------------------- | ---------------------------------------- |
| Connection refused           | PostgreSQL not listening on Docker bridge | Add Docker gateway to `listen_addresses` |
| No pg_hba.conf entry         | Missing authentication rule               | Add Docker network to `pg_hba.conf`      |
| PostGIS not found            | Extension not installed                   | `CREATE EXTENSION postgis;`              |
| Permission denied for schema | Missing grants                            | Run GRANT commands from setup            |

### Upload/Storage Issues

```bash
# Check volume is mounted correctly
docker exec ostsee-tiere ls -la /app/uploads

# Check storage configuration
docker exec ostsee-tiere printenv | grep STORAGE

# Fix permissions (bind mount)
sudo chown -R 1001:1001 /opt/ostsee-tiere/uploads

# Test file creation
docker exec ostsee-tiere touch /app/uploads/test.txt && echo "OK"
```

### Schema/Migration Issues

```bash
# Check current schema status
docker exec ostsee-tiere npx drizzle-kit check

# Push schema to database
docker exec ostsee-tiere npx drizzle-kit push

# View pending changes
docker exec ostsee-tiere npx drizzle-kit generate
```

### Performance Issues

```bash
# Check resource usage
docker stats ostsee-tiere

# Check container processes
docker top ostsee-tiere

# View Node.js memory usage
docker exec ostsee-tiere node -e "console.log(process.memoryUsage())"
```

### Health Check Failures

```bash
# Manual health check
curl -v http://localhost:3000/health

# Check what health endpoint returns
docker exec ostsee-tiere curl -s http://localhost:3000/health | jq

# View health check history
docker inspect ostsee-tiere --format='{{json .State.Health}}' | jq
```

### SSL/HTTPS Issues

```bash
# Check if Caddy is running
sudo systemctl status caddy

# Check Caddy logs
sudo journalctl -u caddy -f

# Test HTTPS certificate
curl -vI https://your-domain.com 2>&1 | grep -A5 "Server certificate"

# Renew Let's Encrypt certificate (Nginx)
sudo certbot renew --dry-run
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
    internal: false # Set to true for complete isolation
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

_Last Updated: April 2026_
