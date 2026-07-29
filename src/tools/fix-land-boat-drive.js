#!/usr/bin/env node

/**
 * @fileoverview Korrigiert den Bootsantrieb bei Land-Sichtungen.
 *
 * Die Spalte `bootsantrieb` ist `integer default(0) notNull`, und `0` bedeutet
 * "Sonstiger Bootsantrieb" — nicht "unbekannt" und nicht "kein Boot". Jede
 * Sichtung von Land (`vonwo = 3`) trug dadurch die aktive Behauptung, es habe
 * ein Boot mit ungewöhnlichem Antrieb gegeben.
 *
 * Messung vom 2026-07-29 (lokale Dev-DB, 19.880 Zeilen):
 *   - 5.858 Zeilen mit `vonwo = 3 AND bootsantrieb = 0` (29,5 %)
 *   - "Sonstiger" war dadurch mit 8.063 Zeilen fälschlich die häufigste
 *     Antriebsart, vor Motor (5.500) und Segel (5.415). Ohne die Land-Zeilen
 *     fällt sie auf 2.205 und Rang 3 zurück.
 *
 * Dieses Script setzt diese Zeilen auf `bootsantrieb = 5` ("Kein Boot",
 * BoatDriveEnum.NONE). Der Freitext `bootsantrieb_text` bleibt unangetastet —
 * bei den 71 betroffenen Zeilen mit Text steht dort ohnehin meist "kein Boot",
 * "zu Fuß" oder "von Land".
 *
 * Bewusst KEINE drizzle-Migration: Der Eingriff soll nicht automatisch beim
 * Container-Start in einer deployten Umgebung laufen, sondern explizit
 * aufgerufen werden.
 *
 * Idempotent: Ein zweiter Lauf findet keine Zeilen mehr.
 *
 * Verwendung:
 *   npm run db:fix-land-boat-drive:dry-run   # nur zählen, nichts schreiben
 *   npm run db:fix-land-boat-drive           # schreiben
 *
 * Parameter:
 *   --dry-run    Simulation ohne Schreibzugriff
 *   --verbose    Zeigt zusätzlich die betroffenen Zeilen mit Freitext
 */

import { config } from 'dotenv';
import postgres from 'postgres';

config();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

/** `SightingFromEnum.LAND` — Sichtung erfolgte von Land */
const SIGHTING_FROM_LAND = 3;
/** `BoatDriveEnum.OTHER` — "Sonstiger Bootsantrieb" (zugleich Spalten-Default) */
const BOAT_DRIVE_OTHER = 0;
/** `BoatDriveEnum.NONE` — "Kein Boot" */
const BOAT_DRIVE_NONE = 5;

// Kein stiller Fallback auf eine Default-URL: Das Skript schreibt auf ~30 %
// der Zeilen. Fehlt die Variable, ist ein Abbruch sicherer als ein UPDATE auf
// einer Datenbank, die der Aufrufer nicht bewusst gewählt hat (dasselbe Muster
// wie in migrate-timestamps-to-utc.js).
const connectionString = process.env.DATABASE_POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
	console.error(
		'❌ DATABASE_POSTGRES_URL (oder DATABASE_URL) ist nicht gesetzt — Abbruch statt Schreiben auf eine geratene Datenbank.'
	);
	process.exit(1);
}

const sql = postgres(connectionString);

console.log(`🔗 Using database: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);

async function fixLandBoatDrive() {
	console.log('🔧 Bootsantrieb bei Land-Sichtungen korrigieren');
	console.log(`Mode: ${isDryRun ? 'DRY RUN (keine Änderungen)' : 'LIVE UPDATE'}`);
	console.log('─'.repeat(60));

	try {
		const [before] = await sql`
			SELECT
				count(*) FILTER (
					WHERE vonwo = ${SIGHTING_FROM_LAND} AND bootsantrieb = ${BOAT_DRIVE_OTHER}
				)::int AS zu_korrigieren,
				count(*) FILTER (WHERE bootsantrieb = ${BOAT_DRIVE_NONE})::int AS bereits_none,
				count(*) FILTER (
					WHERE bootsantrieb = ${BOAT_DRIVE_OTHER} AND vonwo <> ${SIGHTING_FROM_LAND}
				)::int AS echte_sonstige,
				count(*)::int AS gesamt
			FROM sichtungen`;

		console.log(`📊 Zeilen gesamt:                      ${before.gesamt}`);
		console.log(`   Land + "Sonstiger" (zu korrigieren): ${before.zu_korrigieren}`);
		console.log(`   Bereits "Kein Boot":                 ${before.bereits_none}`);
		console.log(
			`   Echte "Sonstiger" (kein Land):       ${before.echte_sonstige} — bleiben unberührt`
		);

		if (before.zu_korrigieren === 0) {
			console.log('\n✅ Nichts zu tun — keine betroffenen Zeilen.');
			return;
		}

		if (isVerbose) {
			const withText = await sql`
				SELECT id, left(btrim(bootsantrieb_text), 70) AS txt
				FROM sichtungen
				WHERE vonwo = ${SIGHTING_FROM_LAND}
				  AND bootsantrieb = ${BOAT_DRIVE_OTHER}
				  AND bootsantrieb_text IS NOT NULL
				  AND btrim(bootsantrieb_text) <> ''
				ORDER BY id DESC`;
			console.log(`\n📝 Davon mit Freitext (bleibt erhalten): ${withText.length}`);
			for (const row of withText) {
				console.log(`   ${row.id}\t${row.txt.replace(/\s+/g, ' ')}`);
			}
		}

		if (isDryRun) {
			console.log(
				`\n🔍 DRY RUN — es würden ${before.zu_korrigieren} Zeilen auf bootsantrieb = ${BOAT_DRIVE_NONE} gesetzt.`
			);
			return;
		}

		const updated = await sql`
			UPDATE sichtungen
			SET bootsantrieb = ${BOAT_DRIVE_NONE}
			WHERE vonwo = ${SIGHTING_FROM_LAND} AND bootsantrieb = ${BOAT_DRIVE_OTHER}
			RETURNING id`;

		const [after] = await sql`
			SELECT
				count(*) FILTER (
					WHERE vonwo = ${SIGHTING_FROM_LAND} AND bootsantrieb = ${BOAT_DRIVE_OTHER}
				)::int AS verbleibend,
				count(*) FILTER (WHERE bootsantrieb = ${BOAT_DRIVE_NONE})::int AS none_gesamt,
				count(*) FILTER (WHERE bootsantrieb = ${BOAT_DRIVE_OTHER})::int AS sonstige_gesamt
			FROM sichtungen`;

		console.log(`\n✅ ${updated.length} Zeilen aktualisiert.`);
		console.log(`   Verbleibend Land + "Sonstiger": ${after.verbleibend} (erwartet: 0)`);
		console.log(`   "Kein Boot" gesamt:             ${after.none_gesamt}`);
		console.log(`   "Sonstiger" gesamt:             ${after.sonstige_gesamt}`);

		if (after.verbleibend !== 0) {
			throw new Error(
				`Verifikation fehlgeschlagen: ${after.verbleibend} Zeilen tragen weiterhin Land + "Sonstiger".`
			);
		}
	} finally {
		await sql.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	fixLandBoatDrive().catch((error) => {
		console.error('❌ Fehler:', error);
		process.exit(1);
	});
}

export { fixLandBoatDrive };
