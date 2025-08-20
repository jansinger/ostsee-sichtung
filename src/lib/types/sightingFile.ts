/**
 * Type definitions for sighting files
 */

import type { sightingFiles } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import type { ExifData } from './ExifData';

export type SightingFile = InferSelectModel<typeof sightingFiles> & { exifData?: ExifData | null };
