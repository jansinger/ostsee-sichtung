# Database Migration Guide

This guide covers migrating data from an existing schweinswalsichtung.de installation or another PostgreSQL database to the new Ostsee-Tiere platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Migration Steps](#migration-steps)
  - [Step 1: Export from Source Database](#step-1-export-from-source-database)
  - [Step 2: Prepare Target Database](#step-2-prepare-target-database)
  - [Step 3: Import Data](#step-3-import-data)
  - [Step 4: Run Migration Scripts](#step-4-run-migration-scripts)
  - [Step 5: Migrate Uploaded Files](#step-5-migrate-uploaded-files)
- [Migration Scripts Reference](#migration-scripts-reference)
- [Verification](#verification)
- [Rollback](#rollback)
- [Troubleshooting](#troubleshooting)

---

## Overview

The migration process involves:

1. **Data Export**: Exporting the `sichtungen` table from the source database
2. **Schema Setup**: Creating the new schema with PostGIS extensions
3. **Data Import**: Importing the exported data
4. **Post-Migration Scripts**: Running scripts to:
   - Generate reference IDs for all sightings
   - Migrate old file uploads to the new structure
   - Update field mappings

---

## Prerequisites

### Source System
- Access to the source PostgreSQL database
- `pg_dump` utility installed
- Read permissions on the `sichtungen` table

### Target System
- PostgreSQL 14+ with PostGIS extension
- Node.js 20+ (for running migration scripts)
- Sufficient disk space for data and uploads
- Database credentials with write access

### Environment Setup
```bash
# Clone the repository (if not already done)
git clone https://github.com/jansinger/ostsee-sichtung.git
cd ostsee-sichtung

# Install dependencies
npm install

# Configure environment
cp .env.docker .env
# Edit .env with your TARGET database credentials
```

---

## Migration Steps

### Step 1: Export from Source Database

**Export the sichtungen table from the source database:**

```bash
# Export data only (recommended for cross-version migrations)
pg_dump -h SOURCE_HOST -U SOURCE_USER -d SOURCE_DB \
  --data-only \
  --table=sichtungen \
  --file=sichtungen_data_export.sql

# Or export with schema (if schemas are compatible)
pg_dump -h SOURCE_HOST -U SOURCE_USER -d SOURCE_DB \
  --table=sichtungen \
  --file=sichtungen_full_export.sql
```

**Export uploaded files:**

```bash
# Copy the uploads directory from the source server
scp -r user@source-server:/path/to/uploads ./uploads_backup

# Or use rsync for large directories
rsync -avz --progress user@source-server:/path/to/uploads/ ./uploads_backup/
```

### Step 2: Prepare Target Database

**Option A: Using Docker Compose (Development/Testing)**

```bash
# Start the included PostgreSQL container
docker compose -f docker-compose.production.yml up -d db

# Wait for database to be ready
docker compose -f docker-compose.production.yml exec db pg_isready -U postgres
```

**Option B: External PostgreSQL (Production - Recommended)**

```bash
# Connect to your external PostgreSQL instance
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d postgres

# Create the database
CREATE DATABASE ostsee;

# Connect to the new database
\c ostsee

# Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Create application user (optional but recommended)
CREATE USER ostsee_app WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE ostsee TO ostsee_app;
```

**Push the schema to the target database:**

```bash
# Ensure .env points to the TARGET database
npm run db:push
```

### Step 3: Import Data

**Import the exported data:**

```bash
# For data-only export
psql -h TARGET_HOST -U TARGET_USER -d ostsee < sichtungen_data_export.sql

# Or using Docker Compose
docker compose -f docker-compose.production.yml exec -T db \
  psql -U postgres -d ostsee < sichtungen_data_export.sql
```

**Verify the import:**

```sql
-- Check record count
SELECT COUNT(*) FROM sichtungen;

-- Check sample data
SELECT id, datum, uhrzeit, tierart FROM sichtungen LIMIT 10;
```

### Step 4: Run Migration Scripts

**Important:** These scripts must be run in the correct order!

#### 4.1 Reset Upload Flags (if needed)

If the source database has inconsistent upload flags:

```sql
-- Reset aufnahmeHochladen flag for records without actual uploads
UPDATE sichtungen
SET "aufnahmeHochladen" = 0
WHERE aufnahme IS NULL OR aufnahme = '';
```

#### 4.2 Generate Reference IDs

Every sighting needs a unique reference ID (CUID2) for the new URL structure:

```bash
# Run the reference ID generator
npx tsx --env-file=.env src/tools/generate-reference-ids.ts
```

**What this script does:**
- Finds all sightings without a `referenceId`
- Checks if associated files already have a reference ID (reuses if found)
- Generates new CUID2 IDs for remaining sightings
- Updates the `sichtungen.referenz_id` column

**Expected output:**
```
🔄 Starting reference ID generation...

📊 Found 1234 sightings without reference IDs
🆕 Sighting 1: Generated new reference ID: clx1abc2def3
🆕 Sighting 2: Generated new reference ID: clx4ghi5jkl6
...
✅ Reference ID generation completed!
📊 Statistics:
   - Total sightings updated: 1234
   - Reference IDs reused from files: 0
   - New reference IDs generated: 1234
✅ All sightings now have reference IDs!
```

#### 4.3 Migrate Old Uploads

Migrate uploaded files from the old structure to the new reference-ID-based structure:

```bash
# First, place old uploads in the correct location
mkdir -p uploads/_old_uploads
cp -r ./uploads_backup/* uploads/_old_uploads/

# Run the upload migration script
npx tsx --env-file=.env src/tools/migrate-old-uploads.ts
```

**What this script does:**
- Reads all sightings with `aufnahme` field populated
- Sets `aufnahmeHochladen = 1` for records with uploads
- Creates entries in the new `sichtungen_dateien` table
- Extracts EXIF metadata from images (GPS, camera info, etc.)
- Copies files to new location: `uploads/{referenz_id}/{filename}`
- Preserves original files in `_old_uploads` for safety

**Expected output:**
```
[INFO] Starting migration of old uploads...
[INFO] Fetching sightings with uploads...
[INFO] Found 456 sightings with uploads
[INFO] Processing sighting ID 1: photo1.jpg
[INFO] Extracting EXIF data from photo1.jpg...
[SUCCESS] EXIF data extracted: GPS=true, Camera=true
[SUCCESS] Copied file: photo1.jpg for sighting 1 (with EXIF)
...
==================================================
[SUCCESS] Migration completed!
[INFO] Successfully processed: 456 sightings
[INFO] Original files preserved in _old_uploads directory: 456 files
```

### Step 5: Migrate Uploaded Files

**Verify file migration:**

```bash
# Check new upload structure
ls -la uploads/

# Should show directories named with reference IDs:
# drwxr-xr-x  clx1abc2def3/
# drwxr-xr-x  clx4ghi5jkl6/
# drwxr-xr-x  _old_uploads/   (preserved originals)

# Verify file count
find uploads -type f -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | wc -l
```

**Clean up (only after verification!):**

```bash
# After confirming migration success, you can remove old uploads
# CAUTION: Only do this after thorough verification!
rm -rf uploads/_old_uploads
```

---

## Migration Scripts Reference

| Script | Purpose | Command |
|--------|---------|---------|
| `generate-reference-ids.ts` | Generate CUID2 reference IDs for all sightings | `npx tsx --env-file=.env src/tools/generate-reference-ids.ts` |
| `migrate-old-uploads.ts` | Migrate files and create `sichtungen_dateien` entries | `npx tsx --env-file=.env src/tools/migrate-old-uploads.ts` |

---

## Verification

### Database Verification

```sql
-- Check all sightings have reference IDs
SELECT COUNT(*) AS missing_ref_ids
FROM sichtungen
WHERE referenz_id IS NULL;
-- Should return 0

-- Check file migration
SELECT COUNT(*) AS migrated_files FROM sichtungen_dateien;

-- Verify file-sighting associations
SELECT s.id, s.referenz_id, COUNT(f.id) AS file_count
FROM sichtungen s
LEFT JOIN sichtungen_dateien f ON s.id = f.sichtung_id
GROUP BY s.id, s.referenz_id
HAVING COUNT(f.id) > 0
LIMIT 10;

-- Check EXIF data extraction
SELECT id, original_name,
       exif_data->>'latitude' AS lat,
       exif_data->>'longitude' AS lng,
       exif_data->>'make' AS camera_make
FROM sichtungen_dateien
WHERE exif_data IS NOT NULL
LIMIT 10;
```

### Application Verification

```bash
# Start the application
npm run dev

# Or with Docker
docker compose -f docker-compose.production.yml up -d
```

**Manual checks:**
1. Open http://localhost:3000/map and verify sightings appear
2. Check that images load correctly for existing sightings
3. Test the admin interface at /admin
4. Verify search and filter functionality

---

## Rollback

If migration fails, you can restore from the backup:

```bash
# Stop the application
docker compose -f docker-compose.production.yml down

# Drop and recreate the database
docker compose -f docker-compose.production.yml exec db \
  psql -U postgres -c "DROP DATABASE ostsee; CREATE DATABASE ostsee;"

# Re-import original data
docker compose -f docker-compose.production.yml exec -T db \
  psql -U postgres -d ostsee < sichtungen_data_export.sql

# Restore original uploads
rm -rf uploads/*
cp -r ./uploads_backup/* uploads/
```

---

## Troubleshooting

### Common Issues

**"DATABASE_POSTGRES_URL environment variable is not set"**

Ensure your `.env` file contains the correct database URL:
```bash
DATABASE_POSTGRES_URL=postgresql://user:password@host:5432/ostsee
```

**"Old uploads directory not found"**

Create the directory and copy files:
```bash
mkdir -p uploads/_old_uploads
cp -r /path/to/old/uploads/* uploads/_old_uploads/
```

**"Permission denied" on uploads directory**

Fix permissions (Linux):
```bash
sudo chown -R 1001:1001 uploads/
# Or use your user
sudo chown -R $USER:$USER uploads/
```

**PostGIS extension missing**

Install PostGIS in the database:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

**Migration script hangs**

Check database connectivity:
```bash
# Test connection
psql $DATABASE_POSTGRES_URL -c "SELECT 1;"
```

### Getting Help

- **Issues**: https://github.com/jansinger/ostsee-sichtung/issues
- **Documentation**: https://github.com/jansinger/ostsee-sichtung/tree/main/docs

---

## Related Documentation

- [Docker Deployment Guide](./DOCKER_DEPLOYMENT.md) - Complete deployment instructions
- [Environment Variables Reference](./ENVIRONMENT.md) - All configuration options

---

*Last Updated: December 2025*
