#!/usr/bin/env tsx

/**
 * Script to generate reference IDs for all sightings using CUID2
 * 
 * Logic:
 * 1. Find all sightings that don't have a referenceId yet
 * 2. For each sighting:
 *    - Check if it has files in sichtungen_dateien table with a referenceId
 *    - If yes: reuse that referenceId for the sighting
 *    - If no: generate a new CUID2 and assign it to the sighting
 * 3. Update the sighting with the determined referenceId
 * 
 * Prerequisites:
 * - DATABASE_URL environment variable must be set
 * - Database connection must be available
 * 
 * Usage: 
 *   npx tsx tools/generate-reference-ids.ts
 * 
 * Safety:
 * - Only updates sightings that don't already have a referenceId
 * - Never overwrites existing referenceIds
 * - Shows progress and statistics
 */

import { createId } from '@paralleldrive/cuid2';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, isNull } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../lib/server/db/schema.js';

const { sightings, sightingFiles } = schema;

async function generateReferenceIds() {
	// Database connection
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('DATABASE_URL environment variable is required');
		process.exit(1);
	}

	const client = postgres(databaseUrl);
	const db = drizzle(client, { schema });

	console.log('🔄 Starting reference ID generation...\n');

	try {
		// Get all sightings that don't have a referenceId yet
		const sightingsWithoutRefId = await db
			.select({ 
				id: sightings.id,
				referenceId: sightings.referenceId 
			})
			.from(sightings)
			.where(isNull(sightings.referenceId));

		console.log(`📊 Found ${sightingsWithoutRefId.length} sightings without reference IDs`);

		if (sightingsWithoutRefId.length === 0) {
			console.log('✅ All sightings already have reference IDs. Nothing to do.');
			await client.end();
			return;
		}

		let updatedCount = 0;
		let reusedCount = 0;
		let newIdCount = 0;

		// Process each sighting
		for (const sighting of sightingsWithoutRefId) {
			let referenceIdToUse: string | null = null;

			// Check if this sighting has files with a referenceId
			const existingFile = await db
				.select({ referenceId: sightingFiles.referenceId })
				.from(sightingFiles)
				.where(eq(sightingFiles.sightingId, sighting.id))
				.limit(1);

			if (existingFile.length > 0 && existingFile[0]?.referenceId) {
				// Reuse existing referenceId from files
				referenceIdToUse = existingFile[0].referenceId;
				reusedCount++;
				console.log(`🔄 Sighting ${sighting.id}: Reusing existing reference ID: ${referenceIdToUse}`);
			} else {
				// Generate new CUID2
				referenceIdToUse = createId();
				newIdCount++;
				console.log(`🆕 Sighting ${sighting.id}: Generated new reference ID: ${referenceIdToUse}`);
			}

			// Update the sighting with the reference ID
			await db
				.update(sightings)
				.set({ referenceId: referenceIdToUse })
				.where(eq(sightings.id, sighting.id));

			updatedCount++;

			// Progress indicator every 50 updates
			if (updatedCount % 50 === 0) {
				console.log(`📈 Progress: ${updatedCount}/${sightingsWithoutRefId.length} sightings updated`);
			}
		}

		console.log('\n✅ Reference ID generation completed!');
		console.log(`📊 Statistics:`);
		console.log(`   - Total sightings updated: ${updatedCount}`);
		console.log(`   - Reference IDs reused from files: ${reusedCount}`);
		console.log(`   - New reference IDs generated: ${newIdCount}`);

		// Verify the results
		const remainingSightingsWithoutRefId = await db
			.select({ id: sightings.id })
			.from(sightings)
			.where(isNull(sightings.referenceId));

		if (remainingSightingsWithoutRefId.length === 0) {
			console.log('✅ All sightings now have reference IDs!');
		} else {
			console.log(`⚠️  Warning: ${remainingSightingsWithoutRefId.length} sightings still don't have reference IDs`);
		}

	} catch (error) {
		console.error('❌ Error during reference ID generation:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run the script
generateReferenceIds().catch((error) => {
	console.error('❌ Script failed:', error);
	process.exit(1);
});