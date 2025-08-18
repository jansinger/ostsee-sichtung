#!/usr/bin/env node

/**
 * @fileoverview Script zum Korrigieren der aufnahmeHochladen-Flags in der sichtungen-Tabelle
 *
 * Dieses Script überprüft für alle Einträge in der sichtungen-Tabelle, ob das aufnahmeHochladen-Flag
 * korrekt gesetzt ist. Es setzt das Flag auf 1, wenn Dateien in sichtungen_dateien existieren,
 * und auf 0, wenn keine Dateien vorhanden sind.
 *
 * Verwendung:
 *   node src/tools/fix-media-upload-flags.js [--dry-run] [--verbose]
 *
 * Parameter:
 *   --dry-run    Führt nur eine Simulation durch ohne Änderungen zu speichern
 *   --verbose    Gibt detaillierte Ausgaben aus
 *
 * @author Ostsee-Tiere Team
 * @since 1.9.0
 */

import { config } from 'dotenv';
import postgres from 'postgres';

// Lade Umgebungsvariablen aus .env-Datei
config();

// Kommandozeilenargumente parsen
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Datenbankverbindung - verwende DATABASE_POSTGRES_URL aus .env oder Fallback
const connectionString =
	process.env.DATABASE_POSTGRES_URL ||
	process.env.DATABASE_URL ||
	'postgresql://root:mysecretpassword@localhost:5433/local';
const sql = postgres(connectionString);

console.log(`🔗 Using database: ${connectionString.replace(/:[^:@]*@/, ':****@')}`); // Password verstecken

/**
 * Loggt Nachrichten basierend auf Verbose-Modus
 */
function log(message, forceLog = false) {
	if (isVerbose || forceLog) {
		console.log(message);
	}
}

/**
 * Hauptfunktion zum Korrigieren der Media Upload Flags
 */
async function fixMediaUploadFlags() {
	console.log('🔧 Starting Media Upload Flag Correction');
	console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE UPDATE'}`);
	console.log('─'.repeat(60));

	try {
		// 1. Alle Sichtungen mit ihren aktuellen Flag-Werten abrufen
		log('📊 Fetching all sightings...');
		const allSightings = await sql`
            SELECT 
                id,
                "aufnahmeHochladen" as current_flag,
                vorname as first_name,
                name as last_name,
                sichtungsdatum as sighting_date
            FROM sichtungen 
            ORDER BY id
        `;

		console.log(`Found ${allSightings.length} sightings to check`);

		// 2. Für jede Sichtung prüfen, ob Dateien existieren
		let correctCount = 0;
		let incorrectCount = 0;
		let updatedCount = 0;
		const updates = [];

		for (const sighting of allSightings) {
			// Anzahl der verknüpften Dateien ermitteln
			const fileCountResult = await sql`
                SELECT COUNT(*) as count 
                FROM sichtungen_dateien 
                WHERE sichtung_id = ${sighting.id}
            `;

			const fileCount = parseInt(fileCountResult[0].count);
			const hasFiles = fileCount > 0;
			const shouldBe = hasFiles ? 1 : 0;
			const isCorrect = sighting.current_flag === shouldBe;

			if (isCorrect) {
				correctCount++;
				log(`✅ ID ${sighting.id}: Flag correct (${sighting.current_flag}) - ${fileCount} files`);
			} else {
				incorrectCount++;
				const update = {
					id: sighting.id,
					currentFlag: sighting.current_flag,
					correctFlag: shouldBe,
					fileCount: fileCount,
					sightingInfo: `${sighting.first_name || ''} ${sighting.last_name || ''} (${sighting.sighting_date})`
				};
				updates.push(update);

				console.log(
					`❌ ID ${sighting.id}: Flag incorrect! Current: ${sighting.current_flag}, Should be: ${shouldBe} (${fileCount} files)`
				);
				log(`   Sighting: ${update.sightingInfo}`);
			}
		}

		// 3. Zusammenfassung anzeigen
		console.log('\n📈 Summary:');
		console.log(`Total sightings checked: ${allSightings.length}`);
		console.log(`Correct flags: ${correctCount}`);
		console.log(`Incorrect flags: ${incorrectCount}`);

		if (incorrectCount === 0) {
			console.log('🎉 All media upload flags are already correct!');
			return;
		}

		// 4. Updates durchführen (wenn nicht Dry Run)
		if (!isDryRun && updates.length > 0) {
			console.log(`\n🔄 Updating ${updates.length} incorrect flags...`);

			for (const update of updates) {
				try {
					await sql`
                        UPDATE sichtungen 
                        SET "aufnahmeHochladen" = ${update.correctFlag}
                        WHERE id = ${update.id}
                    `;

					updatedCount++;
					log(`✅ Updated ID ${update.id}: ${update.currentFlag} → ${update.correctFlag}`);
				} catch (error) {
					console.error(`❌ Failed to update ID ${update.id}:`, error.message);
				}
			}

			console.log(`\n✅ Successfully updated ${updatedCount} of ${updates.length} flags`);
		} else if (isDryRun) {
			console.log('\n🔍 DRY RUN - No changes were made');
			console.log('Remove --dry-run flag to apply these updates');
		}

		// 5. Abschließende Validierung (bei Live-Updates)
		if (!isDryRun && updatedCount > 0) {
			console.log('\n🔍 Performing validation check...');

			// Erneut prüfen, ob alle Flags jetzt korrekt sind
			let stillIncorrect = 0;
			for (const update of updates) {
				const updatedSighting = await sql`
                    SELECT "aufnahmeHochladen" as media_upload 
                    FROM sichtungen 
                    WHERE id = ${update.id}
                    LIMIT 1
                `;

				if (updatedSighting[0]?.media_upload !== update.correctFlag) {
					stillIncorrect++;
					console.log(`⚠️  ID ${update.id} still has incorrect flag`);
				}
			}

			if (stillIncorrect === 0) {
				console.log('✅ Validation passed - all flags are now correct!');
			} else {
				console.log(`⚠️  ${stillIncorrect} flags are still incorrect`);
			}
		}
	} catch (error) {
		console.error('❌ Error during flag correction:', error);
		throw error;
	}
}

/**
 * Script-Eingangspunkt
 */
async function main() {
	try {
		await fixMediaUploadFlags();
		console.log('\n🎉 Media upload flag correction completed successfully!');
	} catch (error) {
		console.error('\n💥 Script failed:', error.message);
		process.exit(1);
	} finally {
		// Datenbankverbindung schließen
		await sql.end();
	}
}

// Script ausführen, wenn direkt aufgerufen
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
