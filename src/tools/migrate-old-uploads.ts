#!/usr/bin/env tsx
/**
 * Migration script to move old uploads from sichtungen.aufnahme to sichtung_files table
 * 
 * This script:
 * 1. Reads all rows from sichtungen where aufnahme is not null/empty
 * 2. Ensures aufnahmeHochladen is set to "1" for all found rows
 * 3. Creates new entries in sichtung_files table
 * 4. Moves files from uploads/_old_uploads/ to uploads/{referenz_id}/
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sightings, sightingFiles } from '../lib/server/db/schema';
import * as schema from '../lib/server/db/schema';
import { eq, isNotNull, ne, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import * as fs from 'fs/promises';
import * as path from 'path';
// import { fileTypeFromFile } from 'file-type';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

interface SightingWithUpload {
  id: number;
  mediaFile: string;
  mediaUpload: number;
  sightingDate: string | null;
}

async function getFileInfo(filePath: string): Promise<{ mimeType: string; size: number }> {
  try {
    const stats = await fs.stat(filePath);
    // Determine MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.pdf': 'application/pdf'
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    return { mimeType, size: stats.size };
  } catch (error) {
    log.error(`Failed to get file info: ${error}`);
    throw error;
  }
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function moveFile(sourcePath: string, targetPath: string): Promise<void> {
  try {
    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    await ensureDirectoryExists(targetDir);
    
    // Move the file
    await fs.rename(sourcePath, targetPath);
    log.success(`Moved file: ${sourcePath} -> ${targetPath}`);
  } catch (error) {
    log.error(`Failed to move file: ${error}`);
    throw error;
  }
}

async function main() {
  log.info('Starting migration of old uploads...');
  
  // Initialize database connection with environment variables
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });
  
  const baseUploadPath = path.join(process.cwd(), 'uploads');
  const oldUploadPath = path.join(baseUploadPath, '_old_uploads');
  
  try {
    // Check if old uploads directory exists
    try {
      await fs.access(oldUploadPath);
    } catch {
      log.error(`Old uploads directory not found: ${oldUploadPath}`);
      log.info('Please ensure the _old_uploads directory exists in the uploads folder');
      process.exit(1);
    }
    
    // 1. Find all sightings with aufnahme field populated
    log.info('Fetching sightings with uploads...');
    
    const sightingsWithUploads = await db
      .select({
        id: sightings.id,
        mediaFile: sightings.mediaFile,
        mediaUpload: sightings.mediaUpload,
        sightingDate: sightings.sightingDate
      })
      .from(sightings)
      .where(
        and(
          isNotNull(sightings.mediaFile),
          ne(sightings.mediaFile, '')
        )
      ) as SightingWithUpload[];
    
    log.info(`Found ${sightingsWithUploads.length} sightings with uploads`);
    
    if (sightingsWithUploads.length === 0) {
      log.info('No sightings with uploads found. Migration complete.');
      return;
    }
    
    // Process each sighting
    let successCount = 0;
    let errorCount = 0;
    
    for (const sighting of sightingsWithUploads) {
      try {
        log.info(`Processing sighting ID ${sighting.id}: ${sighting.mediaFile}`);
        
        // 2. Ensure mediaUpload is set to 1
        if (sighting.mediaUpload !== 1) {
          log.info(`Setting mediaUpload to 1 for sighting ${sighting.id}`);
          await db
            .update(sightings)
            .set({ mediaUpload: 1 })
            .where(eq(sightings.id, sighting.id));
        }
        
        // Parse the mediaFile field (could be multiple files separated by comma)
        const fileNames = sighting.mediaFile.split(',').map(f => f.trim()).filter(f => f);
        
        for (const fileName of fileNames) {
          try {
            // Generate new reference ID
            const referenzId = createId();
            
            // Build paths
            const sourcePath = path.join(oldUploadPath, fileName);
            const targetDir = path.join(baseUploadPath, referenzId);
            const targetPath = path.join(targetDir, fileName);
            
            // Check if source file exists
            try {
              await fs.access(sourcePath);
            } catch {
              log.warning(`Source file not found, skipping: ${sourcePath}`);
              continue;
            }
            
            // Get file info
            const { mimeType, size } = await getFileInfo(sourcePath);
            
            // Move the file
            await moveFile(sourcePath, targetPath);
            
            // 3. Create entry in sichtung_files table
            const uploadDate = sighting.sightingDate || new Date().toISOString();
            
            await db.insert(sightingFiles).values({
              sightingId: sighting.id,
              referenceId: referenzId,
              originalName: fileName,
              fileName: fileName,
              filePath: `${referenzId}/${fileName}`,
              mimeType: mimeType,
              size: size,
              uploadedAt: uploadDate,
              createdAt: uploadDate
            });
            
            log.success(`Migrated file: ${fileName} for sighting ${sighting.id}`);
            
          } catch (fileError) {
            log.error(`Failed to process file ${fileName}: ${fileError}`);
            errorCount++;
          }
        }
        
        successCount++;
        
      } catch (error) {
        log.error(`Failed to process sighting ${sighting.id}: ${error}`);
        errorCount++;
      }
    }
    
    // Summary
    log.info('='.repeat(50));
    log.success(`Migration completed!`);
    log.info(`Successfully processed: ${successCount} sightings`);
    if (errorCount > 0) {
      log.warning(`Errors encountered: ${errorCount}`);
    }
    
    // Optional: Check if _old_uploads directory is now empty
    const remainingFiles = await fs.readdir(oldUploadPath);
    if (remainingFiles.length === 0) {
      log.info('All files migrated. You can now safely remove the _old_uploads directory.');
    } else {
      log.warning(`${remainingFiles.length} files remain in _old_uploads directory`);
      log.info('These files may not be referenced in the database:');
      remainingFiles.slice(0, 10).forEach(file => {
        log.info(`  - ${file}`);
      });
      if (remainingFiles.length > 10) {
        log.info(`  ... and ${remainingFiles.length - 10} more`);
      }
    }
    
  } catch (error) {
    log.error(`Migration failed: ${error}`);
    process.exit(1);
  } finally {
    // Close database connection
    await client.end();
    process.exit(0);
  }
}

// Run the migration
main().catch(error => {
  log.error(`Unhandled error: ${error}`);
  process.exit(1);
});