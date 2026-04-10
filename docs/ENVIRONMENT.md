# Environment Variables Reference

Complete reference for all environment variables used in the Ostsee-Tiere platform.

## Table of Contents

- [Required Variables](#required-variables)
- [Database Configuration](#database-configuration)
- [Storage Configuration](#storage-configuration)
- [Application Settings](#application-settings)
- [Security Configuration](#security-configuration)
- [Auth0 Configuration](#auth0-configuration)
- [Email Configuration](#email-configuration)
- [Logging & Debugging](#logging--debugging)
- [Feature Flags](#feature-flags)
- [Docker-Specific Variables](#docker-specific-variables)
- [Quick Reference](#quick-reference)

---

## Required Variables

These variables **MUST** be set for the application to function:

### `DATABASE_POSTGRES_URL`

**Type**: `string` (Connection String)
**Required**: Yes
**Default**: None
**Description**: PostgreSQL connection string with PostGIS support.

**Format**:

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Examples**:

```bash
# Docker Compose (internal network)
DATABASE_POSTGRES_URL=postgresql://postgres:mysecretpassword@db:5432/ostsee

# External database
DATABASE_POSTGRES_URL=postgresql://ostsee_user:secure-pass@db.example.com:5432/ostsee

# AWS RDS
DATABASE_POSTGRES_URL=postgresql://admin:password@ostsee-db.xxxxx.eu-central-1.rds.amazonaws.com:5432/ostsee

# Connection pooling with pgbouncer
DATABASE_POSTGRES_URL=postgresql://user:pass@pgbouncer:6432/ostsee
```

---

### `SESSION_SECRET`

**Type**: `string`
**Required**: Yes
**Default**: None
**Min Length**: 32 characters
**Description**: Secret key for encrypting session data.

**Generate**:

```bash
openssl rand -base64 32
```

**Example**:

```bash
SESSION_SECRET=8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE
```

---

### `ENCRYPTION_KEY`

**Type**: `string` (Hexadecimal)
**Required**: Yes
**Default**: None
**Length**: 64 characters (32 bytes hex-encoded)
**Description**: Encryption key for sensitive data.

**Generate**:

```bash
openssl rand -hex 32
```

**Example**:

```bash
ENCRYPTION_KEY=f5fcd0aaabcc4bdd0a87d4b2c03203e5863c0459f89fe99dab1fe8dde1cdf181
```

---

### `AUTH0_CLIENT_ID`

**Type**: `string`
**Required**: Yes
**Default**: None
**Description**: Auth0 application client ID.

**Example**:

```bash
AUTH0_CLIENT_ID=AbCdEfGhIjKlMnOpQrStUvWx
```

**Where to Find**: Auth0 Dashboard → Applications → Your App → Settings → Client ID

---

### `AUTH0_CLIENT_SECRET`

**Type**: `string`
**Required**: Yes
**Default**: None
**Description**: Auth0 application client secret.

**Example**:

```bash
AUTH0_CLIENT_SECRET=1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop
```

**Where to Find**: Auth0 Dashboard → Applications → Your App → Settings → Client Secret

---

### `AUTH0_DOMAIN`

**Type**: `string`
**Required**: Yes
**Default**: None
**Description**: Auth0 tenant domain.

**Format**:

```
[your-tenant].auth0.com
OR
[your-tenant].[region].auth0.com
```

**Examples**:

```bash
AUTH0_DOMAIN=ostsee-tiere.eu.auth0.com
AUTH0_DOMAIN=my-company.auth0.com
```

---

### `PUBLIC_SITE_URL`

**Type**: `string` (URL)
**Required**: Yes
**Default**: None
**Description**: Public URL where the application is accessible.

**Examples**:

```bash
# Development
PUBLIC_SITE_URL=http://localhost:3000

# Production
PUBLIC_SITE_URL=https://ostsee-tiere.example.com

# With subdomain
PUBLIC_SITE_URL=https://sightings.meeresmuseum.de
```

**Important**: Must match Auth0 callback URLs!

---

## Database Configuration

### `PGUSER`

**Type**: `string`
**Required**: No
**Default**: `postgres`
**Description**: PostgreSQL username (alternative to connection string).

---

### `PGPASSWORD`

**Type**: `string`
**Required**: No
**Default**: None
**Description**: PostgreSQL password (alternative to connection string).

---

### `PGDATABASE`

**Type**: `string`
**Required**: No
**Default**: `ostsee`
**Description**: PostgreSQL database name (alternative to connection string).

---

### `PGHOST`

**Type**: `string`
**Required**: No
**Default**: `localhost`
**Description**: PostgreSQL host (alternative to connection string).

---

### `PGPORT`

**Type**: `number`
**Required**: No
**Default**: `5432`
**Description**: PostgreSQL port (alternative to connection string).

---

### `POSTGRES_SHARED_BUFFERS`

**Type**: `string`
**Required**: No
**Default**: `256MB`
**Description**: PostgreSQL shared_buffers setting (Docker Compose only).

**Recommended Values**:

- Small server (4GB RAM): `256MB`
- Medium server (8GB RAM): `512MB`
- Large server (16GB+ RAM): `1GB` - `4GB`

---

### `POSTGRES_EFFECTIVE_CACHE_SIZE`

**Type**: `string`
**Required**: No
**Default**: `1GB`
**Description**: PostgreSQL effective_cache_size setting.

**Rule of Thumb**: 50-75% of total RAM

---

## Storage Configuration

### `STORAGE_PROVIDER`

**Type**: `enum`
**Required**: No
**Default**: `local`
**Options**: `local` | `vercel-blob`
**Description**: Storage backend for uploaded media files.

---

### Local Storage

#### `UPLOAD_PATH`

**Type**: `string` (Path)
**Required**: When `STORAGE_PROVIDER=local`
**Default**: `/app/uploads` (Docker), `uploads` (non-Docker)
**Description**: Directory path for uploaded files.

**Example**:

```bash
UPLOAD_PATH=/app/uploads
```

---

### Vercel Blob Storage

#### `BLOB_READ_WRITE_TOKEN`

**Type**: `string`
**Required**: When `STORAGE_PROVIDER=vercel-blob`
**Default**: None
**Description**: Vercel Blob storage API token.

**Example**:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Where to Find**: Vercel Dashboard → Project → Settings → Storage

---

## Application Settings

### `NODE_ENV`

**Type**: `enum`
**Required**: No
**Default**: `production`
**Options**: `development` | `production` | `test`
**Description**: Node.js environment mode.

**Effects**:

- `development`: Debug logging, hot reload, detailed errors
- `production`: Optimized builds, error suppression, caching
- `test`: Test configurations, mock data

---

### `PORT`

**Type**: `number`
**Required**: No
**Default**: `3000`
**Description**: Port number for the application server.

**Example**:

```bash
PORT=3000
```

---

### `HOST`

**Type**: `string`
**Required**: No
**Default**: `0.0.0.0`
**Description**: Host address to bind the server.

**Options**:

- `0.0.0.0`: Listen on all interfaces (Docker default)
- `localhost`: Listen only on localhost
- Specific IP: Bind to specific network interface

---

### `BODY_SIZE_LIMIT`

**Type**: `number` (bytes)
**Required**: No
**Default**: `52428800` (50MB)
**Description**: Maximum size for request body (file uploads).

**Examples**:

```bash
# 50 MB (default)
BODY_SIZE_LIMIT=52428800

# 100 MB
BODY_SIZE_LIMIT=104857600

# 10 MB
BODY_SIZE_LIMIT=10485760
```

---

### `COOKIE_NAME`

**Type**: `string`
**Required**: No
**Default**: `auth-cookie`
**Description**: Name of the authentication cookie.

---

## Security Configuration

### `JWKS_URL`

**Type**: `string` (URL)
**Required**: Yes (for Auth0)
**Default**: None
**Description**: JSON Web Key Set URL for Auth0 token verification.

**Format**:

```
https://[AUTH0_DOMAIN]/.well-known/jwks.json
```

**Example**:

```bash
JWKS_URL=https://ostsee-tiere.eu.auth0.com/.well-known/jwks.json
```

---

### `API_AUDIENCE`

**Type**: `string`
**Required**: Yes (for Auth0 API)
**Default**: None
**Description**: Auth0 API identifier/audience.

**Example**:

```bash
API_AUDIENCE=https://api.ostsee-tiere.example.com
```

**Where to Find**: Auth0 Dashboard → APIs → Your API → Settings → Identifier

---

## Email Configuration

### `SMTP_HOST`

**Type**: `string`
**Required**: No (if email features disabled)
**Default**: None
**Description**: SMTP server hostname.

**Examples**:

```bash
# Gmail
SMTP_HOST=smtp.gmail.com

# SendGrid
SMTP_HOST=smtp.sendgrid.net

# Mailgun
SMTP_HOST=smtp.mailgun.org

# Custom
SMTP_HOST=mail.example.com
```

---

### `SMTP_PORT`

**Type**: `number`
**Required**: No
**Default**: `587`
**Description**: SMTP server port.

**Common Ports**:

- `587`: TLS (recommended)
- `465`: SSL
- `25`: Unencrypted (not recommended)

---

### `SMTP_USER`

**Type**: `string`
**Required**: No
**Default**: None
**Description**: SMTP authentication username.

---

### `SMTP_PASSWORD`

**Type**: `string`
**Required**: No
**Default**: None
**Description**: SMTP authentication password.

---

## Logging & Debugging

### `LOG_LEVEL`

**Type**: `enum`
**Required**: No
**Default**: `info`
**Options**: `trace` | `debug` | `info` | `warn` | `error` | `fatal`
**Description**: Minimum log level to output.

**Levels Explained**:

- `trace`: Most verbose, all details
- `debug`: Development debugging information
- `info`: General informational messages (default)
- `warn`: Warning messages
- `error`: Error messages only
- `fatal`: Only fatal errors

**Example**:

```bash
# Production
LOG_LEVEL=info

# Development
LOG_LEVEL=debug

# Troubleshooting
LOG_LEVEL=trace
```

---

### `ENABLE_DEBUG_LOGGING`

**Type**: `boolean`
**Required**: No
**Default**: `false`
**Description**: Enable detailed debug logging.

**Values**: `true` | `false`

---

## Feature Flags

### `ENABLE_ANALYTICS`

**Type**: `boolean`
**Required**: No
**Default**: `false`
**Description**: Enable analytics tracking.

---

### `RUN_MIGRATIONS`

**Type**: `boolean`
**Required**: No
**Default**: `false`
**Description**: Run database migrations on container startup.

**Example**:

```bash
RUN_MIGRATIONS=true
```

---

## Docker-Specific Variables

### `APP_PORT`

**Type**: `number`
**Required**: No (Docker Compose)
**Default**: `3000`
**Description**: External port mapping for application (Docker Compose).

---

### `DB_PORT`

**Type**: `number`
**Required**: No (Docker Compose)
**Default**: `5432`
**Description**: External port mapping for database (Docker Compose).

---

### `PROMETHEUS_PORT`

**Type**: `number`
**Required**: No (Docker Compose)
**Default**: `9090`
**Description**: External port mapping for Prometheus (Docker Compose).

---

### `GRAFANA_PORT`

**Type**: `number`
**Required**: No (Docker Compose)
**Default**: `3001`
**Description**: External port mapping for Grafana (Docker Compose).

---

### `GRAFANA_ADMIN_USER`

**Type**: `string`
**Required**: No (Docker Compose)
**Default**: `admin`
**Description**: Grafana admin username.

---

### `GRAFANA_ADMIN_PASSWORD`

**Type**: `string`
**Required**: No (Docker Compose)
**Default**: `admin`
**Description**: Grafana admin password.

**Important**: Change this in production!

---

## Quick Reference

### Minimal Production Configuration

```bash
# Database (REQUIRED)
DATABASE_POSTGRES_URL=postgresql://user:pass@host:5432/dbname

# Security (REQUIRED)
SESSION_SECRET=<32+ char random string>
ENCRYPTION_KEY=<64 char hex string>

# Auth0 (REQUIRED)
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>
AUTH0_DOMAIN=<your-tenant>.auth0.com
JWKS_URL=https://<your-tenant>.auth0.com/.well-known/jwks.json
API_AUDIENCE=<your-api-identifier>

# Application (REQUIRED)
PUBLIC_SITE_URL=https://your-domain.com
NODE_ENV=production

# Storage (REQUIRED)
STORAGE_PROVIDER=local
UPLOAD_PATH=/app/uploads
```

### Complete Production Configuration

See [.env.example](../.env.example) for a complete annotated example.

---

### Validation Checklist

Before deploying, verify:

- [ ] `DATABASE_POSTGRES_URL` is set and valid
- [ ] `SESSION_SECRET` is at least 32 characters
- [ ] `ENCRYPTION_KEY` is exactly 64 hex characters
- [ ] All Auth0 variables are configured
- [ ] `PUBLIC_SITE_URL` matches your domain
- [ ] Storage provider is configured correctly
- [ ] Email settings are configured (if using email)
- [ ] Sensitive values are not committed to git
- [ ] `.env` file has restricted permissions (600)

---

## Security Recommendations

1. **Never commit `.env` files to version control**
2. **Use strong, randomly generated secrets**
3. **Rotate secrets regularly** (every 90 days)
4. **Restrict `.env` file permissions**: `chmod 600 .env`
5. **Use environment-specific secrets** (dev ≠ staging ≠ production)
6. **Use secret management services** in production (AWS Secrets Manager, Azure Key Vault, etc.)
7. **Enable audit logging** for secret access
8. **Document who has access** to production secrets

---

## Support

For questions about environment configuration:

- **Documentation**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **Issues**: https://github.com/jansinger/ostsee-sichtung/issues
- **Example File**: [.env.example](../.env.example)

---

_Last Updated: April 2026_
